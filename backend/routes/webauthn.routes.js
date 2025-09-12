const express = require('express');
const router = express.Router();
const mongoose = require("mongoose");
const User = require('../models/User');
const Credential = require('../models/Credential');
const { isoUint8Array } = require("@simplewebauthn/server/helpers");

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");

const base64url = require('base64url');


// Generate Registration Options
router.post("/generate-registration-options", async (req, res) => {
  try {
    const { email } = req.body;

    console.log("Email received:", email);
    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }

    // Look up or create user
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email });
    }

    // Convert MongoDB ObjectId to a Uint8Array for WebAuthn user.id
    const userIdBytes = isoUint8Array.fromUTF8String(user._id.toString());

    const options = await generateRegistrationOptions({
      rpName: "NeuroWallet",
      rpID: "localhost",
      user: {
        id: new Uint8Array(16),            // unique user ID (not email)
        name: email,                       // email as unique machine-usable identifier
        displayName: email.split("@")[0],  // or full name if you store it
      },
      pubKeyCredParams: [
        { alg: -8, type: "public-key" },
        { alg: -7, type: "public-key" },
        { alg: -257, type: "public-key" },
      ],
      timeout: 60000,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });


    // Save challenge in session
    req.session.currentChallenge = options.challenge;

    console.log("Generated options:", options);
    res.json(options);
  } catch (err) {
    console.error("Error in /generate-registration-options:", err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------- Verify Registration --------------------
router.post("/verify-registration", async (req, res) => {
  try {
    const { email, attestationResponse } = req.body;
    if (!email || !attestationResponse) {
      return res
        .status(400)
        .json({ error: "Missing email or attestationResponse" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const expectedChallenge = req.session.currentChallenge;
    if (!expectedChallenge) {
      return res.status(400).json({ error: "No challenge found in session" });
    }

    const verification = await verifyRegistrationResponse({
      response: attestationResponse,
      expectedChallenge,
      expectedOrigin: "http://localhost:5173", // must match your frontend URL
      expectedRPID: "localhost",
    });

    console.log("Verification details:", verification);

    if (!verification.verified) {
      return res.status(400).json({ error: "Verification failed" });
    }

    const { credentialPublicKey, credentialID, counter } =
      verification.registrationInfo;

    await Credential.create({
      userId: user._id,
      credentialID: Buffer.from(credentialID).toString("base64url"),
      credentialPublicKey: Buffer.from(credentialPublicKey).toString("base64"),
      counter,
    });

    res.json({ verified: true });
  } catch (err) {
    console.error("Error in /verify-registration:", err);
    res.status(500).json({ error: err.message });
  }
});



// Generate Authentication Options
router.post("/generate-authentication-options", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userCredentials = (user.credentials || []).map(cred => ({
      id: Buffer.from(cred.credentialID, "base64url"),
      type: "public-key",
      transports: cred.transports || ["usb", "ble", "nfc", "internal"],
    }));

    const options = await generateAuthenticationOptions({
      timeout: 60000,
      allowCredentials: userCredentials,
      userVerification: "preferred",
    });

    // ✅ Save challenge to user (not session)
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

    if (!email || !assertionResponse) {
      return res.status(400).json({ error: "Missing email or assertionResponse" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const expectedChallenge = user.currentChallenge;
    if (!expectedChallenge) {
      return res.status(400).json({ error: "No challenge found for user" });
    }

    // ✅ Find credential from user model
    const dbCred = (user.credentials || []).find(
      cred => cred.credentialID === assertionResponse.rawId
    );

    if (!dbCred) {
      console.error("❌ Credential not found for user:", email);
      return res.status(400).json({ error: "Credential not found" });
    }

    const verification = await verifyAuthenticationResponse({
      response: assertionResponse,
      expectedChallenge,
      expectedOrigin: process.env.EXPECTED_ORIGIN || "http://localhost:5173",
      expectedRPID: process.env.EXPECTED_RPID || "localhost",
      authenticator: {
        credentialID: Buffer.from(dbCred.credentialID, "base64url"),
        credentialPublicKey: Buffer.from(dbCred.credentialPublicKey, "base64url"),
        counter: dbCred.counter,
      },
    });

    if (!verification.verified) {
      console.error("❌ Verification failed for:", email);
      return res.status(400).json({ error: "Verification failed" });
    }

    // ✅ Update counter to prevent replay attacks
    dbCred.counter = verification.authenticationInfo.newCounter;
    user.currentChallenge = undefined; // clear challenge after use
    await user.save();

    res.json({ verified: true });
  } catch (err) {
    console.error("❌ Error in /verify-authentication:", err);
    res.status(500).json({ error: err.message });
  }
});




module.exports = router;
