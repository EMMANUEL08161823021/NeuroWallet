// utils/jwt.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "dev";

const signAccess = (payload, opt = {}) => {

  console.log("JWT payload:", payload);
  
  if (typeof payload !== "object" || Array.isArray(payload) || payload === null) {
    throw new Error("signAccess expects a plain object payload");
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30m", ...opt });
};

const verifyToken = (t) => jwt.verify(t, JWT_SECRET);

module.exports = { signAccess, verifyToken };
