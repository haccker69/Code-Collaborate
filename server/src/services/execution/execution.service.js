/**
 * @file execution.service.js
 * @description Orchestrates code execution via the Piston API.
 * Maps CollabDev language keys to Piston language names.
 */

"use strict";

const { executeCode } = require("./piston.service");
const ApiError = require("../../utils/ApiError");

/**
 * Language key → Piston language name.
 * Piston uses lowercase names; C++ is "c++".
 * @type {Record<string, string>}
 */
const PISTON_LANGUAGES = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  java: "java",
  cpp: "c++",
  c: "c",
  go: "go",
  rust: "rust",
  ruby: "ruby",
  php: "php",
};

/**
 * Executes source code via Piston and returns the result.
 *
 * @param {{
 *   sourceCode: string,
 *   language:   string,
 *   stdin?:     string,
 * }} params
 *
 * @returns {Promise<{
 *   status: string,
 *   stdout: string,
 *   stderr: string,
 *   time:   string|null,
 *   memory: number|null,
 * }>}
 */
async function execute({ sourceCode, language, stdin = "" }) {
  if (!sourceCode?.trim()) {
    throw ApiError.badRequest("sourceCode is required");
  }

  const pistonLang = PISTON_LANGUAGES[language];
  if (!pistonLang) {
    throw ApiError.badRequest(`Unsupported language: "${language}"`);
  }

  const result = await executeCode({
    sourceCode,
    language: pistonLang,
    stdin,
  });

  return result;
}

module.exports = { execute };
