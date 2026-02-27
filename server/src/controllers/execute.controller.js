/**
 * @file execute.controller.js
 */

"use strict";

const executionService = require("../services/execution/execution.service");
const asyncHandler     = require("../utils/asyncHandler");
const ApiError         = require("../utils/ApiError");

/**
 * POST /api/execute
 * Body: { sourceCode: string, language: string, stdin?: string }
 */
const execute = asyncHandler(async (req, res) => {
  const { sourceCode, language, stdin } = req.body;

  if (!sourceCode) throw ApiError.badRequest("sourceCode is required");
  if (!language)   throw ApiError.badRequest("language is required");

  const result = await executionService.execute({ sourceCode, language, stdin });

  res.json({ success: true, data: result });
});

module.exports = { execute };
