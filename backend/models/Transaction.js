// models/Transaction.js
const { Schema, model, Types } = require("mongoose");

const transactionSchema = new Schema(
  {
    accountId: {
      type: Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["DEBIT", "CREDIT"],
      required: true,
      uppercase: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount must be >= 0"],
    },
    memo: {
      type: String,
      trim: true,
      default: "",
    },
    counterparty: {
      type: String,
      trim: true,
      default: "", // account number, name, or external ref
    },
    ref: {
      type: String,
      index: true, // transaction reference/receipt id
      required: true,
      trim: true,
    },
    // Optional: keep original currency if you later support FX
    currency: {
      type: String,
      default: "NGN",
      uppercase: true,
      trim: true,
    },
    // Optional metadata field for extensibility
    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Useful indexes
transactionSchema.index({ accountId: 1, createdAt: -1 });
transactionSchema.index({ ref: 1 }, { unique: false });

module.exports = model("Transaction", transactionSchema);
