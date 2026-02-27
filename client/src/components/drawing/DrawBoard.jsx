/**
 * @file DrawBoard.jsx
 * @description Real-time collaborative drawing board using Canvas API + Yjs CRDT.
 *
 * Tools: pen, eraser
 * Features: undo, clear, live preview
 *
 * All strokes are stored in a Yjs Y.Array for conflict-free collaboration.
 * Live preview still uses socket.io for real-time dot-by-dot rendering.
 */

import { useRef, useEffect, useState, useCallback } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useSocket } from "../../hooks/useSocket";
import { useRoom } from "../../contexts/RoomContext";
import { useModeration } from "../../contexts/ModerationContext";
import Toolbar from "./Toolbar";

const TOOLS = { PEN: "pen", ERASER: "eraser" };
const YJS_WS_URL = (import.meta.env.VITE_SOCKET_URL || "http://localhost:5002").replace(/^http/, "ws") + "/yjs";

export default function DrawBoard() {
  const canvasRef = useRef(null);
  const { socket } = useSocket();
  const { projectId } = useRoom();
  const { isRestricted } = useModeration();
  const drawRestricted = isRestricted("draw");

  // Drawing state refs
  const isDrawing = useRef(false);
  const lastPoint = useRef(null);
  const strokePoints = useRef([]);

  // Per-remote-socket last point for live preview
  const remoteLastPt = useRef({});

  // Yjs refs
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const ystrokesRef = useRef(null);

  // Tool state
  const [tool, setTool] = useState(TOOLS.PEN);
  const [color, setColor] = useState("#ffffff");
  const [width, setWidth] = useState(3);

  // ── Canvas helpers ─────────────────────────────────────────────────

  const getCtx = () => canvasRef.current?.getContext("2d");

  const drawSegment = useCallback((from, to, strokeColor, strokeWidth, isEraser = false) => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);

    if (isEraser) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = strokeWidth;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
  }, []);

  const replayStroke = useCallback(({ points, color: c, width: w, tool: t }) => {
    if (points.length < 2) return;
    const eraser = t === TOOLS.ERASER;
    for (let i = 1; i < points.length; i++) {
      drawSegment(points[i - 1], points[i], c, w, eraser);
    }
  }, [drawSegment]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    getCtx()?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const redrawAll = useCallback((strokes) => {
    clearCanvas();
    strokes.forEach(replayStroke);
  }, [clearCanvas, replayStroke]);

  // ── Yjs CRDT setup ────────────────────────────────────────────────

  useEffect(() => {
    if (!projectId) return;

    const ydoc = new Y.Doc();
    const roomName = `draw-${projectId}`;
    const provider = new WebsocketProvider(YJS_WS_URL, roomName, ydoc);
    const ystrokes = ydoc.getArray("strokes");

    ydocRef.current = ydoc;
    providerRef.current = provider;
    ystrokesRef.current = ystrokes;

    // When synced, redraw all existing strokes
    provider.on("sync", (synced) => {
      if (synced) {
        redrawAll(ystrokes.toArray());
      }
    });

    // Observe changes to the stroke array (remote adds/deletes)
    const observer = () => {
      redrawAll(ystrokes.toArray());
    };
    ystrokes.observe(observer);

    return () => {
      ystrokes.unobserve(observer);
      provider.destroy();
      ydoc.destroy();
    };
  }, [projectId, redrawAll]);

  // ── Live preview via socket.io (dot-by-dot, not stored) ───────────

  useEffect(() => {
    if (!socket || !projectId) return;

    const onPreview = ({ point, color: c, width: w, tool: t, socketId }) => {
      if (socketId === socket.id) return;
      const prev = remoteLastPt.current[socketId];
      if (prev) drawSegment(prev, point, c, w, t === TOOLS.ERASER);
      remoteLastPt.current[socketId] = point;
    };

    const onPreviewEnd = ({ socketId }) => {
      delete remoteLastPt.current[socketId];
    };

    socket.on("draw:preview", onPreview);
    socket.on("draw:preview_end", onPreviewEnd);

    return () => {
      socket.off("draw:preview", onPreview);
      socket.off("draw:preview_end", onPreviewEnd);
    };
  }, [socket, projectId, drawSegment]);

  // ── Resize handler ────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(() => {
      const ctx = canvas.getContext("2d");
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.putImageData(img, 0, 0);
    });

    observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, []);

  // ── Pointer event handlers ─────────────────────────────────────────

  const getPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e) => {
    isDrawing.current = true;
    strokePoints.current = [];
    const point = getPoint(e);
    lastPoint.current = point;
    strokePoints.current.push(point);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing.current) return;
    const point = getPoint(e);
    const isEraser = tool === TOOLS.ERASER;

    drawSegment(lastPoint.current, point, color, width, isEraser);

    // Live preview via socket (ephemeral, not stored in Yjs)
    socket?.emit("draw:preview", { roomId: projectId, point, color, width, tool });

    lastPoint.current = point;
    strokePoints.current.push(point);
  };

  const handlePointerUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (strokePoints.current.length > 1 && ystrokesRef.current) {
      const stroke = {
        points: strokePoints.current,
        color,
        width,
        tool,
      };
      // Push to Yjs — automatically synced to all peers
      ystrokesRef.current.push([stroke]);
    }

    socket?.emit("draw:preview_end", { roomId: projectId });

    strokePoints.current = [];
    lastPoint.current = null;
  };

  const handleClear = () => {
    if (!ystrokesRef.current) return;
    // Delete all strokes from Yjs array
    ystrokesRef.current.delete(0, ystrokesRef.current.length);
  };

  const handleUndo = () => {
    if (!ystrokesRef.current || ystrokesRef.current.length === 0) return;
    // Delete the last stroke from Yjs array
    ystrokesRef.current.delete(ystrokesRef.current.length - 1, 1);
  };

  return (
    <div className="draw-board" style={{ position: "relative" }}>
      <Toolbar
        tool={tool}
        color={color}
        width={width}
        onToolChange={setTool}
        onColorChange={setColor}
        onWidthChange={setWidth}
        onClear={handleClear}
        onUndo={handleUndo}
      />
      <canvas
        ref={canvasRef}
        className="draw-board__canvas"
        onPointerDown={drawRestricted ? undefined : handlePointerDown}
        onPointerMove={drawRestricted ? undefined : handlePointerMove}
        onPointerUp={drawRestricted ? undefined : handlePointerUp}
        onPointerLeave={drawRestricted ? undefined : handlePointerUp}
        style={{ cursor: drawRestricted ? "not-allowed" : tool === TOOLS.ERASER ? "cell" : "crosshair" }}
      />
      {drawRestricted && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.3)", zIndex: 10, pointerEvents: "none"
        }}>
          <div style={{ background: "rgba(239,68,68,0.9)", color: "#fff", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock</span>
            Drawing restricted by room owner
          </div>
        </div>
      )}
    </div>
  );
}
