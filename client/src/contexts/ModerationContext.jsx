/**
 * @file ModerationContext.jsx
 * @description Provides room moderation state and actions.
 * Listens for mod:state, mod:kicked, mod:force_muted, mod:restricted from server.
 * Exposes isRestricted(), kickUser(), restrictUser(), forceMuteUser() for owner.
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSocket } from "./SocketContext";
import { useNavigate } from "react-router-dom";

const ModerationContext = createContext(null);

export function ModerationProvider({ projectId, children }) {
    const { socket } = useSocket();
    const navigate = useNavigate();

    // restrictions: { [socketId]: ["code", "draw", ...] }
    const [restrictions, setRestrictions] = useState({});

    useEffect(() => {
        if (!socket) return;

        // Request current moderation state
        socket.emit("mod:get_state", { roomId: projectId });

        const onState = ({ restrictions: r }) => {
            setRestrictions(r || {});
        };

        const onKicked = () => {
            alert("You have been removed from this room by the owner.");
            navigate("/dashboard");
        };

        const onForceMuted = () => {
            // Handled directly by VoiceRoom via socket listener
        };

        const onRestricted = ({ section, restricted }) => {
            // Update local restrictions immediately for snappy UI
            setRestrictions((prev) => {
                const mySocketId = socket.id;
                const current = prev[mySocketId] ? [...prev[mySocketId]] : [];
                if (restricted && !current.includes(section)) {
                    return { ...prev, [mySocketId]: [...current, section] };
                }
                if (!restricted) {
                    return { ...prev, [mySocketId]: current.filter((s) => s !== section) };
                }
                return prev;
            });
        };

        socket.on("mod:state", onState);
        socket.on("mod:kicked", onKicked);
        socket.on("mod:force_muted", onForceMuted);
        socket.on("mod:restricted", onRestricted);

        return () => {
            socket.off("mod:state", onState);
            socket.off("mod:kicked", onKicked);
            socket.off("mod:force_muted", onForceMuted);
            socket.off("mod:restricted", onRestricted);
        };
    }, [socket, projectId, navigate]);

    /**
     * Check if the current user is restricted from a section.
     * @param {string} section - "code" | "draw" | "chat" | "execute"
     * @returns {boolean}
     */
    const isRestricted = useCallback(
        (section) => {
            if (!socket) return false;
            const myRestrictions = restrictions[socket.id];
            return myRestrictions ? myRestrictions.includes(section) : false;
        },
        [socket, restrictions]
    );

    /**
     * Check if a specific socketId is restricted from a section.
     */
    const isUserRestricted = useCallback(
        (socketId, section) => {
            const userRestrictions = restrictions[socketId];
            return userRestrictions ? userRestrictions.includes(section) : false;
        },
        [restrictions]
    );

    // ── Owner actions ──────────────────────────────────────────────────

    const kickUser = useCallback(
        (targetSocketId) => {
            socket?.emit("mod:kick", { roomId: projectId, targetSocketId });
        },
        [socket, projectId]
    );

    const forceMuteUser = useCallback(
        (targetSocketId) => {
            socket?.emit("mod:force_mute", { roomId: projectId, targetSocketId });
        },
        [socket, projectId]
    );

    const restrictUser = useCallback(
        (targetSocketId, section, restricted) => {
            socket?.emit("mod:restrict", {
                roomId: projectId,
                targetSocketId,
                section,
                restricted,
            });
        },
        [socket, projectId]
    );

    return (
        <ModerationContext.Provider
            value={{
                restrictions,
                isRestricted,
                isUserRestricted,
                kickUser,
                forceMuteUser,
                restrictUser,
            }}
        >
            {children}
        </ModerationContext.Provider>
    );
}

export function useModeration() {
    const ctx = useContext(ModerationContext);
    if (!ctx) throw new Error("useModeration must be used inside <ModerationProvider>");
    return ctx;
}
