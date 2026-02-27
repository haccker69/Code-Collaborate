/**
 * @file draw.handler.js
 * @description Handles live drawing preview relay via socket.io.
 *
 * Stroke persistence and sync is now handled by Yjs CRDT.
 * This handler only relays ephemeral live preview points so users can
 * see each other drawing in real time (dot-by-dot).
 */

"use strict";

/**
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
function registerDrawHandlers(io, socket) {
  /**
   * Live preview: relays the latest point while drawing (pointermove).
   * Payload: { roomId, point: {x, y}, color, width, tool }
   */
  socket.on("draw:preview", ({ roomId, point, color, width, tool }) => {
    if (!roomId || !point) return;
    socket.to(roomId).emit("draw:preview", {
      point, color, width, tool, socketId: socket.id,
    });
  });

  /**
   * Signals drawing stopped — resets remote last-point tracking.
   * Payload: { roomId }
   */
  socket.on("draw:preview_end", ({ roomId }) => {
    if (!roomId) return;
    socket.to(roomId).emit("draw:preview_end", { socketId: socket.id });
  });
}

module.exports = { registerDrawHandlers };
