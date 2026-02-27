/**
 * @file code.handler.js
 * @description Handles real-time code collaboration via broadcast sync.
 *
 * Strategy: last-write-wins broadcast.
 *   1. User types → client emits code:change
 *   2. Server broadcasts to everyone else in the room
 *   3. Server debounces a MongoDB save (every 2s of inactivity per file)
 *
 * Cursor positions follow the same pattern via code:cursor events.
 */

"use strict";

const File = require("../models/File");

/**
 * Per-file debounce timers for autosave.
 * Key: fileId, Value: NodeJS.Timeout
 * @type {Map<string, NodeJS.Timeout>}
 */
const saveTimers = new Map();

const AUTOSAVE_DELAY_MS = 2000;

/**
 * Debounces a MongoDB content save for a given file.
 * Resets the timer on every new change — only saves after the user pauses.
 * @param {string} fileId
 * @param {string} content
 * @param {string} userId
 */
function scheduleSave(fileId, content, userId) {
  // Clear any existing timer for this file
  if (saveTimers.has(fileId)) clearTimeout(saveTimers.get(fileId));

  const timer = setTimeout(async () => {
    try {
      await File.findByIdAndUpdate(fileId, {
        content,
        lastEditedBy: userId,
      });
      saveTimers.delete(fileId);
    } catch (err) {
      console.error(`[code] Autosave failed for file ${fileId}:`, err.message);
    }
  }, AUTOSAVE_DELAY_MS);

  saveTimers.set(fileId, timer);
}

/**
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
function registerCodeHandlers(io, socket) {
  /**
   * Emitted when the user changes code in the editor.
   * Payload: { roomId: string, fileId: string, content: string }
   */
  socket.on("code:change", ({ roomId, fileId, content }) => {
    if (!roomId || !fileId || content === undefined) return;

    // Broadcast to everyone in the room EXCEPT the sender
    socket.to(roomId).emit("code:change", { fileId, content });

    // Debounce-save to DB
    scheduleSave(fileId, content, socket.user.id);
  });

  /**
   * Emitted when the user moves their cursor or changes selection.
   * Payload: { roomId: string, fileId: string, cursor: { lineNumber, column } }
   */
  socket.on("code:cursor", ({ roomId, fileId, cursor }) => {
    if (!roomId || !fileId || !cursor) return;

    socket.to(roomId).emit("code:cursor", {
      fileId,
      cursor,
      socketId: socket.id,
      email:    socket.user.email,
    });
  });
}

module.exports = { registerCodeHandlers };
