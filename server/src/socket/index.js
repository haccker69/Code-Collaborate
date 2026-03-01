/**
 * @file socket/index.js
 * @description Initialises Socket.IO, authenticates connections via JWT,
 * and wires up all event handlers. Each feature has its own handler module.
 */

"use strict";

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { cors: corsCfg, jwt: jwtCfg } = require("../config/env");
const User = require("../models/User");

// ── Handler imports ──────────────────────────────────────────────────
const { registerRoomHandlers } = require("./room.handler");
const { registerCodeHandlers } = require("./code.handler");
const { registerDrawHandlers } = require("./draw.handler");
const { registerVoiceHandlers } = require("./voice.handler");
const { registerChatHandlers } = require("./chat.handler");
const { registerExecutionHandlers } = require("./execution.handler");
const { registerModerationHandlers } = require("./moderation.handler");

/**
 * Creates and configures the Socket.IO server.
 * @param {import("http").Server} httpServer
 * @returns {import("socket.io").Server} io instance
 */
function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: corsCfg.clientOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Ping timeout / interval tuned for reasonable responsiveness
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ── Socket auth middleware ─────────────────────────────────────────
  // Verifies JWT on every new connection before the socket is accepted.
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("AUTH_REQUIRED"));

    try {
      const decoded = jwt.verify(token, jwtCfg.secret);
      // Always fetch username from DB to handle old JWTs without username
      let username = decoded.username;
      if (!username) {
        const dbUser = await User.findById(decoded.sub).select("username").lean();
        username = dbUser?.username || decoded.email?.split("@")[0];
      }
      socket.user = { id: decoded.sub, email: decoded.email, username };
      next();
    } catch {
      next(new Error("AUTH_INVALID"));
    }
  });

  // ── Connection handler ─────────────────────────────────────────────
  io.on("connection", (socket) => {
    console.log(`[socket] Connected: ${socket.id} (user: ${socket.user.id})`);

    // Register feature-specific handlers
    registerRoomHandlers(io, socket);
    registerCodeHandlers(io, socket);
    registerDrawHandlers(io, socket);
    registerVoiceHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerExecutionHandlers(io, socket);
    registerModerationHandlers(io, socket);

    socket.on("disconnect", (reason) => {
      console.log(`[socket] Disconnected: ${socket.id} — ${reason}`);
    });
  });

  return io;
}

module.exports = { createSocketServer };
