const mongoose = require('mongoose');



const CredentialSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  credentialID: { type: String, required: true, unique: true }, // base64url string
  credentialPublicKey: { type: String, required: true },        // base64 string
  counter: { type: Number, required: true, default: 0 },
  transports: {
    type: [String], // ["usb", "ble", "nfc", "internal"]
    default: [],
  },
});


module.exports = mongoose.model('Credentials', CredentialSchema);
