const express = require("express");
const { completeProfile } = require("../controllers/profile.controller");
const {requireAuth} = require("../middleware/auth");

const router = express.Router();

router.post("/complete-profile", requireAuth, completeProfile);

module.exports = router;
