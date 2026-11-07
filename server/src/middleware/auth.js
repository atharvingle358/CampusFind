import jwt from "jsonwebtoken";
import { findById, publicUser } from "../lib/database.js";

export async function protect(req, res, next) {
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ message: "Please sign in first." });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await findById("users", payload.id);
    if (!user) return res.status(401).json({ message: "Account not found." });
    req.user = { ...publicUser(user, true) };
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired session." });
  }
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin access required." });
  next();
}
