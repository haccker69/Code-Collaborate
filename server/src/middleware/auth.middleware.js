/**
 * @file auth.middleware.js
 * @description Verifies JWT from Authorization header.
 * Attaches decoded user payload to req.user on success.
 */

"use strict";

const jwt = require("jsonwebtoken");
const { jwt: jwtCfg } = require("../config/env");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

/**
 * Express middleware — protects routes requiring authentication.
 * Expects header: Authorization: Bearer <token>
 */
const protect = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw ApiError.unauthorized("No token provided");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, jwtCfg.secret);
    // Attach minimal user info — don't expose full DB doc
    req.user = { id: decoded.sub, email: decoded.email };
    next();
  } catch (err) {
    throw ApiError.unauthorized("Invalid or expired token");
  }
});

module.exports = { protect };
