/**
 * @file piston.service.js
 * @description Piston API abstraction for code execution.
 * Piston docs: https://github.com/engineer-man/piston
 *
 * Flow:
 *   POST /api/v2/execute → immediate result (no polling needed)
 */

"use strict";

const axios = require("axios");

const PISTON_URL = process.env.PISTON_API_URL || "https://cclash.duckdns.org/piston";

const pistonClient = axios.create({
    baseURL: PISTON_URL,
    headers: { "Content-Type": "application/json" },
    timeout: 30000, // code execution can take a while
});

/**
 * Executes code via the Piston API.
 * @param {{ sourceCode: string, language: string, stdin?: string }} params
 * @returns {Promise<{ status: string, stdout: string, stderr: string, time: string|null, memory: number|null }>}
 */
async function executeCode({ sourceCode, language, stdin = "" }) {
    const response = await pistonClient.post("/api/v2/execute", {
        language,
        version: "*",        // use latest available version
        files: [{ content: sourceCode }],
        stdin,
    });

    const { run, compile } = response.data;

    // Check compile errors first (for compiled languages like C, C++, Java)
    const compileErr = compile?.stderr || "";

    const exitCode = run?.code ?? -1;
    const stdout = run?.stdout || "";
    const stderr = run?.stderr || compileErr;

    return {
        status: exitCode === 0 ? "Accepted" : "Runtime Error",
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        time: null,
        memory: null,
    };
}

module.exports = { executeCode };
