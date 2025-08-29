const express = require("express");
const { requestMagicLink, verifyMagicLink } = require("../controllers/magicLink.controller");
const { authLimiter } = require("../middleware/limit");

const router = express.Router();

// Request a magic link (user submits email)
router.post("/magic-link", authLimiter, requestMagicLink);

// Verify the magic link (clicked from email)
router.get("/magic/verify", verifyMagicLink);

module.exports = router;
