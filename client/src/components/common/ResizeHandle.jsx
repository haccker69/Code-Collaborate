/**
 * @file ResizeHandle.jsx
 * @description A draggable divider that resizes adjacent panels.
 *
 * Usage:
 *   <ResizeHandle direction="horizontal" onResize={(delta) => ...} />
 *
 * direction:
 *   "horizontal" → divider is a vertical bar, dragging left/right
 *   "vertical"   → divider is a horizontal bar, dragging up/down
 */

import { useCallback, useRef } from "react";

export default function ResizeHandle({ direction = "horizontal", onResize }) {
    const startPos = useRef(0);

    const handlePointerDown = useCallback(
        (e) => {
            e.preventDefault();
            startPos.current =
                direction === "horizontal" ? e.clientX : e.clientY;

            const handlePointerMove = (moveEvent) => {
                const current =
                    direction === "horizontal" ? moveEvent.clientX : moveEvent.clientY;
                const delta = current - startPos.current;
                startPos.current = current;
                onResize(delta);
            };

            const handlePointerUp = () => {
                document.removeEventListener("pointermove", handlePointerMove);
                document.removeEventListener("pointerup", handlePointerUp);
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
            };

            document.addEventListener("pointermove", handlePointerMove);
            document.addEventListener("pointerup", handlePointerUp);
            document.body.style.cursor =
                direction === "horizontal" ? "col-resize" : "row-resize";
            document.body.style.userSelect = "none";
        },
        [direction, onResize]
    );

    const className =
        direction === "horizontal"
            ? "resize-handle resize-handle--horizontal"
            : "resize-handle resize-handle--vertical";

    return (
        <div className={className} onPointerDown={handlePointerDown}>
            <div className="resize-handle__grip" />
        </div>
    );
}
