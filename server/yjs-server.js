/**
 * @file yjs-server.js
 * @description Yjs WebSocket server for CRDT-based collaboration.
 * Runs alongside the main Express server on a separate port.
 *
 * Each collaborative document is identified by a room name:
 *   - Code files: "code-{projectId}-{fileId}"
 *   - Drawing boards: "draw-{projectId}"
 */

"use strict";

require("dotenv").config();

const http = require("http");
const { WebSocketServer } = require("ws");
const { setupWSConnection } = require("y-websocket/bin/utils");

const PORT = process.env.YJS_PORT || 1234;

const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Yjs WebSocket Server");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
    setupWSConnection(ws, req);
});

server.listen(PORT, () => {
    console.log(`[yjs] WebSocket server listening on ws://localhost:${PORT}`);
});
