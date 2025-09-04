const express = require("express");
// const { requireAuth } = require("../middleware/auth");
const { listAccounts, getAccount, listTransactions, createAccount } = require("../controllers/account.controller");

const router = express.Router();
// router.use(requireAuth);

router.get("/create", createAccount);
router.get("/", listAccounts);
router.get("/:id", getAccount);
router.get("/:id/transactions", listTransactions);

module.exports = router;
