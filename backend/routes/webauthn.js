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

// const { bufToB64Url } = require("../../frontend/src/utils/webauthn");

const router = express.Router();


// Convert ArrayBuffer to hex string for logging
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
function bufferToHex(buffer) {
  if (!buffer) return "null";
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Base64URL helper
function bufToB64Url(buf) {
  if (!buf) return "";
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}


function b64UrlToBuf(b64url) {
  if (!b64url) return null;
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64"); // ✅ Node.js Buffer
}


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

    console.log("Received attestationResponse:", JSON.stringify(attestationResponse, null, 2));
    console.log("Raw attestationResponse.rawId (hex):", bufferToHex(b64UrlToBuf(attestationResponse.rawId)));

    // Validate attestationResponse structure
    if (!attestationResponse.rawId || !attestationResponse.response?.attestationObject) {
      return res.status(400).json({ error: "Invalid attestationResponse: missing rawId or attestationObject" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const { origin, rpID } = getRpConfig(req);
    console.log("Verification parameters:", { expectedChallenge: user.currentChallenge, expectedOrigin: origin, expectedRPID: rpID });

    const verification = await verifyRegistrationResponse({
      response: attestationResponse,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    console.log("Verification result:", JSON.stringify(verification, null, 2));
    console.log("RegistrationInfo:", JSON.stringify(verification.registrationInfo, null, 2));

    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo;

      if (!credential?.id || !credential?.publicKey) {
        throw new Error("credential.id or credential.publicKey is missing");
      }

      const credentialID = credential.id; // use directly
      const credentialPublicKey = bufToB64Url(credential.publicKey);

      await Credential.create({
        userId: user._id,
        credentialID,
        credentialPublicKey,
        counter: credential.counter || 0,
        transports: credential.transports || ["internal"],
      });

      user.hasPasskey = true;
      user.currentChallenge = undefined;
      await user.save();

      return res.json({ success: true, credentialID });
    }
    

    return res.status(400).json({ error: "Registration verification failed" });
  } catch (err) {
    console.error("❌ Error in /verify-registration:", err);
    return res.status(500).json({ error: `Registration failed: ${err.message}` });
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
      id: cred.credentialID, // ✅ base64url string (will be converted on frontend)
      type: "public-key",
      transports: cred.transports?.length > 0 ? cred.transports : ["internal"],
    }));

    const options = await generateAuthenticationOptions({
      rpID: "localhost", // ⚠️ replace with your real domain in production
      timeout: 60000,
      userVerification: "required",
      allowCredentials,
    });

    // ✅ Store base64url challenge in DB for later verification
    user.currentChallenge = options.challenge;
    await user.save();

    console.log("✅ Authentication options generated:", {
      challenge: options.challenge,
      rpID: options.rpId,
      allowCredentials,
    });

    res.json(options); // send as-is (frontend will convert challenge + id)
  } catch (err) {
    console.error("❌ Error in /generate-authentication-options:", err);
    res.status(500).json({ error: err.message });
  }
});


// -------------------- Verify Authentication --------------------
router.post("/verify-authentication", async (req, res) => {
  try {
    const { email, assertionResponse } = req.body;
    if (!email || !assertionResponse) {
      return res.status(400).json({ error: "Missing email or assertion response" });
    }

    console.log("Received assertionResponse:", JSON.stringify(assertionResponse, null, 2));
    console.log("Raw assertionResponse.id (hex):", bufferToHex(b64UrlToBuf(assertionResponse.id)));

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const credentialID = assertionResponse.id;
    const dbCred = await Credential.findOne({ credentialID });
    if (!dbCred) {
      console.error("Credential not found in DB for ID:", credentialID);
      return res.status(400).json({ error: "Credential not registered" });
    }

    console.log("dbCred:", JSON.stringify(dbCred.toObject(), null, 2));

    const { origin: expectedOrigin, rpID: expectedRPID } = getRpConfig(req);
    console.log("Verification parameters:", {
      expectedChallenge: user.currentChallenge,
      expectedOrigin,
      expectedRPID,
    });

    // ✅ Fix: Validate credential data before creating authenticator
    if (!dbCred.credentialID || !dbCred.credentialPublicKey) {
      console.error("Missing credential data:", {
        credentialID: !!dbCred.credentialID,
        credentialPublicKey: !!dbCred.credentialPublicKey,
      });
      return res.status(400).json({ error: "Invalid credential data in database" });
    }

    // Convert base64url strings to Uint8Array (not Node.js Buffer)
    const credentialIDBuffer = b64UrlToBuf(dbCred.credentialID);
    const credentialPublicKeyBuffer = b64UrlToBuf(dbCred.credentialPublicKey);

    // Validate buffers
    if (!credentialIDBuffer || !credentialPublicKeyBuffer) {
      console.error("Failed to decode credential data:", {
        credentialID: !!credentialIDBuffer,
        credentialPublicKey: !!credentialPublicKeyBuffer,
      });
      return res.status(400).json({ error: "Failed to decode credential data" });
    }

    // ✅ Fix: Convert Node.js Buffers to Uint8Array for @simplewebauthn/server
    const authenticator = {
      credentialID: new Uint8Array(credentialIDBuffer),
      credentialPublicKey: new Uint8Array(credentialPublicKeyBuffer),
      counter: Number(dbCred.counter) || 0,
      transports: Array.isArray(dbCred.transports) ? dbCred.transports : ["internal"],
    };

    console.log("Authenticator object created:", {
      credentialID: bufferToHex(authenticator.credentialID),
      credentialPublicKey: bufferToHex(authenticator.credentialPublicKey),
      counter: authenticator.counter,
      transports: authenticator.transports,
    });

    console.log("dbCred.credentialPublicKey (stored):", dbCred.credentialPublicKey);
    console.log("decoded credentialPublicKey (Buffer, hex):", credentialPublicKeyBuffer.toString("hex"));

    // ✅ Fix: Use 'authenticator' parameter instead of 'credential'
    const verification = await verifyAuthenticationResponse({
      response: assertionResponse,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: expectedOrigin,
      expectedRPID: expectedRPID,
      authenticator: authenticator, // ✅ Changed from 'credential' to 'authenticator'
    });

    console.log("Authentication verification result:", JSON.stringify(verification, null, 2));

    if (verification.verified) {
      dbCred.counter = verification.authenticationInfo?.newCounter ?? dbCred.counter;
      await dbCred.save();

      user.currentChallenge = undefined;
      await user.save();

      return res.json({ success: true });
    }

    return res.status(400).json({ error: "Authentication failed" });
  } catch (err) {
    console.error("❌ Error in /verify-authentication:", err);
    return res.status(500).json({ error: `Authentication failed: ${err.message}` });
  }
});



module.exports = router;
