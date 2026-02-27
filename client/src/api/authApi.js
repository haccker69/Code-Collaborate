/**
 * @file authApi.js
 * @description REST calls for auth endpoints.
 */

import api from "./axiosInstance";

/**
 * @param {{ username: string, email: string, password: string }} data
 * @returns {Promise<{ user: object, token: string }>}
 */
export const register = async (data) => {
  const res = await api.post("/auth/register", data);
  return res.data.data;
};

/**
 * @param {{ email: string, password: string }} data
 * @returns {Promise<{ user: object, token: string }>}
 */
export const login = async (data) => {
  const res = await api.post("/auth/login", data);
  return res.data.data;
};

/**
 * @returns {Promise<{ user: object }>}
 */
export const getMe = async () => {
  const res = await api.get("/auth/me");
  return res.data.data;
};

/**
 * Sends an OTP to the given email via Brevo.
 * @param {string} email
 */
export const sendOTP = async (email) => {
  const res = await api.post("/auth/send-otp", { email });
  return res.data;
};

/**
 * Verifies the OTP code for the given email.
 * @param {string} email
 * @param {string} code
 */
export const verifyOTP = async (email, code) => {
  const res = await api.post("/auth/verify-otp", { email, code });
  return res.data;
};

/**
 * Resets password after OTP verification.
 * @param {string} email
 * @param {string} code - OTP code
 * @param {string} newPassword
 */
export const resetPassword = async (email, code, newPassword) => {
  const res = await api.post("/auth/reset-password", { email, code, newPassword });
  return res.data;
};
