const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profile.controller");
const { requireAuth } = require("../middleware/auth");


// inside routes/profile.js
router.post("/complete-profile", profileController.completeProfile);


router.get("/lookup", requireAuth, profileController.checkUser);


module.exports = router;
