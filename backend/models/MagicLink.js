// models/MagicLink.js
const { Schema, model } = require("mongoose");

// models/MagicLink.js (excerpt)
const magicLinkSchema = new Schema({
  email: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  clientNonce: { type: String, default: null },
  action: { type: String, enum: ["signin", "signup"], default: "signin" },
  sendStatus: { type: String, enum: ["pending","sent","failed","skipped_no_user"], default: "pending" },
  sendError: { type: String, default: null },
  sendInfo: { type: Schema.Types.Mixed, default: null },
  requestedIp: String,
  requestedUa: String,
}, { timestamps: true });


// Prevent reusing same token more than once
magicLinkSchema.index({ email: 1, tokenHash: 1 }, { unique: true });

module.exports = model("MagicLink", magicLinkSchema);
