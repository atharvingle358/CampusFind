import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const here = path.dirname(fileURLToPath(import.meta.url));

// Store uploaded images in server/uploads
const uploadDir = path.resolve(here, "../../uploads");

fs.mkdirSync(uploadDir, { recursive: true });

// Allowed image formats
const allowedTypes = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

// Configure storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const extension = allowedTypes[file.mimetype];

    cb(null, `${Date.now()}-${randomUUID()}${extension}`);
  }
});

// Configure upload middleware
export const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (_req, file, cb) => {
    if (!allowedTypes[file.mimetype]) {
      return cb(
        new Error("Only JPG, PNG and WEBP images are allowed.")
      );
    }

    cb(null, true);
  }
});
