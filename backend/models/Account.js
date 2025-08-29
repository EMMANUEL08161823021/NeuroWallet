// models/Account.js
const { Schema, model, Types } = require("mongoose");

const accountSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    number: {
      type: String,
      required: true,
      unique: true,       // each account number must be unique
      index: true,
      trim: true,
    },
    currency: {
      type: String,
      default: "NGN",
      uppercase: true,
      trim: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,             // prevent negative balances (adjust if overdrafts allowed)
    },
    // Optional: e.g., "SAVINGS" | "CURRENT" | "WALLET"
    type: {
      type: String,
      default: "WALLET",
      uppercase: true,
      trim: true,
    },
    // Optional: friendly name shown in UI
    label: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

// Helpful compound index for fast user listings
accountSchema.index({ userId: 1, createdAt: -1 });

module.exports = model("Account", accountSchema);
