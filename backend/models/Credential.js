const mongoose = require('mongoose');



const CredentialSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  credentialID: Buffer,
  credentialPublicKey: Buffer,
  counter: Number,
  transports: [String],
});


module.exports = mongoose.model('Credentials', CredentialSchema);
