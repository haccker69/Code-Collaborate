/**
 * @file chat.handler.js
 * @description Handles real-time team chat within a project room.
 * Messages are persisted to MongoDB so they survive reconnections.
 *
 * Events:
 *   chat:send    → client sends a message   { roomId, text }
 *   chat:message → server broadcasts to room { sender, text, timestamp }
 *   chat:history → server sends last 50 messages when user joins
 */

"use strict";

const Message = require("../models/Message");
const { isRestricted } = require("./moderation.handler");

/**
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
function registerChatHandlers(io, socket) {
    /**
     * Client requests chat history when entering a room.
     * Payload: { roomId: string }
     */
    socket.on("chat:history", async ({ roomId }) => {
        if (!roomId) return;
        try {
            const messages = await Message.find({ project: roomId })
                .sort({ createdAt: 1 })
                .limit(50)
                .lean();

            const formatted = messages.map((m) => ({
                id: m._id.toString(),
                sender: m.sender,
                senderId: m.senderId,
                text: m.text,
                timestamp: m.createdAt.toISOString(),
            }));

            socket.emit("chat:history", formatted);
        } catch (err) {
            console.error("[chat] Failed to load history:", err.message);
        }
    });

    /**
     * Client sends a chat message.
     * Payload: { roomId: string, text: string }
     */
    socket.on("chat:send", async ({ roomId, text }) => {
        if (!roomId || !text?.trim()) return;

        // Check moderation restrictions
        if (isRestricted(roomId, socket.id, "chat")) {
            socket.emit("mod:restricted", { section: "chat", restricted: true });
            return;
        }

        const message = {
            sender: socket.user.email,
            senderId: socket.user.id,
            text: text.trim(),
            timestamp: new Date().toISOString(),
        };

        // Save to MongoDB
        try {
            const saved = await Message.create({
                project: roomId,
                sender: message.sender,
                senderId: message.senderId,
                text: message.text,
            });
            message.id = saved._id.toString();
        } catch (err) {
            console.error("[chat] Failed to save message:", err.message);
            message.id = `${socket.id}-${Date.now()}`;
        }

        // Broadcast to everyone in the room (including sender)
        io.to(roomId).emit("chat:message", message);
    });
}

module.exports = { registerChatHandlers };
