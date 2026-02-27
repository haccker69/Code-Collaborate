/**
 * @file rateLimiter.js
 * @description Express-rate-limit presets for sensitive endpoints.
 */

"use strict";

const rateLimit = require("express-rate-limit");

/** Strict limiter for auth endpoints — prevents brute force */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

/** Moderate limiter for code execution — Judge0 has its own rate limits */
const executeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Execution rate limit reached. Please wait." },
});

/** General API limiter */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, executeLimiter, apiLimiter };
