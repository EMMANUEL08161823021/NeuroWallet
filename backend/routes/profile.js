const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profile.controller");
const { requireAuth } = require("../middleware/auth");


// inside routes/profile.js
router.post("/complete-profile", requireAuth, profileController.completeProfile);


module.exports = router;
