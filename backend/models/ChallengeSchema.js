const ChallengeSchema = new mongoose.Schema({
  email: { type: String, required: true },
  challenge: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 }, // auto-delete after 5 mins
});

module.exports = mongoose.model("Challenge", ChallengeSchema);
