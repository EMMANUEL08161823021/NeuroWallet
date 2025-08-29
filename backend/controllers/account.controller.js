// functions for listing accounts and transactions.

// controllers/account.controller.js
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");

// GET /api/accounts
async function listAccounts(req, res, next) {
  try {
    const accounts = await Account.find({ userId: req.user.sub });
    res.json({ accounts });
  } catch (err) { next(err); }
}

// GET /api/accounts/:id
async function getAccount(req, res, next) {
  try {
    const account = await Account.findOne({ _id: req.params.id, userId: req.user.sub });
    if (!account) return res.status(404).json({ error: "Account not found" });
    res.json({ account });
  } catch (err) { next(err); }
}

// GET /api/accounts/:id/transactions
async function listTransactions(req, res, next) {
  try {
    const txs = await Transaction.find({ accountId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ transactions: txs });
  } catch (err) { next(err); }
}

module.exports = { listAccounts, getAccount, listTransactions };
