/**
 * @file auth.service.js
 * @description Auth business logic. Controllers stay thin; logic lives here.
 */

"use strict";

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { jwt: jwtCfg } = require("../config/env");
const ApiError = require("../utils/ApiError");

/**
 * Generates a signed JWT for a given user.
 * @param {import("../models/User")} user
 * @returns {string} Signed JWT
 */
function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, username: user.username },
    jwtCfg.secret,
    { expiresIn: jwtCfg.expiresIn }
  );
}

/**
 * Registers a new user.
 * @param {{ username: string, email: string, password: string }} data
 * @returns {Promise<{ user: object, token: string }>}
 */
async function register({ username, email, password }) {
  // Email uniqueness is enforced by the DB unique index,
  // but we give a friendlier message by checking first.
  const exists = await User.findOne({ email });
  if (exists) throw ApiError.conflict("Email is already registered");

  const user = await User.create({ username, email, password });
  const token = signToken(user);

  return { user: user.toPublic(), token };
}

/**
 * Authenticates a user with email + password.
 * @param {{ email: string, password: string }} data
 * @returns {Promise<{ user: object, token: string }>}
 */
async function login({ email, password }) {
  // Explicitly select password since it has select:false on schema
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    // Generic message — don't reveal whether email exists
    throw ApiError.unauthorized("Invalid email or password");
  }

  const token = signToken(user);
  return { user: user.toPublic(), token };
}

/**
 * Returns public profile for the currently authenticated user.
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");
  return user.toPublic();
}

/**
 * Resets a user's password (after OTP has been verified).
 * @param {{ email: string, newPassword: string }} data
 * @returns {Promise<{ success: boolean }>}
 */
async function resetPassword({ email, newPassword }) {
  const user = await User.findOne({ email }).select("+password");
  if (!user) throw ApiError.notFound("No account found with that email");

  user.password = newPassword; // pre-save hook will hash it
  await user.save();

  return { success: true };
}

module.exports = { register, login, getMe, resetPassword };
