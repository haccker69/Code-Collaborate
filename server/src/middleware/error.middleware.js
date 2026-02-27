/**
 * @file error.middleware.js
 * @description Global Express error handler. Must be registered LAST in app.js.
 * Handles both ApiError (operational) and unexpected errors uniformly.
 */

"use strict";

const { isDev } = require("../config/env");
const ApiError = require("../utils/ApiError");

/**
 * @param {Error} err
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  // Mongoose validation errors → 400
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: "Validation error", errors });
  }

  // Mongoose duplicate key → 409
  if (err.code === 11000) {
    // keyPattern may be undefined in some driver versions; fall back to keyValue
    const field =
      Object.keys(err.keyPattern || {})[0] ||
      Object.keys(err.keyValue || {})[0] ||
      "field";
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // Our own operational errors
  if (err instanceof ApiError && err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors.length && { errors: err.errors }),
    });
  }

  // Unexpected errors — log fully, hide details in production
  console.error("[error]", err);
  return res.status(500).json({
    success: false,
    message: isDev ? err.message : "Internal server error",
    ...(isDev && { stack: err.stack }),
  });
}

module.exports = { errorMiddleware };
