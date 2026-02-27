/**
 * @file db.js
 * @description Mongoose connection helper. Call connectDB() once in server.js.
 */

"use strict";

const mongoose = require("mongoose");
const { mongo } = require("./env");

/**
 * Connects to MongoDB and sets up connection event listeners.
 * @returns {Promise<void>}
 */
async function connectDB() {
  try {
    await mongoose.connect(mongo.uri, {
      // Mongoose 7+ handles these internally, kept for clarity
      serverSelectionTimeoutMS: 5000,
    });
    console.log("[db] MongoDB connected");
  } catch (err) {
    console.error("[db] Connection failed:", err.message);
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () =>
    console.warn("[db] MongoDB disconnected")
  );
  mongoose.connection.on("reconnected", () =>
    console.info("[db] MongoDB reconnected")
  );
}

module.exports = { connectDB };
