/**
 * @file server.js
 * @description Application entry point.
 * Boots the database, creates the HTTP server, attaches Socket.IO + Yjs
 * on a SINGLE port with manual WebSocket upgrade routing.
 */

"use strict";

require("dotenv").config();

const { port } = require("./src/config/env");
const { connectDB } = require("./src/config/db");
const { connectRedis } = require("./src/config/redis");
const { createApp } = require("./app");
const { createSocketServer } = require("./src/socket");
const http = require("http");
const { WebSocketServer } = require("ws");
const { setupWSConnection } = require("y-websocket/bin/utils");

async function boot() {
  // 1. Connect to data stores
  await connectDB();
  await connectRedis(); // no-op if REDIS_URL is unset

  // 2. Create Express app + HTTP server
  const app = createApp();
  const httpServer = http.createServer(app);

  // 3. Create Socket.IO — pass httpServer for HTTP polling,
  //    but we'll handle WebSocket upgrades manually below.
  const io = createSocketServer(httpServer);

  // 4. Create Yjs WebSocket server (noServer mode)
  const yjsWss = new WebSocketServer({ noServer: true });
  yjsWss.on("connection", (ws, req) => {
    setupWSConnection(ws, req);
  });

  // 5. IMPORTANT: Remove Socket.IO's auto-attached upgrade listener
  //    so we can route ALL upgrades ourselves without conflicts.
  httpServer.removeAllListeners("upgrade");

  // 6. Manually route WebSocket upgrades
  httpServer.on("upgrade", (req, socket, head) => {
    const url = req.url || "";

    if (url.startsWith("/yjs")) {
      // Route to Yjs WebSocket server
      yjsWss.handleUpgrade(req, socket, head, (ws) => {
        yjsWss.emit("connection", ws, req);
      });
    } else if (url.startsWith("/socket.io")) {
      // Route to Socket.IO's underlying engine
      io.engine.handleUpgrade(req, socket, head);
    } else {
      // Unknown upgrade path — destroy connection
      socket.destroy();
    }
  });

  // 7. Start listening
  httpServer.listen(port, () => {
    console.log(`[server] Running on http://localhost:${port}`);
    console.log(`[yjs]    WebSocket attached at ws://localhost:${port}/yjs`);
  });

  // 8. Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n[server] ${signal} received — shutting down gracefully`);
    httpServer.close(() => {
      console.log("[server] HTTP server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

boot().catch((err) => {
  console.error("[server] Fatal startup error:", err);
  process.exit(1);
});
