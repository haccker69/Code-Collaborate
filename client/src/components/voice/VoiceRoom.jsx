/**
 * @file VoiceRoom.jsx
 * @description Voice chat UI matching reference design.
 * Shows "Voice Chat" header with mic/headset icons,
 * connected peers with gradient avatars and status indicators.
 */

import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useWebRTC } from "../../hooks/useWebRTC";
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
  const { peers, isMuted, inVoice, joinVoice, leaveVoice, toggleMic } = useWebRTC();
  const [error, setError] = useState("");

  const handleJoin = async () => {
    setError("");
    try {
      await joinVoice();
    } catch {
      setError("Microphone access was denied.");
    }
  };

  // Current user's email for comparison
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

          return (
            <div key={member.socketId || i} className="voice-room__peer">
              <div
                className="voice-room__peer-avatar"
                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
              >
                {(member.email || "?")[0].toUpperCase()}
                {/* Green online dot */}
                <span className="voice-room__peer-online" />
              </div>
              <span className="voice-room__peer-name">
                {isMe ? `${displayName} (You)` : displayName}
              </span>
              {/* Mic status icons */}
              {isMe && inVoice && isMuted && (
                <span className="material-symbols-outlined voice-room__peer-status" title="Muted">mic_off</span>
              )}
              {isMe && inVoice && !isMuted && (
                <span className="material-symbols-outlined voice-room__peer-status voice-room__peer-status--active" title="Speaking">volume_up</span>
              )}
              {!isMe && (
                <span className="material-symbols-outlined voice-room__peer-status">mic_off</span>
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
