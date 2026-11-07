import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { readAll, insert, publicUser } from "../lib/database.js";
import { protect } from "../middleware/auth.js";

const router = Router();
const tokenFor = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 8) {
      return res.status(400).json({ message: "Name, email and a password of at least 8 characters are required." });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const users = await readAll("users");
    if (users.some(user => user.email === normalizedEmail)) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    const user = await insert("users", {
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      role: "student"
    });
    res.status(201).json({ token: tokenFor(user.id), user: { ...publicUser(user, true) } });
  } catch (e) { next(e); }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const users = await readAll("users");
    const user = users.find(row => row.email === email);
    if (!user || !(await bcrypt.compare(req.body.password || "", user.password))) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }
    res.json({ token: tokenFor(user.id), user: { ...publicUser(user, true) } });
  } catch (e) { next(e); }
});

router.get("/me", protect, (req, res) => res.json({ user: req.user }));
export default router;
