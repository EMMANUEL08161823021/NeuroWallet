// function for creating transfers

// controllers/transfer.controller.js
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");

// POST /api/transfers
async function createTransfer(req, res, next) {
  try {
    const { fromAccountId, toAccountNumber, amount, memo } = req.body;

    const from = await Account.findOne({ _id: fromAccountId, userId: req.user.sub });
    if (!from) return res.status(404).json({ error: "Source account not found" });
    if (from.balance < amount) return res.status(400).json({ error: "Insufficient funds" });

    const to = await Account.findOne({ number: toAccountNumber });
    if (!to) return res.status(404).json({ error: "Destination account not found" });

    from.balance -= amount;
    to.balance += amount;
    const ref = `TX-${Date.now()}`;

    const session = await Account.startSession();
    await session.withTransaction(async () => {
      await from.save({ session });
      await to.save({ session });
      await Transaction.insertMany(
        [
            { accountId: from._id, type: "DEBIT",  amount, memo, counterparty: to.number,   ref },
            { accountId: to._id,   type: "CREDIT", amount, memo, counterparty: from.number, ref },
        ],
        { session, ordered: true } // <-- important
        );
    });
    session.endSession();

    const response = { ok: true, ref };
    if (res.locals.saveIdempotent) await res.locals.saveIdempotent(response);
    res.json(response);
  } catch (err) { next(err); }
}

module.exports = { createTransfer };
