/**
 * @file server.js
 * @description Application entry point.
 * Boots the database, creates the HTTP server, attaches Socket.IO,
 * then starts listening. Import order matters — env must be first.
 */

"use strict";

require("dotenv").config();

const { port } = require("./src/config/env"); // env validated here
const { connectDB }    = require("./src/config/db");
const { connectRedis } = require("./src/config/redis");
const { createApp }    = require("./app");
const { createSocketServer } = require("./src/socket");
const http = require("http");

async function boot() {
  // 1. Connect to data stores
  await connectDB();
  await connectRedis(); // no-op if REDIS_URL is unset

  // 2. Create Express app + HTTP server
  const app        = createApp();
  const httpServer = http.createServer(app);

  // 3. Attach Socket.IO (returns the io instance)
  createSocketServer(httpServer);

  // 4. Start listening
  httpServer.listen(port, () => {
    console.log(`[server] Running on http://localhost:${port}`);
  });

  // 5. Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n[server] ${signal} received — shutting down gracefully`);
    httpServer.close(() => {
      console.log("[server] HTTP server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
}

boot().catch((err) => {
  console.error("[server] Fatal startup error:", err);
  process.exit(1);
});
