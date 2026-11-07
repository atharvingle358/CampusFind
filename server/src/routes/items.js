import { Router } from "express";
import bcrypt from "bcryptjs";

import {
  readAll,
  findById,
  insert,
  updateById,
  removeById,
  removeWhere,
  publicUser,
  publicItem
} from "../lib/database.js";

import { protect } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

// GET all listings
router.get("/", async (req, res, next) => {
  try {
    const {
      q,
      type,
      category,
      location,
      status = "open",
      page = 1
    } = req.query;

    const users = await readAll("users");
    let items = await readAll("items");

    items = items.filter(item => {
      if (type && ["lost", "found"].includes(type) && item.type !== type) {
        return false;
      }

      if (category && item.category !== category) {
        return false;
      }

      if (
        location &&
        !String(item.location || "")
          .toLowerCase()
          .includes(String(location).toLowerCase())
      ) {
        return false;
      }

      if (status !== "all" && item.status !== status) {
        return false;
      }

      if (q) {
        const needle = String(q).toLowerCase();

        if (
          !["title", "description", "location"].some(key =>
            String(item[key] || "").toLowerCase().includes(needle)
          )
        ) {
          return false;
        }
      }

      return true;
    });

    items.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const limit = 24;
    const currentPage = Math.max(
      1,
      Number.parseInt(page, 10) || 1
    );

    const total = items.length;

    const pageItems = items
      .slice(
        (currentPage - 1) * limit,
        currentPage * limit
      )
      .map(item => ({
        ...publicItem(item),
        owner: publicUser(
          users.find(user => user.id === item.owner)
        )
      }));

    res.json({
      items: pageItems,
      total,
      page: currentPage,
      pages: Math.ceil(total / limit)
    });

  } catch (error) {
    next(error);
  }
});


// CREATE a new listing
router.post(
  "/",
  protect,
  upload.single("photo"),
  async (req, res, next) => {
    try {
      const {
        type,
        title,
        description,
        category,
        location,
        dateOccurred,
        verificationQuestion,
        verificationAnswer
      } = req.body;

      if (
        !["lost", "found"].includes(type) ||
        !title ||
        !description ||
        !category ||
        !location ||
        !dateOccurred ||
        !verificationQuestion ||
        !verificationAnswer
      ) {
        return res.status(400).json({
          message:
            "Please complete all required fields, including the private verification question and answer."
        });
      }

      const item = await insert("items", {
        type,
        title: title.trim(),
        description,
        category,
        location,
        dateOccurred,
        verificationQuestion,

        verificationAnswerHash: await bcrypt.hash(
          verificationAnswer.trim().toLowerCase(),
          12
        ),

        imageUrl: req.file
          ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
          : "",

        status: "open",
        owner: req.user.id
      });

      res.status(201).json({
        item: publicItem(item)
      });

    } catch (error) {
      next(error);
    }
  }
);


// GET private verification question
router.get(
  "/:id/private-question",
  protect,
  async (req, res, next) => {
    try {
      const item = await findById("items", req.params.id);

      if (!item) {
        return res.status(404).json({
          message: "Listing not found."
        });
      }

      if (String(item.owner) === req.user.id) {
        return res.status(403).json({
          message: "You are the listing owner."
        });
      }

      if (item.status !== "open") {
        return res.status(400).json({
          message: "This listing is not accepting claims."
        });
      }

      res.json({
        question: item.verificationQuestion
      });

    } catch (error) {
      next(error);
    }
  }
);


// GET one listing
router.get("/:id", async (req, res, next) => {
  try {
    const item = await findById("items", req.params.id);

    if (!item) {
      return res.status(404).json({
        message: "Listing not found."
      });
    }

    const users = await readAll("users");

    res.json({
      item: {
        ...publicItem(item),
        owner: publicUser(
          users.find(user => user.id === item.owner)
        )
      }
    });

  } catch (error) {
    next(error);
  }
});


