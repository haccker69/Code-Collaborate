/**
 * @file ApiError.js
 * @description Custom error class for operational HTTP errors.
 * Throw this anywhere in the app; the error middleware will handle it.
 */

"use strict";

class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message    - Human-readable error message
   * @param {any[]}  [errors]   - Optional array of validation errors
   */
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true; // Distinguishes from unexpected crashes
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg, errors)  { return new ApiError(400, msg, errors); }
  static unauthorized(msg = "Unauthorized") { return new ApiError(401, msg); }
  static forbidden(msg = "Forbidden")       { return new ApiError(403, msg); }
  static notFound(msg = "Not found")        { return new ApiError(404, msg); }
  static conflict(msg)                       { return new ApiError(409, msg); }
  static internal(msg = "Server error")     { return new ApiError(500, msg); }
}

module.exports = ApiError;
