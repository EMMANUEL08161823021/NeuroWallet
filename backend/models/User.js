// models/User.js
const { Schema, model } = require("mongoose");
const bcrypt = require("bcrypt");

const transactionSchema = new Schema({
  amount: { type: Number, required: true },
  type: { type: String, enum: ["credit", "debit"], required: true },
  ref: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phone: { type: String, trim: true },

    pinHash: String,
    hasPasskey: { type: Boolean, default: false },
    recentAuthAt: Date,

    // WebAuthn challenge
    currentChallenge: { type: String },

    // Wallet
    walletBalance: { type: Number, default: 0 },
    transactions: [transactionSchema],

    // Paystack customer info
    paystackCustomerCode: { type: String },

    // Paystack DVA info
    dva: {
      account_number: { type: String },
      bank_name: { type: String },
      account_name: { type: String },
      provider: { type: String, default: "paystack" },
    },
  },
  { timestamps: true }
);

// --- Methods for PIN ---
userSchema.methods.setPIN = async function (pin) {
  this.pinHash = await bcrypt.hash(pin, 12);
};

userSchema.methods.validatePIN = async function (pin) {
  if (!this.pinHash) return false;
  return bcrypt.compare(pin, this.pinHash);
};

// --- Wallet Helpers ---
userSchema.methods.creditWallet = async function (amount, ref) {
  this.walletBalance += amount;
  this.transactions.push({ amount, type: "credit", ref });
  await this.save();
  return this.walletBalance;
};

userSchema.methods.debitWallet = async function (amount, ref) {
  if (this.walletBalance < amount) {
    throw new Error("Insufficient balance");
  }
  this.walletBalance -= amount;
  this.transactions.push({ amount, type: "debit", ref });
  await this.save();
  return this.walletBalance;
};

module.exports = model("User", userSchema);
