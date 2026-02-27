/**
 * @file CursorLayer.jsx
 * @description Renders a floating label for each remote user's cursor position.
 * Positioned absolutely over the Monaco editor container.
 *
 * Monaco doesn't expose pixel positions for arbitrary line/column combos easily,
 * so we use Monaco's `getScrolledVisiblePosition` API via the editorRef.
 * If the position is off-screen, the label is hidden.
 */

import { useEffect, useState } from "react";

/**
 * @param {{
 *   cursors: Array<{ socketId: string, email: string, cursor: { lineNumber: number, column: number } }>,
 *   editorRef: React.MutableRefObject,
 * }} props
 */
export default function CursorLayer({ cursors, editorRef }) {
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    const editor = editorRef?.current;
    if (!editor || cursors.length === 0) { setPositions([]); return; }

    const computed = cursors
      .map(({ socketId, email, cursor }) => {
        // getScrolledVisiblePosition returns pixel coords or null if off-screen
        const pos = editor.getScrolledVisiblePosition({
          lineNumber: cursor.lineNumber,
          column: cursor.column,
        });
        if (!pos) return null;
        return { socketId, email, top: pos.top, left: pos.left };
      })
      .filter(Boolean);

    setPositions(computed);
  }, [cursors, editorRef]);

  if (positions.length === 0) return null;

  return (
    <div className="cursor-layer" aria-hidden="true">
      {positions.map(({ socketId, email, top, left }) => (
        <div
          key={socketId}
          className="cursor-layer__label"
          style={{ top: top - 12, left }}
        >
          {email.split("@")[0]}
        </div>
      ))}
    </div>
  );
}
