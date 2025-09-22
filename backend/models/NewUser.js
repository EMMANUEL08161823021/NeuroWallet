// models/User.js
const bcrypt = require("bcrypt");

const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String},
  email: { type: String, required: true, unique: true },
  phone: {type: Number},
  wallet: {
    balance: { type: Number, default: 0 },
  },
  transactions: [
    {
      type: {
        type: String,
        enum: ["fund", "transfer"],
      },
      amount: Number,
      reference: String,
      to: String,
      from: String,
      status: String,
      date: { type: Date, default: Date.now },
    },
  ],
  currentChallenge: { type: String }, // temporary challenge storage
});

// ✅ Prevent OverwriteModelError
// --- Methods for PIN ---
UserSchema.methods.setPIN = async function (pin) {
  this.pinHash = await bcrypt.hash(pin, 12);
};

UserSchema.methods.validatePIN = async function (pin) {
  if (!this.pinHash) return false;
  return bcrypt.compare(pin, this.pinHash);
};

// --- Wallet Helpers ---
UserSchema.methods.creditWallet = async function (amount, ref) {
  this.walletBalance += amount;
  this.transactions.push({ amount, type: "credit", ref });
  await this.save();
  return this.walletBalance;
};

UserSchema.methods.debitWallet = async function (amount, ref) {
  if (this.walletBalance < amount) {
    throw new Error("Insufficient balance");
  }
  this.walletBalance -= amount;
  this.transactions.push({ amount, type: "debit", ref });
  await this.save();
  return this.walletBalance;
};

module.exports =  mongoose.models.User || mongoose.model("NewUser", UserSchema);



// module.exports = model("User", userSchema);
