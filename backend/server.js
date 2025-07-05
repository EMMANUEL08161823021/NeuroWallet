const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// const productRoutes = require('./routes/products');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);



// console.log(process.env.MONGO_URI);



// Database Connection
mongoose.connect("mongodb+srv://emmanueloguntol48:OwW9Nf31vOP6CTHR@e-commerce.nx5bkwj.mongodb.net", {
  dbName: 'NeuroWallet',
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
