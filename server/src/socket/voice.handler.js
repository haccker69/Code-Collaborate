/**
 * @file voice.handler.js
 * @description WebRTC signaling server for voice chat.
 *
 * The server is a pure relay — it never touches audio data.
 * All media flows peer-to-peer directly between browsers.
 *
 * Signaling flow:
 *   A joins  → server sends voice:peers (existing peers list)
 *            → A sends voice:offer to each
 *   B exists → B sends voice:answer back to A
 *   Both     → exchange voice:ice_candidate until connected
 *   Leaves   → voice:peer_left so peers clean up
 */

"use strict";

/**
 * roomId → Set<socketId> — tracks who is in voice per room
 * @type {Map<string, Set<string>>}
 */
const voiceRooms = new Map();

/**
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
function registerVoiceHandlers(io, socket) {

  /** voice:join — user enters the voice channel. Payload: { roomId } */
  socket.on("voice:join", ({ roomId }) => {
    if (!roomId) return;

    if (!voiceRooms.has(roomId)) voiceRooms.set(roomId, new Set());
    const room = voiceRooms.get(roomId);

    // Tell the joiner who is already in voice
    const existingPeers = [...room].filter((id) => id !== socket.id);
    socket.emit("voice:peers", { peers: existingPeers });

    room.add(socket.id);
    socket._voiceRoomId = roomId;

    // Notify others
    socket.to(roomId).emit("voice:peer_joined", {
      socketId: socket.id,
      email:    socket.user.email,
    });

    console.log(`[voice] ${socket.user.email} joined voice in ${roomId}`);
  });

  /** voice:leave — user exits the voice channel. Payload: { roomId } */
  socket.on("voice:leave", ({ roomId }) => leaveVoice(io, socket, roomId));

  /** voice:offer — relay RTCSessionDescription offer. Payload: { to, offer } */
  socket.on("voice:offer", ({ to, offer }) => {
    if (!to || !offer) return;
    io.to(to).emit("voice:offer", { from: socket.id, email: socket.user.email, offer });
  });

  /** voice:answer — relay RTCSessionDescription answer. Payload: { to, answer } */
  socket.on("voice:answer", ({ to, answer }) => {
    if (!to || !answer) return;
    io.to(to).emit("voice:answer", { from: socket.id, answer });
  });

  /** voice:ice_candidate — relay ICE candidate. Payload: { to, candidate } */
  socket.on("voice:ice_candidate", ({ to, candidate }) => {
    if (!to || !candidate) return;
    io.to(to).emit("voice:ice_candidate", { from: socket.id, candidate });
  });

  /** voice:mute_state — broadcast mute status. Payload: { roomId, muted } */
  socket.on("voice:mute_state", ({ roomId, muted }) => {
    if (!roomId) return;
    socket.to(roomId).emit("voice:mute_state", { socketId: socket.id, muted });
  });

  // Cleanup on disconnect
  socket.on("disconnect", () => {
    if (socket._voiceRoomId) leaveVoice(io, socket, socket._voiceRoomId);
  });
}

function leaveVoice(io, socket, roomId) {
  const room = voiceRooms.get(roomId);
  if (room) {
    room.delete(socket.id);
    if (room.size === 0) voiceRooms.delete(roomId);
  }
  io.to(roomId).emit("voice:peer_left", { socketId: socket.id });
  socket._voiceRoomId = null;
  console.log(`[voice] ${socket.user.email} left voice in ${roomId}`);
}

module.exports = { registerVoiceHandlers };