// GET matching listings
router.get(
  "/:id/matches",
  protect,
  async (req, res, next) => {
    try {
      const source = await findById("items", req.params.id);

      if (!source) {
        return res.status(404).json({
          message: "Listing not found."
        });
      }

      const candidates = (await readAll("items"))
        .filter(item =>
          item.type === (source.type === "lost" ? "found" : "lost") &&
          item.status === "open" &&
          item.id !== source.id
        )
        .slice(0, 100);

      const terms = `${source.title} ${source.description}`
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(word => word.length > 2);

      const matches = candidates
        .map(item => {
          const hay = `${item.title} ${item.description}`
            .toLowerCase();

          const hits = terms.filter(term =>
            hay.includes(term)
          ).length;

          const score = Math.min(
            100,
            (item.category === source.category ? 45 : 0) +
            Math.min(55, hits * 12) +
            (
              String(item.location || "").toLowerCase() ===
              String(source.location || "").toLowerCase()
                ? 10
                : 0
            )
          );

          return {
            item: publicItem(item),
            score
          };
        })
        .filter(match => match.score >= 20)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      res.json({ matches });

    } catch (error) {
      next(error);
    }
  }
);


// SUBMIT a claim
router.post(
  "/:id/claims",
  protect,
  async (req, res, next) => {
    try {
      const item = await findById("items", req.params.id);

      if (!item) {
        return res.status(404).json({
          message: "Listing not found."
        });
      }

      if (String(item.owner) === req.user.id) {
        return res.status(400).json({
          message: "You cannot claim your own listing."
        });
      }

      if (item.status !== "open") {
        return res.status(400).json({
          message: "This listing is no longer open for claims."
        });
      }

      const { answer, explanation } = req.body;

      if (!answer || !explanation) {
        return res.status(400).json({
          message: "Answer and explanation are required."
        });
      }

      const claims = await readAll("claims");

      if (
        claims.some(claim =>
          claim.item === item.id &&
          claim.claimant === req.user.id &&
          claim.status === "pending"
        )
      ) {
        return res.status(409).json({
          message: "You already have a pending claim for this item."
        });
      }

      const answerCorrect = await bcrypt.compare(
        answer.trim().toLowerCase(),
        item.verificationAnswerHash
      );

      const claim = await insert("claims", {
        item: item.id,
        claimant: req.user.id,
        explanation,
        answerCorrect,
        status: "pending"
      });

      await updateById("items", item.id, {
        status: "pending"
      });

      res.status(201).json({
        message:
          "Claim submitted. The listing owner will review it.",

        claim: {
          id: claim.id,
          status: claim.status
        }
      });

    } catch (error) {
      next(error);
    }
  }
);


// UPDATE listing status
router.patch(
  "/:id/status",
  protect,
  async (req, res, next) => {
    try {
      const item = await findById("items", req.params.id);

      if (!item) {
        return res.status(404).json({
          message: "Listing not found."
        });
      }

      if (
        String(item.owner) !== req.user.id &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          message: "Not authorized."
        });
      }

      if (
        !["open", "closed", "claimed"].includes(req.body.status)
      ) {
        return res.status(400).json({
          message: "Invalid status."
        });
      }

      const updated = await updateById(
        "items",
        item.id,
        { status: req.body.status }
      );

      res.json({
        item: publicItem(updated)
      });

    } catch (error) {
      next(error);
    }
  }
);


// DELETE a listing
router.delete(
  "/:id",
  protect,
  async (req, res, next) => {
    try {
      const item = await findById("items", req.params.id);

      if (!item) {
        return res.status(404).json({
          message: "Listing not found."
        });
      }

      if (
        String(item.owner) !== req.user.id &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          message: "You are not authorized to delete this listing."
        });
      }

      // Delete associated claims first
      await removeWhere(
        "claims",
        claim => claim.item === item.id
      );

      // Delete the listing
      await removeById("items", item.id);

      res.json({
        message: "Listing deleted successfully."
      });

    } catch (error) {
      next(error);
    }
  }
);

export default router;
