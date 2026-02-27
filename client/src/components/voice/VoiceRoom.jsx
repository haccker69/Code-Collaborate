/**
 * @file VoiceRoom.jsx
 * @description Voice chat UI matching reference design.
 * Shows "Voice Chat" header with mic/headset icons,
 * connected peers with gradient avatars and status indicators.
 */

import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useWebRTC } from "../../hooks/useWebRTC";
import { useSocket } from "../../hooks/useSocket";
import PeerAudio from "./PeerAudio";

const AVATAR_COLORS = [
  "linear-gradient(135deg, #5048e5, #818cf8)",
  "linear-gradient(135deg, #10b981, #6ee7b7)",
  "linear-gradient(135deg, #f59e0b, #fbbf24)",
  "linear-gradient(135deg, #ef4444, #f87171)",
  "linear-gradient(135deg, #8b5cf6, #c084fc)",
];

export default function VoiceRoom({ presence = [] }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { peers, isMuted, inVoice, joinVoice, leaveVoice, toggleMic } = useWebRTC();
  const [error, setError] = useState("");

  // Track which socketIds are in voice chat and their mute state
  const [voicePeers, setVoicePeers] = useState(new Set());
  const [mutedPeers, setMutedPeers] = useState(new Set());

  useEffect(() => {
    if (!socket) return;

    const onPeerJoined = ({ socketId }) => {
      setVoicePeers((prev) => new Set([...prev, socketId]));
    };

    const onPeerLeft = ({ socketId }) => {
      setVoicePeers((prev) => {
        const next = new Set(prev);
        next.delete(socketId);
        return next;
      });
      setMutedPeers((prev) => {
        const next = new Set(prev);
        next.delete(socketId);
        return next;
      });
    };

    const onMuteState = ({ socketId, muted }) => {
      setMutedPeers((prev) => {
        const next = new Set(prev);
        if (muted) next.add(socketId);
        else next.delete(socketId);
        return next;
      });
    };

    socket.on("voice:peer_joined", onPeerJoined);
    socket.on("voice:peer_left", onPeerLeft);
    socket.on("voice:mute_state", onMuteState);

    return () => {
      socket.off("voice:peer_joined", onPeerJoined);
      socket.off("voice:peer_left", onPeerLeft);
      socket.off("voice:mute_state", onMuteState);
    };
  }, [socket]);

  // Broadcast own mute state when it changes
  useEffect(() => {
    if (socket && inVoice) {
      socket.emit("voice:mute_state", { roomId: presence[0]?.roomId, muted: isMuted });
    }
  }, [isMuted, inVoice, socket]);

  const handleJoin = async () => {
    setError("");
    try {
      await joinVoice();
    } catch {
      setError("Microphone access was denied.");
    }
  };

  const myEmail = user?.email || "";

  return (
    <div className="voice-room">
      {/* Voice Chat header with controls */}
      <div className="voice-room__header">
        <div className="voice-room__title">
          <span className="material-symbols-outlined voice-room__title-icon">mic</span>
          <span>Voice Chat</span>
        </div>
        <div className="voice-room__header-actions">
          {inVoice ? (
            <>
              <button
                className={`voice-room__action-btn ${isMuted ? "voice-room__action-btn--muted" : ""}`}
                onClick={toggleMic}
                title={isMuted ? "Unmute" : "Mute"}
              >
                <span className="material-symbols-outlined">
                  {isMuted ? "mic_off" : "mic"}
                </span>
              </button>
              <button
                className="voice-room__action-btn"
                onClick={leaveVoice}
                title="Leave voice"
              >
                <span className="material-symbols-outlined">headset_off</span>
              </button>
            </>
          ) : (
            <button
              className="voice-room__action-btn voice-room__action-btn--join"
              onClick={handleJoin}
              title="Join voice chat"
            >
              <span className="material-symbols-outlined">headset_mic</span>
            </button>
          )}
        </div>
      </div>

      {error && <p className="voice-room__error">{error}</p>}

      {/* User list — always show presence */}
      <div className="voice-room__peers">
        {presence.map((member, i) => {
          const isMe = member.email === myEmail;
          const displayName = (member.email || "User").split("@")[0];
          const isInVoice = isMe ? inVoice : voicePeers.has(member.socketId);
          const peerMuted = isMe ? isMuted : mutedPeers.has(member.socketId);

          return (
            <div key={member.socketId || i} className="voice-room__peer">
              <div
                className="voice-room__peer-avatar"
                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
              >
                {(member.email || "?")[0].toUpperCase()}
                {/* Green dot = in voice, gray dot = just in room (online) */}
                <span
                  className={`voice-room__peer-online ${isInVoice ? "" : "voice-room__peer-online--idle"}`}
                />
              </div>
              <span className="voice-room__peer-name">
                {isMe ? `${displayName} (You)` : displayName}
              </span>
              {/* Mic status icons */}
              {isInVoice && peerMuted && (
                <span className="material-symbols-outlined voice-room__peer-status" title="Muted">mic_off</span>
              )}
              {isInVoice && !peerMuted && (
                <span className="material-symbols-outlined voice-room__peer-status voice-room__peer-status--active" title="Speaking">volume_up</span>
              )}
              {!isInVoice && (
                <span className="material-symbols-outlined voice-room__peer-status voice-room__peer-status--offline" title="Not in voice">mic_off</span>
              )}
            </div>
          );
        })}

        {/* Render audio elements for remote peers */}
        {inVoice && peers.map(({ socketId, stream }) => (
          <PeerAudio key={socketId} stream={stream} />
        ))}
      </div>
    </div>
  );
}

