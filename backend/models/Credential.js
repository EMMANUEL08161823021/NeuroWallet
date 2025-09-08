const mongoose = require('mongoose');



const CredentialSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  credentialID: { type: String, required: true, unique: true }, // base64url string
  credentialPublicKey: { type: String, required: true },        // base64 string
  counter: { type: Number, default: 0 },
});


module.exports = mongoose.model('Credentials', CredentialSchema);
