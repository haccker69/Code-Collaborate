/**
 * @file env.js
 * @description Centralised env config. Fails fast if required vars are missing.
 * Import this FIRST in server.js so every module gets validated values.
 */

"use strict";

const required = [
  "MONGO_URI",
  "JWT_SECRET",
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`[env] Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: (process.env.NODE_ENV || "development") === "development",

  mongo: {
    uri: process.env.MONGO_URI,
  },

  redis: {
    url: process.env.REDIS_URL || null, // null → Redis disabled
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  piston: {
    apiUrl: process.env.PISTON_API_URL || "https://cclash.duckdns.org/piston",
  },

  cors: {
    clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  },
};
