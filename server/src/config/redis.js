/**
 * @file redis.js
 * @description Optional Redis client. Returns null when REDIS_URL is unset,
 * allowing the rest of the app to run without Redis in dev.
 */

"use strict";

const { createClient } = require("redis");
const { redis: redisCfg } = require("./env");

let client = null;

/**
 * Creates and connects a Redis client if REDIS_URL is configured.
 * @returns {Promise<import("redis").RedisClientType | null>}
 */
async function connectRedis() {
  if (!redisCfg.url) {
    console.info("[redis] REDIS_URL not set — running without Redis");
    return null;
  }

  client = createClient({ url: redisCfg.url });

  client.on("error", (err) => console.error("[redis] Error:", err.message));
  client.on("reconnecting", () => console.warn("[redis] Reconnecting..."));

  await client.connect();
  console.log("[redis] Connected");
  return client;
}

/**
 * Returns the active Redis client (or null if not connected).
 * @returns {import("redis").RedisClientType | null}
 */
function getRedisClient() {
  return client;
}

module.exports = { connectRedis, getRedisClient };
