/**
 * @file moderation.handler.js
 * @description Owner moderation controls: kick, force-mute, restrict sections.
 *
 * In-memory state per room — resets when the room empties.
 * Restrictions are per-socketId per-section (code, draw, chat, execute).
 *
 * Events (owner → server):
 *   mod:kick          { roomId, targetSocketId }
 *   mod:force_mute    { roomId, targetSocketId }
 *   mod:restrict      { roomId, targetSocketId, section, restricted }
 *
 * Events (server → clients):
 *   mod:state          { restrictions: { [socketId]: [sections] } }
 *   mod:kicked         {} — sent to the kicked user
 *   mod:force_muted    {} — sent to the force-muted user
 *   mod:restricted     { section, restricted } — sent to the affected user
 */

"use strict";

const Project = require("../models/Project");
const { roomPresence } = require("./room.handler");

/**
 * roomId → Map<socketId, Set<section>>
 * @type {Map<string, Map<string, Set<string>>>}
 */
const roomRestrictions = new Map();

/** Valid restriction sections */
const VALID_SECTIONS = new Set(["code", "draw", "chat", "execute"]);

/**
 * Check if a user is restricted from a section in a room.
 * @param {string} roomId
 * @param {string} socketId
 * @param {string} section
 * @returns {boolean}
 */
function isRestricted(roomId, socketId, section) {
    const room = roomRestrictions.get(roomId);
    if (!room) return false;
    const sections = room.get(socketId);
    if (!sections) return false;
    return sections.has(section);
}

/**
 * Get the full restrictions state for a room as a serializable object.
 * @param {string} roomId
 * @returns {Object<string, string[]>}
 */
function getRestrictionsState(roomId) {
    const room = roomRestrictions.get(roomId);
    if (!room) return {};
    const state = {};
    for (const [socketId, sections] of room.entries()) {
        if (sections.size > 0) {
            state[socketId] = Array.from(sections);
        }
    }
    return state;
}

/**
 * Broadcast current moderation state to everyone in a room.
 */
function broadcastState(io, roomId) {
    io.to(roomId).emit("mod:state", {
        restrictions: getRestrictionsState(roomId),
    });
}

/**
 * Clean up restrictions for a socket leaving a room.
 */
function cleanupSocket(roomId, socketId) {
    const room = roomRestrictions.get(roomId);
    if (room) {
        room.delete(socketId);
        if (room.size === 0) roomRestrictions.delete(roomId);
    }
}

/**
 * Verify that the requesting socket user is the owner of the project.
 * @param {string} roomId - also the projectId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function isOwner(roomId, userId) {
    try {
        const project = await Project.findById(roomId).select("owner").lean();
        if (!project) return false;
        return project.owner.toString() === userId.toString();
    } catch {
        return false;
    }
}

/**
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
function registerModerationHandlers(io, socket) {

    /** mod:kick — Remove a user from the room */
    socket.on("mod:kick", async ({ roomId, targetSocketId }) => {
        if (!roomId || !targetSocketId) return;
        if (!(await isOwner(roomId, socket.user.id))) return;

        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (!targetSocket) return;

        // Notify the target they've been kicked
        targetSocket.emit("mod:kicked", { roomId });

        // Remove from room
        targetSocket.leave(roomId);

        // Clean presence
        const members = roomPresence.get(roomId);
        if (members) {
            members.delete(targetSocketId);
            if (members.size === 0) roomPresence.delete(roomId);
        }

        // Clean restrictions
        cleanupSocket(roomId, targetSocketId);

        // Notify room
        io.to(roomId).emit("room:user_left", { socketId: targetSocketId });
        const presence = members ? Array.from(members.values()) : [];
        io.to(roomId).emit("room:presence", presence);
        broadcastState(io, roomId);

        console.log(`[mod] ${socket.user.email} kicked ${targetSocket.user?.email} from ${roomId}`);
    });

    /** mod:force_mute — Mute a user's microphone */
    socket.on("mod:force_mute", async ({ roomId, targetSocketId }) => {
        if (!roomId || !targetSocketId) return;
        if (!(await isOwner(roomId, socket.user.id))) return;

        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (!targetSocket) return;

        // Tell the target to mute themselves
        targetSocket.emit("mod:force_muted", {});

        // Broadcast mute state to room
        io.to(roomId).emit("voice:mute_state", { socketId: targetSocketId, muted: true });

        console.log(`[mod] ${socket.user.email} force-muted ${targetSocket.user?.email} in ${roomId}`);
    });

    /** mod:restrict — Toggle a write restriction for a section */
    socket.on("mod:restrict", async ({ roomId, targetSocketId, section, restricted }) => {
        if (!roomId || !targetSocketId || !VALID_SECTIONS.has(section)) return;
        if (!(await isOwner(roomId, socket.user.id))) return;

        // Initialize room restrictions map
        if (!roomRestrictions.has(roomId)) {
            roomRestrictions.set(roomId, new Map());
        }
        const room = roomRestrictions.get(roomId);
        if (!room.has(targetSocketId)) {
            room.set(targetSocketId, new Set());
        }

        const sections = room.get(targetSocketId);
        if (restricted) {
            sections.add(section);
        } else {
            sections.delete(section);
        }

        // Notify the target user
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
            targetSocket.emit("mod:restricted", { section, restricted });
        }

        // Broadcast updated state to room
        broadcastState(io, roomId);

        console.log(`[mod] ${socket.user.email} ${restricted ? "restricted" : "unrestricted"} ${targetSocket?.user?.email} on ${section} in ${roomId}`);
    });

    // Send current moderation state when a user requests it
    socket.on("mod:get_state", ({ roomId }) => {
        if (!roomId) return;
        socket.emit("mod:state", {
            restrictions: getRestrictionsState(roomId),
        });
    });

    // Cleanup restrictions on disconnect
    socket.on("disconnect", () => {
        for (const [roomId] of roomRestrictions.entries()) {
            cleanupSocket(roomId, socket.id);
        }
    });
}

module.exports = { registerModerationHandlers, isRestricted, cleanupSocket };
