const express = require("express");
const { authLimiter } = require("../middleware/limit");
const {
  webauthnRegisterOptions,
  webauthnRegisterVerify,
  webauthnAuthOptions,
  webauthnAuthVerify,
} = require("../controllers/webauthn.controller");

const router = express.Router();

router.post("/register/options", authLimiter, webauthnRegisterOptions);
router.post("/register/verify", authLimiter, webauthnRegisterVerify);
router.post("/auth/options", authLimiter, webauthnAuthOptions);
router.post("/auth/verify", authLimiter, webauthnAuthVerify);

module.exports = router;
