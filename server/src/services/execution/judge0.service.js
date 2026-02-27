/**
 * @file judge0.service.js
 * @description Low-level Judge0 API abstraction.
 * All Judge0-specific logic lives here — swap this file to change provider.
 *
 * Judge0 CE API docs: https://ce.judge0.com/
 * RapidAPI hosted:    https://rapidapi.com/judge0-official/api/judge0-ce
 *
 * Flow:
 *   1. POST /submissions        → create a submission, get token
 *   2. GET  /submissions/:token → poll until status.id > 2 (not queued/processing)
 */

"use strict";

const axios = require("axios");
const { judge0 } = require("../../config/env");

// ── Judge0 status IDs ────────────────────────────────────────────────
const STATUS = {
  IN_QUEUE: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  // 4–14 are various error/limit statuses
};

const POLL_INTERVAL_MS = 1000;
const MAX_POLLS = 15; // give up after 15s

/** Build headers based on whether we're using RapidAPI or self-hosted */
const buildHeaders = () => {
  const headers = { "Content-Type": "application/json" };

  if (judge0.apiKey && judge0.apiHost) {
    // RapidAPI hosted Judge0
    headers["X-RapidAPI-Key"] = judge0.apiKey;
    headers["X-RapidAPI-Host"] = judge0.apiHost;
  } else if (judge0.apiKey) {
    // Self-hosted Judge0 with AUTHN_TOKEN
    headers["X-Auth-Token"] = judge0.apiKey;
  }
  // If no key at all → self-hosted without auth (dev/local)

  return headers;
};

/** Axios instance pre-configured for Judge0 */
const judge0Client = axios.create({
  baseURL: judge0.apiUrl,
  headers: buildHeaders(),
  timeout: 10000,
});

/**
 * Encodes a string to Base64 (Judge0 expects base64-encoded source/stdin).
 * @param {string} str
 * @returns {string}
 */
const toBase64 = (str) => Buffer.from(str || "").toString("base64");

/**
 * Decodes a Base64 string returned by Judge0.
 * @param {string|null} str
 * @returns {string}
 */
const fromBase64 = (str) => (str ? Buffer.from(str, "base64").toString("utf8") : "");

/**
 * Creates a Judge0 submission and returns its token.
 * @param {{ sourceCode: string, languageId: number, stdin?: string }} params
 * @returns {Promise<string>} submission token
 */
async function createSubmission({ sourceCode, languageId, stdin = "" }) {
  const response = await judge0Client.post("/submissions", {
    source_code: toBase64(sourceCode),
    language_id: languageId,
    stdin: toBase64(stdin),
    // Request base64 encoding in the response too
    base64_encoded: true,
  });

  const token = response.data?.token;
  if (!token) throw new Error("Judge0 did not return a submission token");
  return token;
}

/**
 * Polls Judge0 until the submission is complete, then returns the result.
 * @param {string} token
 * @returns {Promise<object>} Raw Judge0 result object
 */
async function pollSubmission(token) {
  for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
    await sleep(POLL_INTERVAL_MS);

    const response = await judge0Client.get(`/submissions/${token}`, {
      params: { base64_encoded: true, fields: "status,stdout,stderr,time,memory,compile_output" },
    });

    const data = response.data;
    const statusId = data.status?.id;

    // Still queued or processing — keep polling
    if (statusId === STATUS.IN_QUEUE || statusId === STATUS.PROCESSING) continue;

    // Terminal state — return decoded result
    return {
      status: data.status?.description || "Unknown",
      stdout: fromBase64(data.stdout),
      stderr: fromBase64(data.stderr) || fromBase64(data.compile_output),
      time: data.time || null,
      memory: data.memory || null,
    };
  }

  throw new Error("Execution timed out — Judge0 did not respond in time");
}

/** @param {number} ms */
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

module.exports = { createSubmission, pollSubmission };
