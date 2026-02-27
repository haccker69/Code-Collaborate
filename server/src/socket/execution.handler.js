/**
 * @file execution.handler.js
 * @description Relays code execution events (stdin, output) across
 * all users in a room so everyone sees the same input/output.
 *
 * Events:
 *   exec:stdin_update  — stdin content changed   { roomId, stdin }
 *   exec:run           — execution started       { roomId }
 *   exec:result        — execution finished      { roomId, result }
 */

"use strict";

/**
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
function registerExecutionHandlers(io, socket) {

    /** User updated stdin — broadcast to other users in the room */
    socket.on("exec:stdin_update", ({ roomId, stdin }) => {
        if (!roomId) return;
        socket.to(roomId).emit("exec:stdin_update", { stdin });
    });

    /** User clicked Run — notify others that execution started */
    socket.on("exec:run", ({ roomId }) => {
        if (!roomId) return;
        socket.to(roomId).emit("exec:run", { triggeredBy: socket.user.email });
    });

    /** Execution finished — broadcast result to all others */
    socket.on("exec:result", ({ roomId, result }) => {
        if (!roomId) return;
        socket.to(roomId).emit("exec:result", { result });
    });
}

module.exports = { registerExecutionHandlers };
