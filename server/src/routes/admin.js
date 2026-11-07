import { Router } from "express";
import { readAll, publicUser, publicItem } from "../lib/database.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = Router();

router.get("/stats", protect, adminOnly, async (_req, res, next) => {
  try {
    const [users, items, claims] = await Promise.all([readAll("users"), readAll("items"), readAll("claims")]);
    res.json({
      users: users.length,
      items: items.length,
      lost: items.filter(i => i.type === "lost").length,
      found: items.filter(i => i.type === "found").length,
      claimed: items.filter(i => i.status === "claimed").length,
      pendingClaims: claims.filter(c => c.status === "pending").length
    });
  } catch (e) { next(e); }
});

router.get("/items", protect, adminOnly, async (_req, res, next) => {
  try {
    const [items, users] = await Promise.all([readAll("items"), readAll("users")]);
    const result = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 200)
      .map(item => ({ ...publicItem(item), owner: publicUser(users.find(u => u.id === item.owner), true) }));
    res.json({ items: result });
  } catch (e) { next(e); }
});

export default router;
