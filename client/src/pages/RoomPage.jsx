/**
 * @file RoomPage.jsx
 * @description Main collaboration workspace — redesigned to match reference.
 * Layout:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  Logo  ProjectName   [Code] [Drawing Board]   ▶RUN  👤 Share│
 *   ├────────────┬─────────────────────────┬───────────────────────┤
 *   │  FileTree  │  File tabs              │  COLLABORATION        │
 *   │  (sidebar) │  Editor / DrawBoard     │  Voice Chat           │
 *   │            │                         │  Team Chat            │
 *   └────────────┴─────────────────────────┴───────────────────────┘
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { RoomProvider, useRoom } from "../contexts/RoomContext";
import { ModerationProvider } from "../contexts/ModerationContext";
import { useAuth } from "../contexts/AuthContext";

import FileTree from "../components/files/FileTree";
import CodeEditor from "../components/editor/CodeEditor";
import DrawBoard from "../components/drawing/DrawBoard";
import VoiceRoom from "../components/voice/VoiceRoom";
import TeamChat from "../components/chat/TeamChat";
import PresenceBar from "../components/common/PresenceBar";
import ResizeHandle from "../components/common/ResizeHandle";
import Split from "@uiw/react-split";

import * as projectApi from "../api/projectApi";
import * as fileApi from "../api/fileApi";
import { extToLanguage } from "../utils/languageMap";
import { useSocket } from "../contexts/SocketContext";

const TABS = { CODE: "code", DRAW: "draw" };

// Width constraints (px)
const SIDEBAR_MIN = 120;
const SIDEBAR_MAX = 500;
const COLLAB_MIN = 200;
const COLLAB_MAX = 400;

// ── Inner workspace ──────────────────────────────────────────────────

function Workspace({ projectId, activeTab, project }) {
  const { activeFileId, openFiles, language, openFile, closeFile } = useRoom();
  const { socket } = useSocket();

  // Per-file content cache: { [fileId]: string }
  const [fileContents, setFileContents] = useState({});
  const [loadingFiles, setLoadingFiles] = useState(new Set());

  // Global Terminal state (shared across room)
  const [activeOutputTab, setActiveOutputTab] = useState("output");
  const [execResult, setExecResult] = useState(null);
  const [execLoading, setExecLoading] = useState(false);
  const [stdinInput, setStdinInput] = useState("");

  // Local execution events — broadcast to room via socket
  useEffect(() => {
    const handleRunClicked = () => {
      window.dispatchEvent(new CustomEvent("collabdev:execute_code", { detail: { stdin: stdinInput } }));
    };
    const handleStart = () => {
      setExecResult(null);
      setExecLoading(true);
      setActiveOutputTab("output");
      // Broadcast to other users
      socket?.emit("exec:run", { roomId: projectId });
    };
    const handleFinish = (e) => {
      setExecLoading(false);
      setExecResult(e.detail);
      // Broadcast result to other users
      socket?.emit("exec:result", { roomId: projectId, result: e.detail });
    };

    window.addEventListener("collabdev:run", handleRunClicked);
    window.addEventListener("collabdev:execution_start", handleStart);
    window.addEventListener("collabdev:execution_finish", handleFinish);

    return () => {
      window.removeEventListener("collabdev:run", handleRunClicked);
      window.removeEventListener("collabdev:execution_start", handleStart);
      window.removeEventListener("collabdev:execution_finish", handleFinish);
    };
  }, [stdinInput, socket, projectId]);

  // Listen for shared execution events from other users
  useEffect(() => {
    if (!socket) return;

    const onStdinUpdate = ({ stdin }) => {
      setStdinInput(stdin);
    };
    const onRun = () => {
      setExecResult(null);
      setExecLoading(true);
      setActiveOutputTab("output");
    };
    const onResult = ({ result }) => {
      setExecLoading(false);
      setExecResult(result);
    };

    socket.on("exec:stdin_update", onStdinUpdate);
    socket.on("exec:run", onRun);
    socket.on("exec:result", onResult);

    return () => {
      socket.off("exec:stdin_update", onStdinUpdate);
      socket.off("exec:run", onRun);
      socket.off("exec:result", onResult);
    };
  }, [socket]);

  // Resizable panel widths
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [collabWidth, setCollabWidth] = useState(288);

  const handleSidebarResize = useCallback(
    (delta) => setSidebarWidth((w) => Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w + delta))),
    []
  );

  const handleCollabResize = useCallback(
    (delta) => setCollabWidth((w) => Math.min(COLLAB_MAX, Math.max(COLLAB_MIN, w - delta))),
    []
  );

  // Fetch file content when a new file is opened (only if not already cached)
  useEffect(() => {
    if (!activeFileId) return;
    if (fileContents.hasOwnProperty(activeFileId)) return; // already cached

    setLoadingFiles((prev) => new Set(prev).add(activeFileId));
    fileApi.getFile(activeFileId)
      .then((file) => {
        setFileContents((prev) => ({ ...prev, [activeFileId]: file.content || "" }));
      })
      .catch((err) => console.error("[room] Failed to load file:", err.message))
      .finally(() => {
        setLoadingFiles((prev) => {
          const next = new Set(prev);
          next.delete(activeFileId);
          return next;
        });
      });
  }, [activeFileId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up cache when a file tab is closed
  const handleCloseFile = useCallback((fileId) => {
    closeFile(fileId);
    setFileContents((prev) => {
      const next = { ...prev };
      delete next[fileId];
      return next;
    });
  }, [closeFile]);

  const isActiveFileLoading = activeFileId && loadingFiles.has(activeFileId);

  return (
    <div className="workspace">
      {/* File tree sidebar */}
      <aside className="workspace__sidebar" style={{ width: sidebarWidth }}>
        <FileTree projectId={projectId} />
      </aside>

      {/* Drag handle: sidebar ↔ main */}
      <ResizeHandle direction="horizontal" onResize={handleSidebarResize} />

      {/* Main content area */}
      <div className="workspace__main">
        <Split mode="vertical" style={{ height: "100%", width: "100%" }} visiable={true} lineBar={true}>
          {/* Top Pane: Views */}
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
            {activeTab === TABS.CODE && (
              <>
                {/* File tabs */}
                {openFiles.length > 0 && (
                  <div className="file-tabs">
                    {openFiles.map((f) => (
                      <div
                        key={f.id}
                        className={`file-tabs__tab ${f.id === activeFileId ? "file-tabs__tab--active" : ""}`}
                        onClick={() => openFile(f.id, extToLanguage(f.name), f.name)}
                      >
                        <span className="file-tabs__name">{f.name}</span>
                        <button
                          className="file-tabs__close"
                          onClick={(e) => { e.stopPropagation(); handleCloseFile(f.id); }}
                          title="Close tab"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Editor panels — keep them mounted so state isn't lost */}
                <div className="workspace__panel" style={{ position: "relative", flex: 1 }}>
                  {openFiles.length === 0 && (
                    <div className="workspace__empty">Select a file to start editing.</div>
                  )}
                  {isActiveFileLoading && (
                    <div className="workspace__empty">Loading file…</div>
                  )}
                  {openFiles.map((file) => {
                    const hasContent = fileContents.hasOwnProperty(file.id);
                    if (!hasContent) return null; // don't mount editor until content is fetched
                    return (
                      <div
                        key={file.id}
                        style={{
                          display: file.id === activeFileId ? "block" : "none",
                          height: "100%",
                          width: "100%",
                          position: "absolute",
                          top: 0,
                          left: 0
                        }}
                      >
                        <CodeEditor
                          fileId={file.id}
                          activeFileId={activeFileId}
                          initialContent={fileContents[file.id]}
                          language={file.id === activeFileId ? language : "javascript"}
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {activeTab === TABS.DRAW && (
              <div className="workspace__panel" style={{ flex: 1, position: "relative" }}>
                <DrawBoard />
              </div>
            )}
          </div>

          {/* Bottom Pane: Terminal / Output */}
          {activeTab === TABS.CODE && (
            <div style={{ height: "300px", minHeight: "150px", display: "flex", flexDirection: "column" }}>
              <div className="bottom-panel" style={{ flex: 1, borderTop: "none" }}>
                <div className="bottom-panel__tabs">
                  <button
                    className={`bottom-panel__tab ${activeOutputTab === "output" ? "bottom-panel__tab--active" : ""}`}
                    onClick={() => setActiveOutputTab("output")}
                  >
                    Output
                  </button>
                  <button
                    className={`bottom-panel__tab ${activeOutputTab === "input" ? "bottom-panel__tab--active" : ""}`}
                    onClick={() => setActiveOutputTab("input")}
                  >
                    Input
                  </button>
                </div>

                <div className="bottom-panel__content">
                  {activeOutputTab === "output" ? (
                    <div className="bottom-panel__terminal">
                      {/* Show execution results if any */}
                      {execResult ? (
                        <div className="terminal-output">
                          {execResult.stdout && (
                            <div className="terminal-output__stdout">{execResult.stdout}</div>
                          )}
                          {execResult.stderr && (
                            <div className="terminal-output__stderr">{execResult.stderr}</div>
                          )}
                          {!execResult.stdout && !execResult.stderr && (
                            <div className="terminal-output__info">Program exited with no output.</div>
                          )}
                        </div>
                      ) : execLoading ? (
                        <div className="terminal-output__info">
                          <span className="terminal-cursor-blink">▌</span> Running…
                        </div>
                      ) : (
                        <div className="terminal-output__info">Ready to run code...</div>
                      )}
                    </div>
                  ) : null}

                  {activeOutputTab === "input" && (
                    <div className="bottom-panel__input-area">
                      <div className="bottom-panel__input-header">
                        <span>Standard Input (stdin)</span>
                        <button className="bottom-panel__input-clear" onClick={() => setStdinInput("")} title="Clear">Clear</button>
                      </div>
                      <textarea
                        className="bottom-panel__textarea"
                        value={stdinInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStdinInput(val);
                          socket?.emit("exec:stdin_update", { roomId: projectId, stdin: val });
                        }}
                        placeholder="Enter input for your program here"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Split>
      </div>

      {/* Drag handle: main ↔ collab */}
      <ResizeHandle direction="horizontal" onResize={handleCollabResize} />

      {/* Collaboration panel */}
      <aside className="workspace__collab" style={{ width: collabWidth }}>
        <CollaborationPanel project={project} />
      </aside>
    </div>
  );
}

// ── Collaboration panel ──────────────────────────────────────────────

function CollaborationPanel({ project }) {
  const { presence } = useRoom();
  const { user } = useAuth();
  const isOwner = project?.owner?._id === user?.id || project?.owner === user?.id;

  return (
    <div className="collab-panel">
      <div className="collab-panel__header">
        <span>Collaboration</span>
        <span className="collab-panel__badge">{presence.length} Online</span>
      </div>

      {/* Voice Chat section */}
      <div className="collab-panel__section">
        <VoiceRoom presence={presence} isOwner={isOwner} />
      </div>

      {/* Divider */}
      <div className="collab-panel__divider" />

      {/* Team Chat section */}
      <div className="collab-panel__section collab-panel__section--chat">
        <TeamChat />
      </div>
    </div>
  );
}

// ── Page shell ───────────────────────────────────────────────────────

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(TABS.CODE);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    projectApi.getProject(roomId)
      .then(setProject)
      .catch(() => setError("Project not found or access denied"))
      .finally(() => setLoading(false));
  }, [roomId]);

  const handleCopyInvite = () => {
    if (!project?.inviteCode) return;
    navigator.clipboard.writeText(project.inviteCode).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    });
  };

  if (loading) return <div className="room-loading">Loading project…</div>;
  if (error) return (
    <div className="room-error">
      <p>{error}</p>
      <button onClick={() => navigate("/dashboard")}>← Back to Dashboard</button>
    </div>
  );

  return (
    <RoomProvider projectId={roomId}>
      <ModerationProvider projectId={roomId}>
        <div className="room">
          {/* Mobile warning — visible only on small screens via CSS */}
          <div className="mobile-warning">
            <span className="material-symbols-outlined">laptop_mac</span>
            For the best experience, use a desktop or laptop.
          </div>

          {/* Top bar */}
          <header className="room__header">
            {/* Left — Brand + Project */}
            <div className="room__brand">
              <span className="material-symbols-outlined room__brand-icon" onClick={() => navigate("/dashboard")} title="Back to dashboard">terminal</span>
              <h1 className="room__brand-name" onClick={() => navigate("/dashboard")}>CodeCollaborate</h1>
              <div className="room__brand-divider" />
              <div className="room__project-info">
                <span className="room__project-label">Project:</span>
                <span className="room__project-name">{project?.name}</span>
              </div>
            </div>

            {/* Center — Tab pills */}
            <div className="room__nav-wrapper">
              <nav className="room__nav">
                <button
                  className={`room__nav-tab ${activeTab === TABS.CODE ? "room__nav-tab--active" : ""}`}
                  onClick={() => setActiveTab(TABS.CODE)}
                >
                  <span className="material-symbols-outlined room__nav-tab-icon">edit</span>
                  Code
                </button>

                <button
                  className={`room__nav-tab ${activeTab === TABS.DRAW ? "room__nav-tab--active" : ""}`}
                  onClick={() => setActiveTab(TABS.DRAW)}
                >
                  <span className="material-symbols-outlined room__nav-tab-icon">draw</span>
                  Drawing Board
                </button>
              </nav>
            </div>

            {/* Right — Actions */}
            <div className="room__actions">
              <div className="room__brand-divider" />
              <button
                className="room__run-btn"
                title="Run code"
                onClick={() => {
                  // Trigger run on the active editor
                  const event = new CustomEvent('collabdev:run');
                  window.dispatchEvent(event);
                }}
              >
                <span className="material-symbols-outlined room__run-icon">play_arrow</span>
                RUN
              </button>
              <div className="room__actions-right">
                <div style={{ position: "relative" }}>
                  <div
                    className="room__user-avatar"
                    onClick={() => setShowProfileMenu((v) => !v)}
                    title={user?.username || "Profile"}
                    style={{ background: "linear-gradient(135deg, #fcd34d, #f59e0b)", color: "#000", width: 36, height: 36 }}
                  >
                    {(user?.username || "U")[0].toUpperCase()}
                  </div>

                  {/* Profile dropdown */}
                  {showProfileMenu && (
                    <div
                      style={{
                        position: "absolute", top: 44, right: 0, zIndex: 200,
                        background: "rgba(26, 29, 39, 0.98)", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12, padding: 16, minWidth: 220,
                        boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
                        backdropFilter: "blur(16px)",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #fcd34d, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: "#000", flexShrink: 0 }}>
                          {(user?.username || "U")[0].toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.username || "Developer"}</div>
                          <div style={{ fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email || ""}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => { setShowProfileMenu(false); navigate("/"); }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all 0.15s", marginBottom: 4 }}
                        onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                        onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>dashboard</span>
                        Dashboard
                      </button>
                      <button
                        onClick={() => { setShowProfileMenu(false); logout(); }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent", color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.15s" }}
                        onMouseOver={(e) => e.currentTarget.style.background = "rgba(248, 113, 113, 0.1)"}
                        onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Main workspace */}
          <Workspace projectId={roomId} activeTab={activeTab} project={project} />

          {/* Status bar */}
          <footer className="room__statusbar">
            <div className="room__statusbar-left">
              <span>☁ Synced</span>
              <span>⎇ main</span>
            </div>
            <div className="room__statusbar-right">
              <span>Spaces: 2</span>
              <span>UTF-8</span>
            </div>
          </footer>
        </div>
      </ModerationProvider>
    </RoomProvider>
  );
}
