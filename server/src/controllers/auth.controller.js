/**
 * @file auth.controller.js
 * @description Thin controller — validates input shape, delegates to service,
 * formats the HTTP response. No business logic here.
 */

"use strict";

const authService = require("../services/auth.service");
const otpService = require("../services/otp.service");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

/** POST /api/auth/register */
const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    throw ApiError.badRequest("username, email, and password are required");
  }

  const result = await authService.register({ username, email, password });

  res.status(201).json({ success: true, data: result });
});

/** POST /api/auth/login */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw ApiError.badRequest("email and password are required");
  }

  const result = await authService.login({ email, password });

  res.json({ success: true, data: result });
});

/** GET /api/auth/me  (protected) */
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  res.json({ success: true, data: { user } });
});

/** POST /api/auth/send-otp */
const sendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw ApiError.badRequest("email is required");
  await otpService.sendOTP(email);
  res.json({ success: true, message: "OTP sent to your email" });
});

/** POST /api/auth/verify-otp */
const verifyOTP = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) throw ApiError.badRequest("email and code are required");
  const result = otpService.verifyOTP(email, code);
  if (!result.valid) throw ApiError.badRequest(result.message);
  res.json({ success: true, message: "Email verified successfully" });
});

/** POST /api/auth/reset-password */
const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    throw ApiError.badRequest("email, code, and newPassword are required");
  }
  // Verify OTP first
  const otpResult = otpService.verifyOTP(email, code);
  if (!otpResult.valid) throw ApiError.badRequest(otpResult.message);

  // Reset the password
  await authService.resetPassword({ email, newPassword });
  res.json({ success: true, message: "Password reset successfully" });
});

module.exports = { register, login, getMe, sendOTP, verifyOTP, resetPassword };
