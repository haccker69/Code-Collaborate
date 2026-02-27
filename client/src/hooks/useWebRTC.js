/**
 * @file useWebRTC.js
 * @description Manages WebRTC peer connections for voice chat.
 *
 * For each remote peer we maintain one RTCPeerConnection.
 * Signaling is relayed through Socket.IO (offer / answer / ICE).
 * Audio flows peer-to-peer once the connection is established.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useSocket } from "./useSocket";
import { useRoom } from "../contexts/RoomContext";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

export function useWebRTC() {
  const { socket } = useSocket();
  const { projectId } = useRoom();

  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [inVoice, setInVoice] = useState(false);
  const [peers, setPeers] = useState([]);

  const peerConns = useRef(new Map()); // socketId → RTCPeerConnection

  // ── Helpers ──────────────────────────────────────────────────────

  const addOrUpdatePeer = (socketId, stream) => {
    setPeers((prev) => {
      const without = prev.filter((p) => p.socketId !== socketId);
      return [...without, { socketId, stream }];
    });
  };

  const removePeer = useCallback((socketId) => {
    peerConns.current.get(socketId)?.close();
    peerConns.current.delete(socketId);
    setPeers((prev) => prev.filter((p) => p.socketId !== socketId));
  }, []);

  const createPeerConnection = useCallback(
    (remoteSocketId, stream) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          socket.emit("voice:ice_candidate", { to: remoteSocketId, candidate });
        }
      };

      pc.ontrack = ({ streams }) => {
        if (streams[0]) addOrUpdatePeer(remoteSocketId, streams[0]);
      };

      pc.onconnectionstatechange = () => {
        if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
          removePeer(remoteSocketId);
        }
      };

      peerConns.current.set(remoteSocketId, pc);
      return pc;
    },
    [socket, removePeer]
  );

  // ── Signaling listeners ──────────────────────────────────────────

  useEffect(() => {
    if (!socket || !localStream) return;

    // We just joined — server sends us the list of existing peers
    const onPeers = async ({ peers: existingPeers }) => {
      for (const peerId of existingPeers) {
        const pc = createPeerConnection(peerId, localStream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("voice:offer", { to: peerId, offer, roomId: projectId });
      }
    };

    // Incoming offer from a peer who just joined
    const onOffer = async ({ from, offer }) => {
      const pc = createPeerConnection(from, localStream);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("voice:answer", { to: from, answer });
    };

    // Answer to our offer
    const onAnswer = async ({ from, answer }) => {
      const pc = peerConns.current.get(from);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    // ICE candidate from any peer
    const onIceCandidate = async ({ from, candidate }) => {
      const pc = peerConns.current.get(from);
      if (pc) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
        catch (err) { console.warn("[voice] ICE candidate error:", err.message); }
      }
    };

    const onPeerLeft = ({ socketId }) => removePeer(socketId);

    socket.on("voice:peers", onPeers);
    socket.on("voice:offer", onOffer);
    socket.on("voice:answer", onAnswer);
    socket.on("voice:ice_candidate", onIceCandidate);
    socket.on("voice:peer_left", onPeerLeft);

    return () => {
      socket.off("voice:peers", onPeers);
      socket.off("voice:offer", onOffer);
      socket.off("voice:answer", onAnswer);
      socket.off("voice:ice_candidate", onIceCandidate);
      socket.off("voice:peer_left", onPeerLeft);
    };
  }, [socket, localStream, projectId, createPeerConnection, removePeer]);

  // ── Public API ───────────────────────────────────────────────────

  const joinVoice = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setLocalStream(stream);
      setInVoice(true);
      socket?.emit("voice:join", { roomId: projectId });
    } catch (err) {
      console.error("[voice] Mic access denied:", err.message);
      throw err;
    }
  }, [socket, projectId]);

  const leaveVoice = useCallback(() => {
    socket?.emit("voice:leave", { roomId: projectId });
    peerConns.current.forEach((pc) => pc.close());
    peerConns.current.clear();
    setPeers([]);
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setInVoice(false);
    setIsMuted(false);
  }, [socket, projectId, localStream]);

  const toggleMic = useCallback(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted((m) => !m);
  }, [localStream]);

  /** Force mute — always mutes, never toggles */
  const forceMute = useCallback(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => { t.enabled = false; });
    setIsMuted(true);
  }, [localStream]);

  // Cleanup on unmount
  useEffect(() => () => leaveVoice(), []); // eslint-disable-line

  return { peers, localStream, isMuted, inVoice, joinVoice, leaveVoice, toggleMic, forceMute };
}
