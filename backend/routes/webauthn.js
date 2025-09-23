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

const jwt = require("jsonwebtoken");

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

// function b64UrlToBuf(b64urlString) {
//   // decode base64url to Node Buffer
//   return Buffer.from(base64url.toBuffer(b64urlString));
// }


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
      rpID: "neuro-wallet.vercel.app",
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
      rpID: "neuro-wallet.vercel.app", // ⚠️ replace with your real domain in production
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

    // Step 1: Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Step 2: Find credential
    const dbCred = await Credential.findOne({ userId: user._id });
    if (!dbCred || !dbCred.credentialPublicKey) {
      return res.status(404).json({ error: "No registered credential found" });
    }

    // Step 3: Convert stored values back to Buffers
    const id = dbCred.credentialID; // Keep as Base64URL string
    const publicKey = base64url.toBuffer(dbCred.credentialPublicKey);

    // Optional: check frontend rawId matches stored credentialID
    if (assertionResponse.rawId !== id) {
      return res.status(400).json({ error: "Credential ID mismatch" });
    }

    // Step 4: Verify
    const verification = await verifyAuthenticationResponse({
      response: assertionResponse,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: "https://neuro-wallet.vercel.app",
      expectedRPID: "neuro-wallet.vercel.app",
      credential: {
        id,
        publicKey,
        counter: dbCred.counter,
      },
      requireUserVerification: true,
    });

    // Step 5: Update counter
    if (verification.verified) {
      dbCred.counter = verification.authenticationInfo.newCounter;
      await dbCred.save();

      // ✅ Generate JWT
      const token = jwt.sign(
        { sub: user._id, email: email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      console.log("token:", token);
      

      return res.json({
        verified: true,
        token,       // send this token to the frontend
        nextPath: (!user.name || !user.phone) ? "/complete-profile" : "/dashboard",
      });
    } else {
      return res.status(400).json({ verified: false });
    }
  } catch (error) {
    console.error("Error verifying authentication:", error);
    res.status(500).json({ error: error.message });
  }
});



module.exports = router;
