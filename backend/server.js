// index.js (or src/index.js)

const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
// const session = require("express-session"); // OPTIONAL: only if you need server sessions

const { errors: celebrateErrors } = require("celebrate");
const { notFound, errorHandler } = require("./middleware/error");

// Routes
const webauthnRoutes = require("./routes/webauthn.routes");
const pinRoutes = require("./routes/pin.routes");
const accountRoutes = require("./routes/account.routes");
const transferRoutes = require("./routes/transfer.routes");
const magicLinkRoutes = require("./routes/magic.routes");
const authRouter = require("./routes/auth"); // your existing auth router

const app = express();

// --- Security & basics ---
app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    // Must be ORIGIN only (no path)
    origin: ["http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Requested-With"],
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// --- OPTIONAL: only if you truly need server-side sessions (not required for JWT auth) ---
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET || "change_me",
//     resave: false,
//     saveUninitialized: false,
//     cookie: { secure: false, sameSite: "lax" },
//   })
// );

// --- Health check ---
app.get("/health", (_req, res) => res.json({ ok: true }));

console.log("webauthnRoutes:", typeof webauthnRoutes);
console.log("pinRoutes:", typeof pinRoutes);
console.log("accountRoutes:", typeof accountRoutes);
console.log("transferRoutes:", typeof transferRoutes);
console.log("authRouter:", typeof authRouter);

// --- API routes ---
// app.use("/api/auth", authRouter);
app.use("/api/auth", magicLinkRoutes);
app.use("/api/webauthn", webauthnRoutes);
app.use("/api/pin", pinRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/transfers", transferRoutes);
// app.use("/api/transfers", transferRoutes);

// celebrate validation errors → your error handler
app.use(notFound);
app.use(celebrateErrors());
app.use(errorHandler);

// --- Mongo connection & server start ---
const PORT = process.env.PORT;
console.log(PORT);

const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI, { dbName: "NeuroWallet" })
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
