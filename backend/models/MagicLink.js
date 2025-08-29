// models/MagicLink.js
const { Schema, model } = require("mongoose");

const magicLinkSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
      trim: true,
    },
    tokenHash: {
      type: String,
      required: true, // we store a bcrypt hash of the token, not the raw token
    },
    clientNonce: {
      type: String, // optional: to bind link to device/browser
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Mongo will auto-purge after expiry
    },
    used: {
      type: Boolean,
      default: false,
      index: true,
    },
    requestedIp: String,
    requestedUa: String,
  },
  { timestamps: true }
);

// Prevent reusing same token more than once
magicLinkSchema.index({ email: 1, tokenHash: 1 }, { unique: true });

module.exports = model("MagicLink", magicLinkSchema);
