const dotenv = require('dotenv');
dotenv.config();


const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const session = require("express-session");

const app = express();

// CORS must allow the frontend port (5173)
app.use(cors({
  origin: "http://localhost:5173/login",
  credentials: true,
}));

// Parse JSON request bodies
app.use(express.json());

// Session middleware must come before routes
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
}));

// Import and use your auth router
const authRouter = require("./routes/auth");
app.use("/api/auth", authRouter);

// MongoDB Connection

// Database Connection
mongoose.connect(process.env.MONGO_URI, {
  dbName: 'NeuroWallet',
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// Start Server
const PORT = process.env.PORT || 9000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
