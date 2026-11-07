import { Router } from "express";

import {
  readAll,
  publicUser,
  publicItem
} from "../lib/database.js";

import {
  protect,
  adminOnly
} from "../middleware/auth.js";

const router = Router();

const sameId = (a, b) =>
  String(a ?? "") === String(b ?? "");


// GET: Admin Dashboard Statistics
router.get("/stats", protect, adminOnly, async (_req, res, next) => {
  try {
    const [users, items, claims] = await Promise.all([
      readAll("users"),
      readAll("items"),
      readAll("claims")
    ]);

    res.json({
      users: users.length,

      items: items.length,

      lost: items.filter(
        item => item.type === "lost"
      ).length,

      found: items.filter(
        item => item.type === "found"
      ).length,

      claimed: items.filter(
        item => item.status === "claimed"
      ).length,

      pendingClaims: claims.filter(
        claim => claim.status === "pending"
      ).length
    });

  } catch (error) {
    next(error);
  }
});


// GET: Admin View All Items
router.get("/items", protect, adminOnly, async (_req, res, next) => {
  try {
    const [items, users] = await Promise.all([
      readAll("items"),
      readAll("users")
    ]);

    const result = items
      .sort(
        (a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
      )
      .slice(0, 200)
      .map(item => {
        const owner = users.find(user =>
          sameId(user.id ?? user._id, item.owner)
        );

        return {
          ...publicItem(item),
          owner: publicUser(owner, true)
        };
      });

    res.json({ items: result });

  } catch (error) {
    next(error);
  }
});

export default router;
