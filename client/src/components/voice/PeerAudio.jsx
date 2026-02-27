/**
 * @file PeerAudio.jsx
 * @description Renders an <audio> element for a remote peer's MediaStream.
 * Must be autoPlay — there is no user interaction to trigger play().
 *
 * @param {{ stream: MediaStream }} props
 */

import { useEffect, useRef } from "react";

export default function PeerAudio({ stream }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  // Hidden element — audio only, no controls needed
  return <audio ref={audioRef} autoPlay playsInline style={{ display: "none" }} />;
}
