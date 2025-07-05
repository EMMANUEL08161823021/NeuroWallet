require('dotenv').config();
const mongoose = require('mongoose');

console.log('MONGO_URI:', process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI, {
  dbName: 'NeuroWallet',
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ Connected to MongoDB');
    process.exit();
  })
  .catch(err => {
    console.error('❌ Connection error:', err);
    process.exit(1);
  });
