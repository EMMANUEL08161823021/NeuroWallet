import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "dev";

export const signAccess = (payload, opt={}) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "30m", ...opt });
export const verifyToken = (t) => jwt.verify(t, JWT_SECRET);