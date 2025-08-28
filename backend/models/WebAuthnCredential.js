import { Schema, model, Types } from "mongoose";
const cred = new Schema({
  userId: { type: Types.ObjectId, ref: "User", index: true, required: true },
  credentialID: { type: String, unique: true, index: true, required: true }, // base64url
  credentialPublicKey: { type: String, required: true }, // base64url
  counter: { type: Number, default: 0 },
  transports: [String]
}, { timestamps: true });
export default model("WebAuthnCredential", cred);
