/**
 * @file executeApi.js
 * @description Sends code to the backend /api/execute endpoint (Judge0).
 */

import api from "./axiosInstance";

/**
 * Executes source code via the backend execution service.
 * @param {{ sourceCode: string, language: string, stdin?: string }} data
 * @returns {Promise<{ stdout: string, stderr: string, status: string, time: string|null, memory: number|null }>}
 */
export const executeCode = async ({ sourceCode, language, stdin = "" }) => {
  const res = await api.post("/execute", { sourceCode, language, stdin });
  return res.data.data;
};
