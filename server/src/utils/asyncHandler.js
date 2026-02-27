/**
 * @file asyncHandler.js
 * @description Wraps async route handlers so unhandled promise rejections
 * are automatically forwarded to Express error middleware via next(err).
 *
 * @param {Function} fn - Async Express route handler
 * @returns {Function} Wrapped handler
 *
 * @example
 * router.get("/", asyncHandler(async (req, res) => {
 *   const data = await someService.getData();
 *   res.json(data);
 * }));
 */

"use strict";

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
