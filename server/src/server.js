import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

import authRoutes from "./routes/auth.js";
import itemRoutes from "./routes/items.js";
import claimRoutes from "./routes/claims.js";
import adminRoutes from "./routes/admin.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, "../uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const configuredOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",").map(value => value.trim()).filter(Boolean);

function allowedOrigin(origin) {
  if (!origin) return true;
  if (configuredOrigins.includes(origin)) return true;
  try {
    const url = new URL(origin);
    const host = url.hostname;
    return url.port === "5173" &&
      (host === "localhost" || host === "127.0.0.1" ||
       /^10\./.test(host) || /^192\.168\./.test(host) ||
       /^172\.(1[6-9]|2\d|3[01])\./.test(host));
  } catch {
    return false;
  }
}

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin(origin, callback) {
    if (allowedOrigin(origin)) return callback(null, true);
    callback(new Error(`CORS blocked origin: ${origin}`));
  }
}));
app.options("*", cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use("/uploads", express.static(uploadsDir));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 250 }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", app: "CampusFind API", database: "local-json" }));
app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

const port = Number(process.env.PORT) || 5000;
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error("Missing JWT_SECRET in server/.env. Add a long random secret before starting.");
  process.exit(1);
}

app.listen(port, () => {
  console.log(`CampusFind API running on ${port}`);
  console.log("Storage: local JSON files in server/data/");
});
