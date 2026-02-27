/**
 * @file chat.handler.js
 * @description Handles real-time team chat within a project room.
 * Messages are ephemeral (in-memory only — not persisted to DB).
 *
 * Events:
 *   chat:send    → client sends a message   { roomId, text }
 *   chat:message → server broadcasts to room { sender, text, timestamp }
 */

"use strict";

/**
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
function registerChatHandlers(io, socket) {
    /**
     * Client sends a chat message.
     * Payload: { roomId: string, text: string }
     */
    socket.on("chat:send", ({ roomId, text }) => {
        if (!roomId || !text?.trim()) return;

        const message = {
            id: `${socket.id}-${Date.now()}`,
            sender: socket.user.email,
            senderId: socket.user.id,
            text: text.trim(),
            timestamp: new Date().toISOString(),
        };

        // Broadcast to everyone in the room (including sender)
        io.to(roomId).emit("chat:message", message);
    });
}

module.exports = { registerChatHandlers };
