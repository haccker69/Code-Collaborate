/**
 * @file app.js
 * @description Express application factory.
 * Keeps the HTTP app separate from the server so it can be tested in isolation.
 */

"use strict";

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { cors: corsCfg, isDev } = require("./src/config/env");
const { apiLimiter } = require("./src/middleware/rateLimiter");
const { errorMiddleware } = require("./src/middleware/error.middleware");

// ── Route imports ────────────────────────────────────────────────────
const authRoutes = require("./src/routes/auth.routes");
const projectRoutes = require("./src/routes/project.routes");
const fileRoutes = require("./src/routes/file.routes");
const executeRoutes = require("./src/routes/execute.routes");

function createApp() {
  const app = express();

  // ── Trust proxy (required behind Render/Heroku/etc reverse proxies) ──
  app.set("trust proxy", 1);

  // ── Security & parsing ─────────────────────────────────────────────
  app.use(helmet());
  app.use(cors({ origin: corsCfg.clientOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // ── Logging ────────────────────────────────────────────────────────
  if (isDev) app.use(morgan("dev"));

  // ── Rate limiting ──────────────────────────────────────────────────
  app.use("/api", apiLimiter);

  // ── Health check ───────────────────────────────────────────────────
  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // ── API routes ─────────────────────────────────────────────────────
  app.use("/api/auth", authRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/files", fileRoutes);
  app.use("/api/execute", executeRoutes);

  // ── 404 catch-all ──────────────────────────────────────────────────
  app.use((_req, res) => res.status(404).json({ success: false, message: "Route not found" }));

  // ── Global error handler (must be last) ────────────────────────────
  app.use(errorMiddleware);

  return app;
}

module.exports = { createApp };
