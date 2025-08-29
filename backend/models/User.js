
// models/User.js
const { Schema, model } = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, trim: true },
    pinHash: String,
    hasPasskey: { type: Boolean, default: false },
    recentAuthAt: Date,
  },
  { timestamps: true }
);

// Methods for PIN
userSchema.methods.setPIN = async function (pin) {
  this.pinHash = await bcrypt.hash(pin, 12);
};
userSchema.methods.validatePIN = async function (pin) {
  if (!this.pinHash) return false;
  return bcrypt.compare(pin, this.pinHash);
};

module.exports = model("User", userSchema);
