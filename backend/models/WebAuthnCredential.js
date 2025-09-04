// const { Schema, model, Types } = require("mongoose");


// const cred = new Schema({
//   userId: { type: Types.ObjectId, ref: "User", index: true, required: true },
//   credentialID: { type: String, unique: true, index: true, required: true }, // base64url
//   credentialPublicKey: { type: String, required: true }, // base64url
//   counter: { type: Number, default: 0 },
//   transports: [String]
// }, { timestamps: true });


// module.exports = model("WebAuthnCredential", cred);



const mongoose = require('mongoose');



const CredentialSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  credentialID: Buffer,
  credentialPublicKey: Buffer,
  counter: Number,
  transports: [String],
});


module.exports = mongoose.model('Credentials', CredentialSchema);




