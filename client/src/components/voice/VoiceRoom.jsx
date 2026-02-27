/**
 * @file VoiceRoom.jsx
 * @description Voice chat UI with owner moderation controls.
 * Shows peers with status indicators, mic/headset icons,
 * and moderation controls (kick, mute, restrict) for the room owner.
 */

import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useWebRTC } from "../../hooks/useWebRTC";
import { useSocket } from "../../hooks/useSocket";
import { useRoom } from "../../contexts/RoomContext";
import { useModeration } from "../../contexts/ModerationContext";
import PeerAudio from "./PeerAudio";

const AVATAR_COLORS = [
  "linear-gradient(135deg, #5048e5, #818cf8)",
  "linear-gradient(135deg, #10b981, #6ee7b7)",
  "linear-gradient(135deg, #f59e0b, #fbbf24)",
  "linear-gradient(135deg, #ef4444, #f87171)",
  "linear-gradient(135deg, #8b5cf6, #c084fc)",
];

const SECTIONS = ["code", "draw", "chat"];
const SECTION_ICONS = { code: "code", draw: "draw", chat: "chat" };

export default function VoiceRoom({ presence = [], isOwner = false }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { projectId } = useRoom();
  const { peers, isMuted, inVoice, joinVoice, leaveVoice, toggleMic, forceMute } = useWebRTC();
  const { kickUser, forceMuteUser, restrictUser, isUserRestricted } = useModeration();
  const [error, setError] = useState("");
  const [expandedPeer, setExpandedPeer] = useState(null);

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
    if (socket && inVoice && projectId) {
      socket.emit("voice:mute_state", { roomId: projectId, muted: isMuted });
    }
  }, [isMuted, inVoice, socket, projectId]);

  // Handle force-mute from owner — listen directly on socket
  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      if (inVoice) {
        forceMute(); // always mutes, never toggles
      }
    };
    socket.on("mod:force_muted", handler);
    return () => socket.off("mod:force_muted", handler);
  }, [socket, inVoice, forceMute]);

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

      {/* User list */}
      <div className="voice-room__peers">
        {presence.map((member, i) => {
          const isMe = member.email === myEmail;
          const displayName = (member.email || "User").split("@")[0];
          const isInVoice = isMe ? inVoice : voicePeers.has(member.socketId);
          const peerMuted = isMe ? isMuted : mutedPeers.has(member.socketId);
          const isExpanded = expandedPeer === member.socketId;

          return (
            <div key={member.socketId || i} className="voice-room__peer-wrap">
              <div
                className="voice-room__peer"
                onClick={() => !isMe && isOwner && setExpandedPeer(isExpanded ? null : member.socketId)}
                style={!isMe && isOwner ? { cursor: "pointer" } : {}}
              >
                <div
                  className="voice-room__peer-avatar"
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                >
                  {(member.email || "?")[0].toUpperCase()}
                  <span
                    className={`voice-room__peer-online ${isInVoice ? "" : "voice-room__peer-online--idle"}`}
                  />
                </div>
                <span className="voice-room__peer-name">
                  {isMe ? `${displayName} (You)` : displayName}
                </span>
                {/* Mic status */}
                {isInVoice && peerMuted && (
                  <span className="material-symbols-outlined voice-room__peer-status" title="Muted">mic_off</span>
                )}
                {isInVoice && !peerMuted && (
                  <span className="material-symbols-outlined voice-room__peer-status voice-room__peer-status--active" title="Speaking">volume_up</span>
                )}
                {!isInVoice && (
                  <span className="material-symbols-outlined voice-room__peer-status voice-room__peer-status--offline" title="Not in voice">mic_off</span>
                )}
                {/* Expand arrow for owner */}
                {!isMe && isOwner && (
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 16, color: "#64748b", marginLeft: 4, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                  >
                    expand_more
                  </span>
                )}
              </div>

              {/* Owner moderation controls — expanded */}
              {!isMe && isOwner && isExpanded && (
                <div className="voice-room__mod-controls">
                  <button
                    className="voice-room__mod-btn voice-room__mod-btn--danger"
                    onClick={() => { kickUser(member.socketId); setExpandedPeer(null); }}
                    title="Kick from room"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person_remove</span>
                    <span>Kick</span>
                  </button>

                  <button
                    className="voice-room__mod-btn"
                    onClick={() => forceMuteUser(member.socketId)}
                    title="Force mute"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>volume_off</span>
                    <span>Mute</span>
                  </button>

                  {SECTIONS.map((section) => {
                    const restricted = isUserRestricted(member.socketId, section);
                    return (
                      <button
                        key={section}
                        className={`voice-room__mod-btn ${restricted ? "voice-room__mod-btn--active" : ""}`}
                        onClick={() => restrictUser(member.socketId, section, !restricted)}
                        title={`${restricted ? "Unblock" : "Block"} ${section}`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          {restricted ? "lock" : "lock_open"}
                        </span>
                        <span>{section}</span>
                      </button>
                    );
                  })}
                </div>
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
