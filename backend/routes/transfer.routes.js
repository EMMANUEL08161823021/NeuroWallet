const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { useIdempotency } = require("../middleware/idempotency");
const { createTransfer } = require("../controllers/transfer.controller");

const router = express.Router();
router.post("/", requireAuth, useIdempotency, createTransfer);

module.exports = router;
