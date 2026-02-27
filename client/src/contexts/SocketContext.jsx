/**
 * @file SocketContext.jsx
 * @description Manages a single Socket.IO connection for the authenticated user.
 *
 * In dev:  connects to "" (same origin) — Vite proxy forwards /socket.io to backend.
 * In prod: set VITE_SOCKET_URL=https://yourbackend.com
 */

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { tokenStorage } from "../utils/tokenStorage";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user || !tokenStorage.exists()) return;

    // In dev, VITE_SOCKET_URL is not set → connects to "" (same origin via Vite proxy)
    // In prod, VITE_SOCKET_URL=https://yourbackend.com
    const socketUrl = import.meta.env.VITE_SOCKET_URL || "";

    const socket = io(socketUrl, {
      auth: { token: tokenStorage.get() },
      transports: ["polling", "websocket"], // start with polling, upgrade to WS
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      // When socketUrl is "", Socket.IO uses the current page's origin
      path: "/socket.io",
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (err) => console.error("[socket] Connect error:", err.message));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used inside <SocketProvider>");
  return ctx;
}
