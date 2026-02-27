/**
 * @file TeamChat.jsx
 * @description Real-time team chat for the collaboration panel.
 * Messages are ephemeral — they exist only while connected.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "../../contexts/SocketContext";
import { useRoom } from "../../contexts/RoomContext";
import { useAuth } from "../../contexts/AuthContext";

export default function TeamChat() {
    const { socket } = useSocket();
    const { projectId } = useRoom();
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const listRef = useRef(null);

    // Load chat history on mount + listen for incoming messages
    useEffect(() => {
        if (!socket) return;

        // Request saved messages from server
        socket.emit("chat:history", { roomId: projectId });

        const onHistory = (history) => {
            setMessages(history);
        };

        const onMessage = (msg) => {
            setMessages((prev) => [...prev, msg]);
        };

        socket.on("chat:history", onHistory);
        socket.on("chat:message", onMessage);
        return () => {
            socket.off("chat:history", onHistory);
            socket.off("chat:message", onMessage);
        };
    }, [socket, projectId]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = useCallback(() => {
        if (!input.trim() || !socket) return;
        socket.emit("chat:send", { roomId: projectId, text: input.trim() });
        setInput("");
    }, [input, socket, projectId]);

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Format timestamp
    const formatTime = (iso) => {
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    // Get initials from email
    const getInitial = (email) => (email || "?")[0].toUpperCase();

    return (
        <div className="team-chat">
            <div className="team-chat__header">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat</span>
                <span>Team Chat</span>
            </div>

            <div className="team-chat__messages" ref={listRef}>
                {messages.length === 0 && (
                    <div className="team-chat__empty">No messages yet. Say hello! 👋</div>
                )}
                {messages.map((msg) => {
                    const isOwn = msg.sender === user?.email;
                    return (
                        <div key={msg.id} className={`team-chat__msg ${isOwn ? "team-chat__msg--own" : ""}`}>
                            <div className="team-chat__msg-header">
                                <strong className="team-chat__msg-sender">
                                    {isOwn ? "You" : msg.sender?.split("@")[0]}
                                </strong>
                                <span className="team-chat__msg-time">{formatTime(msg.timestamp)}</span>
                            </div>
                            <div className="team-chat__msg-text">{msg.text}</div>
                        </div>
                    );
                })}
            </div>

            <div className="team-chat__input-row">
                <input
                    type="text"
                    className="team-chat__input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message…"
                />
                <button
                    className="team-chat__send"
                    onClick={handleSend}
                    disabled={!input.trim()}
                >
                    <span className="material-symbols-outlined">send</span>
                </button>
            </div>
        </div>
    );
}
