const express = require("express");
const base64url = require("base64url");
const {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");

const User = require("../models/NewUser");
const Credential = require("../models/Credential");

const router = express.Router();

// Utility: auto-detect RP settings
const getRpConfig = (req) => {
  let origin, rpID;

  if (process.env.NODE_ENV === "production") {
    origin = "https://neuro-wallet.vercel.app";
    rpID = "neuro-wallet.vercel.app";
  } else {
    origin = "http://localhost:5173"; // frontend dev server
    rpID = "localhost";
  }

  return { origin, rpID };
};

// -------------------- Registration --------------------
router.post("/generate-registration-options", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, hasPasskey: false });
      await user.save();
    }

    const { rpID } = getRpConfig(req);

    const options = await generateRegistrationOptions({
      rpName: "NeuroWallet",
      rpID,
      userName: user.email,
      userID: Buffer.from(user._id.toString()),
      attestationType: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform", // ✅ built-in biometrics
        residentKey: "preferred",
        userVerification: "required",
      },
    });

    user.currentChallenge = options.challenge;
    await user.save();

    res.json(options);
  } catch (err) {
    console.error("❌ Error in /generate-registration-options:", err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------- Verify Registration --------------------
router.post("/verify-registration", async (req, res) => {
  try {
    const { email, attestationResponse } = req.body;
    if (!email || !attestationResponse) {
      return res.status(400).json({ error: "Missing email or attestation response" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const { origin, rpID } = getRpConfig(req);

    const verification = await verifyRegistrationResponse({
      response: attestationResponse,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo;

      const credentialID = base64url.encode(credential.id);
      const credentialPublicKey = Buffer.from(credential.publicKey).toString("base64");

      await Credential.create({
        userId: user._id,
        credentialID,
        credentialPublicKey,
        counter: credential.counter || 0,
      });

      console.log("✅ Registration stored in DB:", {
        credentialID,
        credentialIDLength: credential.id.length,
        credentialPublicKeyLength: credentialPublicKey.length,
      });

      user.hasPasskey = true;
      user.currentChallenge = undefined;
      await user.save();

      return res.json({ success: true, credentialID });
    }

    return res.status(400).json({ error: "Registration verification failed" });
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

    const creds = await Credential.find({ userId: user._id });

    const allowCredentials = creds.map((cred) => ({
      id: cred.credentialID, // already base64url
      type: "public-key",
      transports: cred.transports?.length > 0 ? cred.transports : ["internal"],
    }));

    const options = await generateAuthenticationOptions({
      rpID: "localhost",
      timeout: 60000,
      userVerification: "required",
      allowCredentials,
    });

    console.log("options:", options);
    

    console.log("✅ Authentication options generated:");
    console.log({
      challenge: options.challenge,
      rpID: options.rpId,
      allowCredentials: allowCredentials,
    });

    user.currentChallenge = options.challenge;
    await user.save();

    res.json(options);
  } catch (err) {
    console.error("❌ Error in /generate-authentication-options:", err);
    res.status(500).json({ error: err.message });
  }
});


// -------------------- Verify Authentication --------------------
// -------------------- Verify Authentication --------------------
router.post("/verify-authentication", async (req, res) => {
  try {
    const { email, assertionResponse, redirect = "/dashboard" } = req.body;
    if (!email || !assertionResponse) {
      return res.status(400).json({ error: "Missing email or assertion response" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const creds = await Credential.find({ userId: user._id });
    if (!creds?.length) return res.status(404).json({ error: "No credentials found" });

    const dbAuthenticator = creds[0]; // pick first for demo
    const { origin, rpID } = getRpConfig(req);

    console.log("Auth debug:", {
      email,
      userId: user._id.toString(),
      dbCredentialID: dbAuthenticator.credentialID,
      expectedOrigin: origin,
      expectedRPID: rpID,
      currentChallenge: user.currentChallenge,
    });

    const verification = await verifyAuthenticationResponse({
      response: assertionResponse,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: base64url.toBuffer(dbAuthenticator.credentialID),
        credentialPublicKey: Buffer.from(dbAuthenticator.credentialPublicKey, "base64"),
        counter: dbAuthenticator.counter,
      },
    });

    console.log("Verification result:", verification);

    if (!verification.verified) {
      return res.status(400).json({ verified: false, error: "Authentication failed" });
    }

    if (verification.authenticationInfo?.newCounter !== undefined) {
      dbAuthenticator.counter = verification.authenticationInfo.newCounter;
      await dbAuthenticator.save();
    }

    user.currentChallenge = undefined;
    await user.save();

    let nextPath = redirect;
    if (!user.name || !user.phone) nextPath = "/complete-profile";

    res.json({ verified: true, nextPath });
  } catch (err) {
    console.error("❌ Error in /verify-authentication:", err);
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
