import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new Schema({
  email: { type: String, unique: true, index: true, required: true },
  name: { type: String, required: true },
  passwordHash: String,              // optional if doing passwordless
  pinHash: String,                   // for PIN fallback
  hasPasskey: { type: Boolean, default: false },
  a11yPrefs: {
    highContrast: { type: Boolean, default: false },
    reduceMotion: { type: Boolean, default: false },
    textScale: { type: Number, default: 1.0 },
    preferredAuth: { type: String, default: "passkey" }, // passkey|pin|magic
  },
  // last re-auth time for step-up actions:
  recentAuthAt: Date
}, { timestamps: true });

userSchema.methods.setPassword = async function (pw) {
  this.passwordHash = await bcrypt.hash(pw, 12);
};
userSchema.methods.validatePassword = function (pw) {
  return bcrypt.compare(pw, this.passwordHash || "");
};
userSchema.methods.setPIN = async function (pin) {
  this.pinHash = await bcrypt.hash(pin, 12);
};
userSchema.methods.validatePIN = function (pin) {
  return bcrypt.compare(pin, this.pinHash || "");
};

export default model("User", userSchema);
