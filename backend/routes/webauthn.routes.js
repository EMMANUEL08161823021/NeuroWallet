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
  const { email } = req.body;

  let user = await User.findOne({ email });
  let userIDBuffer;

  if (!user) {
    const newId = new mongoose.Types.ObjectId();
    user = new User({
      _id: newId,
      email,
    });
    await user.save();

    userIDBuffer = newId.id;
  } else {
    userIDBuffer = user._id.id;
  }

  console.log("userID Buffer length:", userIDBuffer.length);
  console.log("userID Buffer hex:", userIDBuffer.toString("hex"));

  const options = generateRegistrationOptions({
    rpName: "NeuroWallet",
    rpID: "https://neuro-wallet.vercel.app/",
    userID: userIDBuffer,
    userName: email,
    userDisplayName: email,
  });

  req.session.currentChallenge = options.challenge;

  res.json(options);
});



// Verify Registration
router.post("/verify-registration", async (req, res) => {
  const { email, attestationResponse } = req.body;
  const user = await User.findOne({ email });
  const expectedChallenge = req.session.currentChallenge;

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

  await Credential.create({
    userId: user._id,
    credentialID: Buffer.from(credentialID),
    credentialPublicKey: Buffer.from(credentialPublicKey),
    counter,
  });

  res.json({ verified: true });
});

// Generate Authentication Options
router.post("/generate-authentication-options", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  const credentials = await Credential.find({ userId: user._id });

  const options = generateAuthenticationOptions({
    rpID: "localhost",
    userVerification: "preferred",
    allowCredentials: credentials.map(c => ({
      id: c.credentialID,
      type: "public-key",
    })),
  });

  req.session.currentChallenge = options.challenge;
  res.json(options);
});

// Verify Authentication
router.post("/verify-authentication", async (req, res) => {
  const { email, assertionResponse } = req.body;
  const user = await User.findOne({ email });
  const expectedChallenge = req.session.currentChallenge;

  const dbCred = await Credential.findOne({
    credentialID: Buffer.from(assertionResponse.rawId, "base64url"),
  });

  if (!dbCred) return res.status(400).json({ error: "Credential not found" });

  const verification = await verifyAuthenticationResponse({
    response: assertionResponse,
    expectedChallenge,
    expectedOrigin: "http://localhost:5173",
    expectedRPID: "localhost",
    authenticator: {
      credentialID: dbCred.credentialID,
      credentialPublicKey: dbCred.credentialPublicKey,
      counter: dbCred.counter,
    },
  });

  if (!verification.verified) {
    return res.status(400).json({ error: "Verification failed" });
  }

  dbCred.counter = verification.authenticationInfo.newCounter;
  await dbCred.save();

  res.json({ verified: true });
});

module.exports = router;
