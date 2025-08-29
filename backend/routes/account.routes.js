const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { listAccounts, getAccount, listTransactions } = require("../controllers/account.controller");

const router = express.Router();
router.use(requireAuth);

router.get("/", listAccounts);
router.get("/:id", getAccount);
router.get("/:id/transactions", listTransactions);

module.exports = router;
