const express = require('express');
const router = express.Router();
const mongoose = require("mongoose");
const User = require('../models/User');
const Credential = require('../models/Credential');

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
    console.log(req.body);

    let user = await User.findOne({ email });

    if (!user) {
      const newId = new mongoose.Types.ObjectId();
      user = new User({ _id: newId, email });
      await user.save();
    }

    // ✅ Convert MongoDB ObjectId → Buffer
    const userID = Buffer.from(user._id.toHexString(), "hex");

    const options = await generateRegistrationOptions({
      rpName: "NeuroWallet",
      rpID: "localhost", // keep domain only (no http://, no port)
      userID, // must be Buffer or Uint8Array
      userName: email,
      userDisplayName: email,
      attestationType: "none",
    });

    console.log("Generated options:", options);

    // Save challenge for later verification
    req.session.currentChallenge = options.challenge;

    res.json(options);

  } catch (err) {
    console.error("Error generating registration options:", err);
    res.status(500).json({ error: err.message });
  }
});



// Verify Registration

router.post("/verify-registration", async (req, res) => {
  try {
    const { email, attestationResponse } = req.body;
    const user = await User.findOne({ email });
    const expectedChallenge = req.session.currentChallenge;

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!expectedChallenge) {
      return res.status(400).json({ error: "No challenge found in session" });
    }

    const verification = await verifyRegistrationResponse({
      response: attestationResponse,
      expectedChallenge,
      expectedOrigin: "http://localhost:5173",
      expectedRPID: "localhost",
    });

    if (!verification.verified) {
      return res.status(400).json({ error: "Verification failed" });
    }

    const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

    // Store with userId
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
router.post('/generate-authentication-options', async (req, res) => {
  try {
    const { username } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const userCredentials = (user.credentials || []).map(cred => ({
      id: Buffer.from(cred.credentialID, 'base64url'),
      type: 'public-key',
      transports: cred.transports || ['usb', 'ble', 'nfc', 'internal'],
    }));

    const options = await generateAuthenticationOptions({
      timeout: 60000,
      allowCredentials: userCredentials,
      userVerification: 'preferred',
    });

    user.currentChallenge = options.challenge;
    await user.save();

    res.json(options);
  } catch (err) {
    console.error('Error in /generate-authentication-options:', err);
    res.status(500).json({ error: err.message });
  }
});



// Verify Authentication
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

    const expectedChallenge = req.session.currentChallenge;
    if (!expectedChallenge) {
      return res.status(400).json({ error: "No challenge found in session" });
    }

    // Lookup credential for this specific user
    const dbCred = await Credential.findOne({
      userId: user._id,
      credentialID: assertionResponse.rawId, // rawId is already base64url
    });

    if (!dbCred) {
      console.error("❌ Credential not found for user:", email);
      return res.status(400).json({ error: "Credential not found" });
    }

    const verification = await verifyAuthenticationResponse({
      response: assertionResponse,
      expectedChallenge,
      expectedOrigin: "http://localhost:5173",
      expectedRPID: "localhost",
      authenticator: {
        credentialID: Buffer.from(dbCred.credentialID, "base64url"),
        credentialPublicKey: Buffer.from(dbCred.credentialPublicKey, "base64"),
        counter: dbCred.counter,
      },
    });

    if (!verification.verified) {
      console.error("❌ Verification failed for:", email);
      return res.status(400).json({ error: "Verification failed" });
    }

    // Update counter to prevent replay attacks
    dbCred.counter = verification.authenticationInfo.newCounter;
    await dbCred.save();

    res.json({ verified: true });
  } catch (err) {
    console.error("Error in /verify-authentication:", err);
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
