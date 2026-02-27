/**
 * @file RoomContext.jsx
 * @description Room-level state shared across all panels in the workspace.
 * Handles joining/leaving the socket room and tracking presence.
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "./SocketContext";

const RoomContext = createContext(null);

/**
 * @param {{ projectId: string, children: React.ReactNode }} props
 */
export function RoomProvider({ projectId, children }) {
  const { socket, connected } = useSocket();
  const navigate = useNavigate();

  const [presence, setPresence] = useState([]);   // [{socketId, userId, email}]
  const [activeFileId, setActiveFileId] = useState(null); // currently open file in editor
  const [openFiles, setOpenFiles] = useState([]);   // [{id, name}] — open file tabs
  const [language, setLanguage] = useState("javascript");
  const [projectFiles, setProjectFiles] = useState([]); // Flat array of all files for path resolution

  // ── Join / leave room via Socket.IO ───────────────────────────────
  useEffect(() => {
    if (!socket || !connected || !projectId) return;

    socket.emit("room:join", { roomId: projectId });

    socket.on("room:presence", (users) => setPresence(users));
    socket.on("room:user_joined", (user) =>
      setPresence((prev) => {
        if (prev.some((u) => u.socketId === user.socketId)) return prev;
        return [...prev, user];
      })
    );
    socket.on("room:user_left", ({ socketId }) =>
      setPresence((prev) => prev.filter((u) => u.socketId !== socketId))
    );

    // Handle room full — redirect to dashboard
    socket.on("room:full", ({ max }) => {
      alert(`This room is full (max ${max} users). Redirecting to dashboard.`);
      navigate("/dashboard");
    });

    return () => {
      socket.emit("room:leave", { roomId: projectId });
      socket.off("room:presence");
      socket.off("room:user_joined");
      socket.off("room:user_left");
      socket.off("room:full");
    };
  }, [socket, connected, projectId, navigate]);

  /**
   * Opens a file in the editor panel and adds it to the tab bar.
   * @param {string} fileId
   * @param {string} [lang]
   * @param {string} [fileName]
   */
  const openFile = useCallback((fileId, lang, fileName) => {
    setActiveFileId(fileId);
    if (lang) setLanguage(lang);
    setOpenFiles((prev) => {
      if (prev.some((f) => f.id === fileId)) return prev;
      return [...prev, { id: fileId, name: fileName || "untitled" }];
    });
  }, []);

  /**
   * Closes a file tab. If the closed file was active, switch to a neighbor.
   * @param {string} fileId
   */
  const closeFile = useCallback((fileId) => {
    setOpenFiles((prev) => {
      const idx = prev.findIndex((f) => f.id === fileId);
      const next = prev.filter((f) => f.id !== fileId);
      // If we're closing the active file, select a neighbor
      setActiveFileId((currentId) => {
        if (currentId !== fileId) return currentId;
        if (next.length === 0) return null;
        return next[Math.min(idx, next.length - 1)]?.id || null;
      });
      return next;
    });
  }, []);

  return (
    <RoomContext.Provider
      value={{
        presence,
        activeFileId,
        openFiles,
        language,
        setLanguage,
        openFile,
        closeFile,
        projectId,
        projectFiles,
        setProjectFiles,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}

/**
 * @returns {{
        *   presence: object[],
        *   activeFileId: string | null,
        *   language: string,
        *   setLanguage: Function,
        *   openFile: Function,
        *   projectId: string,
        * }}
      */
export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used inside <RoomProvider>");
  return ctx;
}
