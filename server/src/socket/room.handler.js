/**
 * @file room.handler.js
 * @description Handles room join/leave and presence (who is online in a room).
 *
 * Presence is stored in memory as a Map: roomId → Map<socketId, userInfo>
 * This is intentionally simple — for horizontal scaling, move presence to Redis.
 */

"use strict";

/** @type {Map<string, Map<string, object>>} roomId → socketId → user */
const roomPresence = new Map();

/**
 * Returns the current presence list for a room as an array.
 * @param {string} roomId
 * @returns {object[]}
 */
function getPresence(roomId) {
  const room = roomPresence.get(roomId);
  if (!room) return [];
  return Array.from(room.values());
}

const MAX_ROOM_SIZE = 6;

/**
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
function registerRoomHandlers(io, socket) {
  /**
   * Client emits room:join when entering a project room.
   * Payload: { roomId: string }
   */
  socket.on("room:join", ({ roomId }) => {
    if (!roomId) return;

    // Enforce room capacity
    const members = roomPresence.get(roomId);
    if (members && members.size >= MAX_ROOM_SIZE) {
      socket.emit("room:full", { roomId, max: MAX_ROOM_SIZE });
      console.log(`[room] ${socket.user.email} rejected — room ${roomId} is full (${MAX_ROOM_SIZE}/${MAX_ROOM_SIZE})`);
      return;
    }

    socket.join(roomId);

    // Track presence
    if (!roomPresence.has(roomId)) roomPresence.set(roomId, new Map());
    roomPresence.get(roomId).set(socket.id, {
      socketId: socket.id,
      userId: socket.user.id,
      email: socket.user.email,
    });

    // Tell the joining user who else is here
    socket.emit("room:presence", getPresence(roomId));

    // Tell everyone else in the room that a new user joined
    socket.to(roomId).emit("room:user_joined", {
      socketId: socket.id,
      userId: socket.user.id,
      email: socket.user.email,
    });

    console.log(`[room] ${socket.user.email} joined room ${roomId} (${roomPresence.get(roomId).size}/${MAX_ROOM_SIZE})`);
  });

  /**
   * Client emits room:leave to cleanly exit a room.
   * Payload: { roomId: string }
   */
  socket.on("room:leave", ({ roomId }) => {
    leaveRoom(io, socket, roomId);
  });

  /**
   * Auto-cleanup when the socket disconnects (tab close, network drop, etc.)
   * We need to remove the user from ALL rooms they were in.
   */
  socket.on("disconnect", () => {
    for (const [roomId, members] of roomPresence.entries()) {
      if (members.has(socket.id)) {
        leaveRoom(io, socket, roomId);
      }
    }
  });
}

/**
 * Removes a socket from a room and broadcasts the updated presence.
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 * @param {string} roomId
 */
function leaveRoom(io, socket, roomId) {
  socket.leave(roomId);

  const members = roomPresence.get(roomId);
  if (members) {
    members.delete(socket.id);
    if (members.size === 0) roomPresence.delete(roomId); // GC empty rooms
  }

  // Notify remaining room members
  io.to(roomId).emit("room:user_left", { socketId: socket.id });
  io.to(roomId).emit("room:presence", getPresence(roomId));

  console.log(`[room] ${socket.user.email} left room ${roomId}`);
}

module.exports = { registerRoomHandlers };
