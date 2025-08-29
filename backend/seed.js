// scripts/seed.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Account = require("./models/Account");

(async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017", { dbName: "NeuroWallet" });

  const email = "emmanueloguntolu48@gmail.com";
  let user = await User.findOne({ email });
  if (!user) {
    user = new User({ email, name: "Demo User" });
    await user.setPIN("000000"); // demo PIN
    await user.save();
  }

  let acct = await Account.findOne({ userId: user._id });
  if (!acct) {
    acct = await Account.create({
      userId: user._id,
      number: "1002003012",
      currency: "NGN",
      balance: 2500,
      type: "WALLET",
      label: "Main Wallet",
    });
  }

  console.log("Seeded:", { user: { id: user.id, email }, account: { id: acct.id, number: acct.number }});
  await mongoose.disconnect();
})();
