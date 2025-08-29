// models/IdempotencyKey.js
const { Schema, model } = require("mongoose");

const schema = new Schema(
  {
    key: { type: String, unique: true, index: true, required: true },
    result: { type: Schema.Types.Mixed }, // whatever JSON you returned
  },
  { timestamps: true }
);

// Auto-delete old keys after 24h
schema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

module.exports = model("IdempotencyKey", schema);
