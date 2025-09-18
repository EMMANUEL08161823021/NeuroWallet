const express = require('express');
const router = express.Router();
const User = require('../models/NewUser');
const Credential = require('../models/Credential');

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");

const base64url = require('base64url');


// -------------------- Generate Registration Options --------------------
router.post("/generate-registration-options", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const options = await generateRegistrationOptions({
      rpName: "NeuroWallet",
      rpID: "localhost",
      userName: user.email,
      userID: Buffer.from(user._id.toString()), // unique ID for WebAuthn
    });

    user.currentChallenge = options.challenge; // store challenge
    await user.save();

    res.json(options);
  } catch (err) {
    console.error("Error in /generate-registration-options:", err);
    res.status(500).json({ error: err.message });
  }
});


// -------------------- Verify Registration --------------------

router.post("/verify-registration", async (req, res) => {
  try {
    const { email, attestationResponse, redirect = "/dashboard" } = req.body;

    if (!email || !attestationResponse) {
      return res.status(400).json({ error: "Missing email or attestation response" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const expectedOrigin = "http://localhost:5173";
    const expectedRPID = "localhost";

    const verification = await verifyRegistrationResponse({
      response: attestationResponse,
      expectedChallenge: user.currentChallenge, // saved from generate-registration-options
      expectedOrigin,
      expectedRPID,
    });

    console.log("Verification result:", verification);

    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo;

      // Normalize credentialID
      const credentialID = base64url.encode(credential.id);
      const credentialPublicKey = Buffer.from(credential.publicKey).toString("base64");
      const counter = credential.counter || 0;

      // Save credential (separate collection)
      await Credential.create({
        userId: user._id,
        credentialID,
        credentialPublicKey,
        counter,
      });

      // Mark user as passkey-enabled
      user.hasPasskey = true;
      user.currentChallenge = undefined; // clear challenge

      // Decide next path based on profile completeness

      await user.save();

      return res.json({
        success: true,
        credentialID,
      });
    } else {
      return res.status(400).json({ error: "Registration verification failed" });
    }
  } catch (err) {
    console.error("❌ Error in /verify-registration:", err);
    res.status(500).json({ error: err.message });
  }
});



router.post("/generate-authentication-options", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Missing email" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const userCreds = await Credential.find({ userId: user._id });

    console.log("🔎 userCreds:", userCreds);

    const allowCredentials = userCreds
    .filter(cred => !!cred.credentialID)
    .map(cred => ({
      id: cred.credentialID, // ✅ keep as base64url string
      type: "public-key",
      transports: cred.transports && cred.transports.length > 0
        ? cred.transports
        : ["usb", "ble", "nfc", "internal"],
    }));

    const options = await generateAuthenticationOptions({
      timeout: 60000,
      userVerification: "preferred",
      allowCredentials,
    });

    user.currentChallenge = options.challenge;
    await user.save();

    res.json(options);
  } catch (err) {
    console.error("❌ Error in /generate-authentication-options:", err);
    res.status(500).json({ error: err.message });
  }
});


/**
 * Verify Authentication
 */
router.post("/verify-authentication", async (req, res) => {
  try {
    const { email, assertionResponse } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find credential used
    const matchingCred = await Credential.findOne({ userId: user._id, credentialID: assertionResponse.id });
    if (!matchingCred) {
      return res.status(404).json({ error: "Credential not found" });
    }

    const verification = await verifyAuthenticationResponse({
      response: assertionResponse,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: "http://localhost:5173",
      expectedRPID: "localhost",
      credential: {
        id: matchingCred.credentialID,
        publicKey: Buffer.from(matchingCred.credentialPublicKey, "base64"),
        counter: matchingCred.counter || 0,
        transports: matchingCred.transports || [],
      },
    });

    if (verification.verified) {
      // ✅ Update counter with new one from authenticator
      const newCounter = verification.authenticationInfo.newCounter;
      matchingCred.counter = newCounter;
      await matchingCred.save();

      // Clear challenge
      user.currentChallenge = undefined;
      await user.save();


      let nextPath = redirect;
      if (!user.name || !user.phone) {
        nextPath = "/complete-profile";
      }

      return res.json({
        success: true,
        nextPath,
      });

    } else {
      return res.status(400).json({ success: false, verified: false });
    }
  } catch (err) {
    console.error("❌ Error in /verify-authentication:", err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
