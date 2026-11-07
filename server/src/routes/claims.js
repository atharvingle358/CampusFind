
import { Router } from "express";
import {
  readAll,
  findById,
  updateById,
  updateWhere,
  countWhere,
  publicUser,
  publicItem
} from "../lib/database.js";
import { protect } from "../middleware/auth.js";

const router = Router();

// Ensure every claim has both id and _id
function publicClaim(claim, extra = {}) {
  if (!claim) return null;

  return {
    ...claim,
    id: claim.id ?? claim._id,
    _id: claim._id ?? claim.id,
    ...extra
  };
}

// GET: Claims submitted by the logged-in user
router.get("/mine", protect, async (req, res, next) => {
  try {
    const [claims, items] = await Promise.all([
      readAll("claims"),
      readAll("items")
    ]);

    const mine = claims
      .filter(c => c.claimant === req.user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(c =>
        publicClaim(c, {
          item: publicItem(items.find(i => i.id === c.item))
        })
      );

    res.json({ claims: mine });
  } catch (error) {
    next(error);
  }
});

// GET: Claims received for listings owned by the logged-in user
router.get("/received", protect, async (req, res, next) => {
  try {
    const [claims, items, users] = await Promise.all([
      readAll("claims"),
      readAll("items"),
      readAll("users")
    ]);

    const ownedIds = new Set(
      items
        .filter(i => i.owner === req.user.id)
        .map(i => i.id)
    );

    const received = claims
      .filter(c => ownedIds.has(c.item))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(c =>
        publicClaim(c, {
          claimant: publicUser(
            users.find(u => u.id === c.claimant),
            true
          ),
          item: publicItem(items.find(i => i.id === c.item))
        })
      );

    res.json({ claims: received });
  } catch (error) {
    next(error);
  }
});

// PATCH: Approve or reject a claim
router.patch("/:id", protect, async (req, res, next) => {
  try {
    const claim = await findById("claims", req.params.id);

    if (!claim) {
      return res.status(404).json({
        message: "Claim not found."
      });
    }

    const item = await findById("items", claim.item);

    if (!item) {
      return res.status(404).json({
        message: "Listing not found."
      });
    }

    // Only the listing owner or admin can review
    if (
      String(item.owner) !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        message: "Only the listing owner can review this claim."
      });
    }

    if (!["approved", "rejected"].includes(req.body.status)) {
      return res.status(400).json({
        message: "Decision must be approved or rejected."
      });
    }

    if (claim.status !== "pending") {
      return res.status(400).json({
        message: "This claim has already been reviewed."
      });
    }

    // A claim can only be approved if private verification matched
    if (
      req.body.status === "approved" &&
      !claim.answerCorrect
    ) {
      return res.status(400).json({
        message: "Verification answer did not match. This claim cannot be approved."
      });
    }

    const updatedClaim = await updateById(
      "claims",
      claim.id ?? claim._id,
      { status: req.body.status }
    );

    if (req.body.status === "approved") {
      // Mark the listing as claimed
      await updateById("items", item.id ?? item._id, {
        status: "claimed"
      });

      // Reject other pending claims for the same listing
      await updateWhere(
        "claims",
        c =>
          c.item === item.id &&
          c.id !== claim.id &&
          c.status === "pending",
        { status: "rejected" }
      );
    } else {
      // Reopen the listing if no other pending claims remain
      const remaining = await countWhere(
        "claims",
        c =>
          c.item === item.id &&
          c.status === "pending" &&
          c.id !== claim.id
      );

      if (!remaining) {
        await updateById("items", item.id ?? item._id, {
          status: "open"
        });
      }
    }

    res.json({
      message: `Claim ${updatedClaim.status}.`,
      claim: publicClaim(updatedClaim)
    });

  } catch (error) {
    next(error);
  }
});

export default router;
