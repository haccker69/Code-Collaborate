/**
 * @file PresenceBar.jsx
 * @description Shows avatar bubbles for each user currently in the room.
 */

import { useRoom } from "../../contexts/RoomContext";

export default function PresenceBar() {
  const { presence } = useRoom();

  if (presence.length === 0) return null;

  return (
    <div className="presence-bar" title="Users in this room">
      {presence.map(({ socketId, email }) => (
        <div
          key={socketId}
          className="presence-bar__avatar"
          title={email}
        >
          {email[0].toUpperCase()}
        </div>
      ))}
    </div>
  );
}
