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

// Safely convert IDs to strings
const sameId = (a, b) =>
  String(a ?? "") === String(b ?? "");

// Return a safe public claim
function publicClaim(claim, extra = {}) {
  if (!claim) return null;

  const result = {
    ...claim,
    id: claim.id ?? claim._id,
    _id: claim._id ?? claim.id,
    ...extra
  };

  // Never expose private verification information
  delete result.verificationAnswer;
  delete result.submittedAnswer;
  delete result.verificationAnswerHash;

  return result;
}

// GET: Claims submitted by the logged-in user
router.get("/mine", protect, async (req, res, next) => {
  try {
    const [claims, items] = await Promise.all([
      readAll("claims"),
      readAll("items")
    ]);

    const mine = claims
      .filter(c => sameId(c.claimant, req.user.id))
      .sort(
        (a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
      )
      .map(c =>
        publicClaim(c, {
          item: publicItem(
            items.find(i => sameId(i.id ?? i._id, c.item))
          )
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
        .filter(i => sameId(i.owner, req.user.id))
        .map(i => String(i.id ?? i._id))
    );

    const received = claims
      .filter(c => ownedIds.has(String(c.item)))
      .sort(
        (a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
      )
      .map(c =>
        publicClaim(c, {
          claimant: publicUser(
            users.find(u =>
              sameId(u.id ?? u._id, c.claimant)
            ),
            true
          ),

          item: publicItem(
            items.find(i =>
              sameId(i.id ?? i._id, c.item)
            )
          )
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

    const itemId = item.id ?? item._id;
    const claimId = claim.id ?? claim._id;

    // Only listing owner or admin can review
    if (
      !sameId(item.owner, req.user.id) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        message: "Only the listing owner can review this claim."
      });
    }

    // Validate decision
    if (!["approved", "rejected"].includes(req.body.status)) {
      return res.status(400).json({
        message: "Decision must be approved or rejected."
      });
    }

    // Check whether claim was already reviewed
    if (claim.status !== "pending") {
      return res.status(400).json({
        message: "This claim has already been reviewed."
      });
    }

    // Prevent approval if verification failed
    if (
      req.body.status === "approved" &&
      !claim.answerCorrect
    ) {
      return res.status(400).json({
        message: "Verification answer did not match. This claim cannot be approved."
      });
    }

    // Approve or reject current claim
    const updatedClaim = await updateById(
      "claims",
      claimId,
      { status: req.body.status }
    );

    if (!updatedClaim) {
      return res.status(404).json({
        message: "Claim could not be updated."
      });
    }

    if (req.body.status === "approved") {

      // Mark listing as claimed
      await updateById("items", itemId, {
        status: "claimed"
      });

      // Reject all other pending claims for this listing
      await updateWhere(
        "claims",
        c =>
          sameId(c.item, itemId) &&
          !sameId(c.id ?? c._id, claimId) &&
          c.status === "pending",
        { status: "rejected" }
      );

    } else {

      // Check if other pending claims remain
      const remaining = await countWhere(
        "claims",
        c =>
          sameId(c.item, itemId) &&
          c.status === "pending"
      );

      // Reopen listing if no pending claims remain
      if (!remaining) {
        await updateById("items", itemId, {
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
