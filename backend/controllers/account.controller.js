// functions for listing accounts and transactions.

// controllers/account.controller.js
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");



// POST /api/create/accounts
async function createAccount(req, res) {
  try {

    const {number, currency, balance, type, pin, label} = req.user;

    let acct = await Account.findOne({ userId: user._id });
    if (!acct) {
      acct = await Account.create({
        userId: user._id,
        number: number,
        currency: currency,
        balance: balance,
        type: type,
        label: label,
        pin: pin
      });
    }
      console.log(req.user);
    // const accounts = await Account.find({ userId: req.user.sub });
    // console.log(accounts);
    // res.json({ accounts });
  } catch (err) { 
    console.log(err);
  }
}
// GET /api/accounts
async function listAccounts(req, res) {
  try {
    console.log(req.user);
    // const accounts = await Account.find({ userId: req.user.sub });
    // console.log(accounts);
    // res.json({ accounts });
  } catch (err) { 
    console.log(err);
  }
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

module.exports = { createAccount, listAccounts, getAccount, listTransactions };
