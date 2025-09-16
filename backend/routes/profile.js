const express = require("express");
const { completeProfile } = require("../controllers/profile.controller");
const { signAccess } = require("../utils/jwt");

const router = express.Router();

router.post("/complete-profile", signAccess, completeProfile);

module.exports = router;
