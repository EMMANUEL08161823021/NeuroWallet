// controllers/webauthn.controller.js
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");
const base64url = require("base64url");
const WebAuthnCredential = require("../models/WebAuthnCredential");
const User = require("../models/User");
const { signAccess } = require("../utils/jwt");

const rpID = process.env.RP_ID;
const rpName = process.env.RP_NAME || "NeuroWallet";
const APP_URL = process.env.APP_URL;

const regChallenges = new Map();   // userId -> challenge
const authChallenges = new Map();  // email  -> challenge

// POST /api/webauthn/register/options
async function webauthnRegisterOptions(req, res, next) {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const existingCreds = await WebAuthnCredential.find({ userId: user.id });
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: user.id,
      userName: user.email,
      timeout: 60000,
      attestationType: "none",
      excludeCredentials: existingCreds.map((c) => ({
        id: base64url.toBuffer(c.credentialID),
        type: "public-key",
      })),
      authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
    });

    regChallenges.set(user.id, options.challenge);
    res.json(options);
  } catch (e) { next(e); }
}

// POST /api/webauthn/register/verify
async function webauthnRegisterVerify(req, res, next) {
  try {
    const { userId, attestationResponse } = req.body;
    const expectedChallenge = regChallenges.get(userId);
    if (!expectedChallenge) return res.status(400).json({ error: "No challenge" });

    const verification = await verifyRegistrationResponse({
      response: attestationResponse,
      expectedChallenge,
      expectedRPID: rpID,
      expectedOrigin: APP_URL,
      requireUserVerification: true,
    });

    if (!verification.verified) return res.status(400).json({ error: "Verification failed" });

    const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;
    await WebAuthnCredential.create({
      userId,
      credentialID: base64url.encode(credentialID),
      credentialPublicKey: base64url.encode(credentialPublicKey),
      counter,
      transports: attestationResponse?.response?.transports || [],
    });
    await User.findByIdAndUpdate(userId, { hasPasskey: true });

    regChallenges.delete(userId);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

// POST /api/webauthn/auth/options
async function webauthnAuthOptions(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    const creds = user ? await WebAuthnCredential.find({ userId: user.id }) : [];

    const options = await generateAuthenticationOptions({
      timeout: 60000,
      rpID,
      userVerification: "required",
      allowCredentials: creds.map((c) => ({
        id: base64url.toBuffer(c.credentialID),
        type: "public-key",
        transports: c.transports || ["internal", "usb", "nfc", "ble"],
      })),
    });

    authChallenges.set(email, options.challenge);
    res.json(options);
  } catch (e) { next(e); }
}

// POST /api/webauthn/auth/verify
async function webauthnAuthVerify(req, res, next) {
  try {
    const { email, assertionResponse } = req.body;
    const expectedChallenge = authChallenges.get(email);
    if (!expectedChallenge) return res.status(400).json({ error: "No challenge" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid" });

    const dbCred = await WebAuthnCredential.findOne({ credentialID: assertionResponse.id });
    if (!dbCred) return res.status(400).json({ error: "Unknown credential" });

    const verification = await verifyAuthenticationResponse({
      response: assertionResponse,
      expectedChallenge,
      expectedRPID: rpID,
      expectedOrigin: APP_URL,
      authenticator: {
        credentialID: Buffer.from(base64url.toBuffer(dbCred.credentialID)),
        credentialPublicKey: Buffer.from(base64url.toBuffer(dbCred.credentialPublicKey)),
        counter: dbCred.counter,
        transports: dbCred.transports || [],
      },
      requireUserVerification: true,
    });

    if (!verification.verified) return res.status(401).json({ error: "Auth failed" });

    dbCred.counter = verification.authenticationInfo.newCounter;
    await dbCred.save();

    user.recentAuthAt = new Date();
    await user.save();

    const token = require("../utils/jwt").signAccess({
      sub: user.id,
      email: user.email,
      recentAuthAt: user.recentAuthAt,
    });

    authChallenges.delete(email);
    res.json({ ok: true, token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) { next(e); }
}

module.exports = {
  webauthnRegisterOptions,
  webauthnRegisterVerify,
  webauthnAuthOptions,
  webauthnAuthVerify,
};
