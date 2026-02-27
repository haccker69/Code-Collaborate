/**
 * @file DashboardPage.jsx
 * @description Lists the user's projects. Allows creating new ones (with
 * initial files/folders), and joining via invite code.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import * as projectApi from "../api/projectApi";
import * as fileApi from "../api/fileApi";

function ProjectCard({ project, onDelete }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwner = project.owner?._id === user?.id || project.owner === user?.id;
  const [copied, setCopied] = useState(false);

  // Map project languages to icons and colors
  const getIconConfig = (lang) => {
    switch (lang?.toLowerCase()) {
      case 'python': return { icon: 'database', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
      case 'javascript':
      case 'node': return { icon: 'terminal', bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' };
      case 'react':
      case 'html': return { icon: 'brush', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399' };
      default: return { icon: 'code', bg: 'rgba(80, 72, 229, 0.15)', color: '#818cf8' };
    }
  };

  const iconConfig = getIconConfig(project.defaultLanguage || project.name);

  const handleCopy = (e) => {
    e.stopPropagation();
    if (!project.inviteCode) return;
    navigator.clipboard.writeText(project.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="project-card"
      onClick={() => navigate(`/room/${project._id}`)}
      style={{
        background: "rgba(26, 29, 39, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: 16,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        position: "relative",
        cursor: "pointer",
        transition: "all 0.2s"
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.borderColor = "rgba(80, 72, 229, 0.3)";
        e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.2)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.05)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >

      {/* Top Header: Icon and Menu */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: iconConfig.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <span className="material-symbols-outlined" style={{ color: iconConfig.color, fontSize: 24 }}>
            {iconConfig.icon}
          </span>
        </div>

        {isOwner ? (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(project._id); }}
            title="Delete project"
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              padding: 4
            }}
            onMouseOver={e => e.currentTarget.style.color = "#ef4444"}
            onMouseOut={e => e.currentTarget.style.color = "#64748b"}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
          </button>
        ) : (
          <div style={{ color: "#64748b", padding: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>more_vert</span>
          </div>
        )}
      </div>

      {/* Title & Description */}
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{project.name}</h3>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {project.description || "Project files and configuration"}
        </p>
      </div>

      {/* Footer (No Avatars or Time as requested) */}
      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16 }}>
        {isOwner && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", background: "rgba(80, 72, 229, 0.2)", color: "#818cf8", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Owner</span>}
        {!isOwner && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", background: "rgba(255, 255, 255, 0.1)", color: "#cbd5e1", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Collaborator</span>}

        {isOwner && project.inviteCode && (
          <button
            onClick={handleCopy}
            title="Copy room code"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(80, 72, 229, 0.15)",
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid rgba(80, 72, 229, 0.2)",
              color: copied ? "#10b981" : "#818cf8",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(80, 72, 229, 0.25)"}
            onMouseOut={e => e.currentTarget.style.background = "rgba(80, 72, 229, 0.15)"}
          >
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em" }}>
              {copied ? 'Copied!' : 'Room Code'}
            </span>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              {copied ? 'check' : 'content_copy'}
            </span>
          </button>
        )}
      </div>

    </div>
  );
}

// ── Ignored directories/files for folder import ─────────────────────
const IGNORED_NAMES = new Set([
  "node_modules", ".git", ".svn", "dist", "build", ".next", ".cache",
  ".DS_Store", "__pycache__", ".env", ".vscode", ".idea", "coverage",
  ".parcel-cache", "venv", "env", ".output", ".nuxt", "Thumbs.db",
  ".turbo", ".vercel", ".netlify", ".sass-cache", "bower_components",
  ".hg", ".pytest_cache", ".mypy_cache", "*.pyc",
]);

// Max file size to import (500 KB) — skip large binary/media files
const MAX_FILE_SIZE = 500 * 1024;

/**
 * Recursively scans a directory handle and returns a flat list of items.
 * LAZY: Does NOT read file contents — stores FileSystemFileHandle references
 * so content can be read on-demand during project creation.
 * @param {FileSystemDirectoryHandle} dirHandle
 * @param {string} basePath — relative path prefix
 * @returns {Promise<Array<{name, type, relativePath, fileHandle?}>>}
 */
async function scanDirectoryStructure(dirHandle, basePath = "") {
  const items = [];

  for await (const [name, handle] of dirHandle.entries()) {
    if (IGNORED_NAMES.has(name)) continue;

    const relativePath = basePath ? `${basePath}/${name}` : name;

    if (handle.kind === "directory") {
      items.push({ name, type: "folder", relativePath });
      const children = await scanDirectoryStructure(handle, relativePath);
      items.push(...children);
    } else {
      // Store the handle reference — content will be read lazily during creation
      try {
        const file = await handle.getFile();
        if (file.size > MAX_FILE_SIZE) continue; // skip large/binary files
        items.push({ name, type: "file", relativePath, fileHandle: handle, fileSize: file.size });
      } catch {
        // Skip unreadable files
      }
    }
  }

  return items;
}

/**
 * Infers a programming language from a file extension.
 */
function extToLang(filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map = {
    js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript",
    ts: "typescript", tsx: "typescript",
    py: "python", java: "java", cpp: "cpp", c: "c",
    go: "go", rs: "rust", rb: "ruby", php: "php",
    html: "html", css: "css", json: "json", md: "markdown",
  };
  return map[ext] || "javascript";
}


function CreateProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: "", description: "", defaultLanguage: "javascript" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(""); // progress text during creation

  // Initial files & folders the user wants created alongside the project
  const [initialItems, setInitialItems] = useState([]);
  const [itemName, setItemName] = useState("");
  const [itemType, setItemType] = useState("file"); // "file" | "folder"

  // Imported files from device (with content and relative paths)
  const [importedItems, setImportedItems] = useState([]);
  const [importing, setImporting] = useState(false);

  const fileInputRef = useState(null);

  const addItem = () => {
    const trimmed = itemName.trim();
    if (!trimmed) return;
    if (initialItems.some((i) => i.name === trimmed && i.type === itemType)) return;
    setInitialItems((prev) => [...prev, { name: trimmed, type: itemType }]);
    setItemName("");
  };

  const removeItem = (index) => {
    setInitialItems((prev) => prev.filter((_, i) => i !== index));
  };

  const removeImportedItem = (index) => {
    setImportedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  };

  // ── Import Folder via File System Access API (LAZY) ─────────────
  const handleImportFolder = async () => {
    if (!window.showDirectoryPicker) {
      setError("Your browser doesn't support folder import. Please use Chrome or Edge.");
      return;
    }
    try {
      setImporting(true);
      setError("");
      const dirHandle = await window.showDirectoryPicker();
      const items = await scanDirectoryStructure(dirHandle);
      if (items.length === 0) {
        setError("No importable files found (all ignored or empty folder).");
      } else {
        setImportedItems((prev) => [...prev, ...items]);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setError("Failed to read folder: " + err.message);
      }
    } finally {
      setImporting(false);
    }
  };

  // ── Import Files via <input type="file"> (LAZY) ──────────────────
  const handleImportFiles = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from(e.target.files || []);
      const newItems = [];
      for (const file of files) {
        if (IGNORED_NAMES.has(file.name)) continue;
        if (file.size > MAX_FILE_SIZE) continue;
        // Store File object reference — content read lazily during creation
        newItems.push({
          name: file.name,
          type: "file",
          relativePath: file.name,
          fileRef: file,
          fileSize: file.size,
        });
      }
      if (newItems.length > 0) {
        setImportedItems((prev) => [...prev, ...newItems]);
      }
    };
    input.click();
  };

  const clearImported = () => setImportedItems([]);

  // ── Submit: create project + all files ───────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const project = await onCreate(form);
      const projectId = project._id;

      // 1. Create manually added items
      let count = 0;
      const total = initialItems.length + importedItems.length;

      for (const item of initialItems) {
        count++;
        setProgress(`Creating files… ${count}/${total}`);
        try {
          await fileApi.createFile(projectId, {
            name: item.name,
            type: item.type,
            parentId: null,
          });
        } catch {
          // Skip duplicates
        }
      }

      // 2. Create imported items — folders first (sorted by depth), then files
      // Build a map from relative folder path → created folder ID
      const folderMap = {}; // relativePath → server _id

      // Sort: folders first, then by path depth so parents are created before children
      const sortedImported = [...importedItems].sort((a, b) => {
        if (a.type === "folder" && b.type !== "folder") return -1;
        if (a.type !== "folder" && b.type === "folder") return 1;
        return a.relativePath.split("/").length - b.relativePath.split("/").length;
      });

      for (const item of sortedImported) {
        count++;
        setProgress(`Creating files… ${count}/${total}`);

        // Determine parent ID from the relative path
        const pathParts = item.relativePath.split("/");
        pathParts.pop(); // remove the item's own name
        const parentPath = pathParts.join("/");
        const parentId = parentPath ? (folderMap[parentPath] || null) : null;

        try {
          // LAZY: Read file content on-the-fly, only when we're about to create it
          let content = "";
          if (item.type === "file") {
            try {
              if (item.fileHandle) {
                // From folder import — read via FileSystemFileHandle
                const file = await item.fileHandle.getFile();
                content = await file.text();
              } else if (item.fileRef) {
                // From file import — read via File object
                content = await item.fileRef.text();
              }
            } catch {
              content = ""; // fallback to empty if read fails
            }
          }

          const created = await fileApi.createFile(projectId, {
            name: item.name,
            type: item.type,
            parentId,
            content: item.type === "file" ? content : undefined,
            language: item.type === "file" ? extToLang(item.name) : undefined,
          });

          // Track folder IDs for nested children
          if (item.type === "folder") {
            folderMap[item.relativePath] = created._id;
          }
        } catch {
          // Skip duplicates or errors
        }
      }

      setProgress("");
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create project");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const totalItems = initialItems.length + importedItems.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "85vh", overflow: "auto" }}>
        <h2>New Project</h2>
        {error && <p className="auth-error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <label>
            Name *
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required maxLength={80}
              placeholder="My awesome project"
            />
          </label>
          <label>
            Description
            <input
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              maxLength={300}
              placeholder="Optional description"
            />
          </label>
          <label>
            Language
            <select
              value={form.defaultLanguage}
              onChange={(e) => setForm((p) => ({ ...p, defaultLanguage: e.target.value }))}
            >
              {["javascript", "typescript", "python", "java", "cpp", "c", "go", "rust"].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>

          {/* ── Initial Files & Folders ──────────────────────────── */}
          <div className="modal__items-section">
            <span className="modal__items-label">Initial Files & Folders</span>
            <div className="modal__items-add">
              <select value={itemType} onChange={(e) => setItemType(e.target.value)}>
                <option value="file">📄 File</option>
                <option value="folder">📁 Folder</option>
              </select>
              <input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                onKeyDown={handleItemKeyDown}
                placeholder={itemType === "folder" ? "e.g. src" : "e.g. index.js"}
              />
              <button type="button" className="modal__items-add-btn" onClick={addItem}>
                + Add
              </button>
            </div>

            {/* ── Import from Device ───────────────────────────────── */}
            <div style={{
              display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap"
            }}>
              <button
                type="button"
                onClick={handleImportFolder}
                disabled={importing}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(80, 72, 229, 0.12)", color: "#818cf8",
                  border: "1px solid rgba(80, 72, 229, 0.25)", borderRadius: 8,
                  padding: "8px 14px", cursor: "pointer", fontSize: 13,
                  fontWeight: 600, transition: "all 0.2s",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>folder_open</span>
                {importing ? "Reading…" : "Import Folder"}
              </button>
              <button
                type="button"
                onClick={handleImportFiles}
                disabled={importing}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(16, 185, 129, 0.12)", color: "#34d399",
                  border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: 8,
                  padding: "8px 14px", cursor: "pointer", fontSize: 13,
                  fontWeight: 600, transition: "all 0.2s",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>upload_file</span>
                Import Files
              </button>
            </div>

            {/* ── Manually added items list ─────────────────────────── */}
            {initialItems.length > 0 && (
              <ul className="modal__items-list" style={{ marginTop: 12 }}>
                {initialItems.map((item, idx) => (
                  <li key={`manual-${idx}`} className="modal__items-item">
                    <span>{item.type === "folder" ? "📁" : "📄"} {item.name}</span>
                    <button type="button" onClick={() => removeItem(idx)} title="Remove">✕</button>
                  </li>
                ))}
              </ul>
            )}

            {/* ── Imported items list ──────────────────────────────── */}
            {importedItems.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: 6
                }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: "#818cf8",
                    textTransform: "uppercase", letterSpacing: "0.05em"
                  }}>
                    Imported ({importedItems.length} items)
                  </span>
                  <button
                    type="button" onClick={clearImported}
                    style={{
                      background: "none", border: "none", color: "#ef4444",
                      cursor: "pointer", fontSize: 12, fontWeight: 600,
                    }}
                  >
                    Clear All
                  </button>
                </div>
                <ul className="modal__items-list" style={{
                  maxHeight: 200, overflowY: "auto",
                }}>
                  {importedItems.map((item, idx) => (
                    <li key={`import-${idx}`} className="modal__items-item" style={{ fontSize: 12 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                        <span style={{ flexShrink: 0 }}>{item.type === "folder" ? "📁" : "📄"}</span>
                        <span style={{
                          overflow: "hidden", textOverflow: "ellipsis",
                          whiteSpace: "nowrap", color: "#cbd5e1",
                        }}>
                          {item.relativePath}
                        </span>
                      </span>
                      <button type="button" onClick={() => removeImportedItem(idx)} title="Remove" style={{ flexShrink: 0 }}>✕</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {totalItems === 0 && (
              <p className="modal__items-hint">
                A default file is created automatically. Add more files, or import from your device.
              </p>
            )}
          </div>

          {/* ── Progress bar during creation ────────────────────────── */}
          {progress && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, fontSize: 13,
              background: "rgba(80, 72, 229, 0.1)", color: "#818cf8",
              marginTop: 8, display: "flex", alignItems: "center", gap: 8,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>sync</span>
              {progress}
            </div>
          )}

          <div className="modal__actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JoinModal({ onClose, onJoin }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onJoin(code.trim());
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Invalid invite code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Join Project</h2>
        {error && <p className="auth-error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <label>
            Invite Code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. a3f9c1b2"
              required
            />
          </label>
          <div className="modal__actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={loading || !code}>
              {loading ? "Joining…" : "Join"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProjects = useCallback(async () => {
    try {
      const data = await projectApi.listProjects();
      setProjects(data);
    } catch {
      setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleCreate = async (formData) => {
    const project = await projectApi.createProject(formData);
    setProjects((prev) => [project, ...prev]);
    return project; // return so modal can use the project ID for file creation
  };

  const handleJoin = async (inviteCode) => {
    const project = await projectApi.joinProject(inviteCode);
    setProjects((prev) => {
      if (prev.some((p) => p._id === project._id)) return prev;
      return [project, ...prev];
    });
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm("Delete this project and all its files?")) return;
    try {
      await projectApi.deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p._id !== projectId));
    } catch {
      alert("Failed to delete project");
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard__header" style={{ padding: "0 40px" }}>
        <div className="dashboard__brand">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #5048e5, #e879f9)" }}>
            <span style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>⟨/⟩</span>
          </div>
          <h1 style={{ fontSize: 18, marginRight: 24, marginLeft: 8 }}>CodeCollaborate</h1>
          <div style={{
            background: "rgba(80, 72, 229, 0.1)",
            color: "#6366f1",
            padding: "4px 12px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer"
          }}>
            Dashboard
          </div>
        </div>

        <div className="dashboard__header-right" style={{ gap: 24, display: "flex", alignItems: "center" }}>

          {/* Search Bar - Moved to right */}
          <div style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 8,
            padding: "6px 12px",
            width: "240px",
            marginRight: "8px"
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#94a3b8", marginRight: 8 }}>search</span>
            <input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: "transparent", border: "none", color: "#fff", width: "100%", fontSize: 13, outline: "none" }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                title="Clear search"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
              </button>
            )}
          </div>

          <button className="room__icon-btn" title="Notifications" style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", position: "relative" }}>
            <span className="material-symbols-outlined">notifications</span>
          </button>

          <div className="dashboard__divider" style={{ height: 32 }} />

          <div className="dashboard__user" style={{ gap: 12, position: "relative" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{user?.username || "Developer"}</span>
            </div>
            <div
              className="dashboard__avatar"
              onClick={() => setModal((prev) => prev === "profile" ? null : "profile")}
              title="Profile"
              style={{ cursor: "pointer", width: 36, height: 36, background: "linear-gradient(135deg, #fcd34d, #f59e0b)", color: "#000" }}
            >
              {user?.username?.charAt(0)?.toUpperCase() || "D"}
            </div>

            {/* Profile dropdown */}
            {modal === "profile" && (
              <div
                style={{
                  position: "absolute", top: 48, right: 0, zIndex: 200,
                  background: "rgba(26, 29, 39, 0.98)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12, padding: 16, minWidth: 220,
                  boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
                  backdropFilter: "blur(16px)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* User info */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #fcd34d, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: "#000", flexShrink: 0 }}>
                    {user?.username?.charAt(0)?.toUpperCase() || "D"}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.username || "Developer"}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email || ""}</div>
                  </div>
                </div>

                {/* Logout button */}
                <button
                  onClick={() => { setModal(null); logout(); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 8, border: "none",
                    background: "transparent", color: "#f87171", cursor: "pointer",
                    fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                  }}
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
      </header>

      <main className="dashboard__main" style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>

        {/* --- Hero Section --- */}
        <div className="dashboard__hero" style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(26, 29, 39, 0.5)",
          border: "1px solid rgba(80, 72, 229, 0.15)",
          borderRadius: 16,
          padding: "48px 64px",
          marginBottom: "48px",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Subtle background glow */}
          <div style={{ position: "absolute", top: -100, left: -100, width: 400, height: 400, background: "radial-gradient(circle, rgba(80, 72, 229, 0.1) 0%, rgba(0,0,0,0) 70%)", borderRadius: "50%" }} />

          {/* Left Text Content */}
          <div style={{ flex: 1, maxWidth: "500px", zIndex: 1 }}>
            <div style={{
              display: "inline-block",
              background: "rgba(80, 72, 229, 0.15)",
              color: "#818cf8",
              padding: "4px 12px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.1em",
              marginBottom: 24,
              textTransform: "uppercase"
            }}>
              Collaborative Coding
            </div>
            <h2 style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1, marginBottom: 20, color: "#fff" }}>
              Design and code together in real-time.
            </h2>
            <p style={{ color: "#94a3b8", fontSize: 16, lineHeight: 1.6, marginBottom: 32, maxWidth: 400 }}>
              Experience the future of collaborative development with high-performance tools designed for modern teams.
            </p>

            <div style={{ display: "flex", gap: 16 }}>
              <button
                className="dashboard__btn dashboard__btn--primary"
                onClick={() => setModal("create")}
                style={{ padding: "14px 24px", fontSize: 14, borderRadius: 8, display: "flex", gap: 8, alignItems: "center" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Create New Project
              </button>

              <div style={{ display: "flex", background: "rgba(0,0,0,0.2)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)", padding: 4 }}>
                <input
                  placeholder="Enter room code"
                  style={{ background: "transparent", border: "none", color: "#fff", padding: "0 16px", outline: "none", width: 140, fontSize: 14 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target.value) {
                      handleJoin(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  id="fast-join-input"
                />
                <button
                  style={{ background: "rgba(80, 72, 229, 0.2)", color: "#818cf8", border: "none", padding: "8px 16px", borderRadius: 6, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                  onClick={() => {
                    const val = document.getElementById("fast-join-input").value;
                    if (val) handleJoin(val);
                  }}
                  onMouseOver={(e) => { e.target.style.background = "rgba(80, 72, 229, 0.4)"; e.target.style.color = "#fff" }}
                  onMouseOut={(e) => { e.target.style.background = "rgba(80, 72, 229, 0.2)"; e.target.style.color = "#818cf8" }}
                >
                  Join
                </button>
              </div>
            </div>
          </div>

          {/* Right Image/Graphic Box */}
          <div style={{ width: 400, height: 240, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, position: "relative", zIndex: 1, display: "flex", flexDirection: "column", padding: 20 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 64, height: 64, background: "rgba(80, 72, 229, 0.4)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 40px rgba(80, 72, 229, 0.3)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: "#fff" }}>code</span>
              </div>
            </div>

            {/* Fake code block in graphic */}
            <div style={{ height: 60, background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f87171" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbbf24" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399" }} />
              </div>
              <div style={{ height: 6, width: "70%", background: "rgba(80, 72, 229, 0.4)", borderRadius: 4 }} />
              <div style={{ height: 6, width: "40%", background: "rgba(80, 72, 229, 0.2)", borderRadius: 4 }} />
            </div>
          </div>
        </div>

        {/* --- Projects Section --- */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Projects</h3>
        </div>

        <div className="dashboard__grid" style={{ padding: 0 }}>
          {loading && <p>Loading projects…</p>}
          {error && <p className="auth-error">{error}</p>}
          {!loading && !error && projects.length === 0 && (
            <div style={{ gridColumn: "1/-1", display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px dashed rgba(255,255,255,0.1)" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(80, 72, 229, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <span className="material-symbols-outlined" style={{ color: "#818cf8" }}>folder_open</span>
              </div>
              <h4 style={{ color: "#fff", fontSize: 16, marginBottom: 8 }}>No projects yet</h4>
              <p style={{ color: "#94a3b8", fontSize: 14 }}>Create your first project or join an existing one.</p>
            </div>
          )}
          {(() => {
            const q = searchQuery.toLowerCase().trim();
            const filtered = q
              ? projects.filter((p) =>
                p.name?.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q) ||
                p.defaultLanguage?.toLowerCase().includes(q)
              )
              : projects;

            if (!loading && !error && projects.length > 0 && filtered.length === 0) {
              return (
                <div style={{ gridColumn: "1/-1", display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#64748b", marginBottom: 12 }}>search_off</span>
                  <h4 style={{ color: "#fff", fontSize: 16, marginBottom: 6 }}>No matching projects</h4>
                  <p style={{ color: "#94a3b8", fontSize: 13 }}>No projects match "{searchQuery}"</p>
                </div>
              );
            }

            return filtered.map((p) => (
              <ProjectCard key={p._id} project={p} onDelete={handleDelete} />
            ));
          })()}
        </div>

      </main>

      {/* --- Footer --- */}
      <footer style={{ marginTop: "auto", padding: "24px 40px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>code</span>
          © 2024 CodeCollaborate Inc.
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 12, color: "#64748b" }}>
          <span style={{ cursor: "pointer", transition: "color 0.2s" }} onMouseOver={e => e.target.style.color = "#fff"} onMouseOut={e => e.target.style.color = "#64748b"}>Terms</span>
          <span style={{ cursor: "pointer", transition: "color 0.2s" }} onMouseOver={e => e.target.style.color = "#fff"} onMouseOut={e => e.target.style.color = "#64748b"}>Privacy</span>
          <span style={{ cursor: "pointer", transition: "color 0.2s" }} onMouseOver={e => e.target.style.color = "#fff"} onMouseOut={e => e.target.style.color = "#64748b"}>Support</span>
          <span style={{ cursor: "pointer", transition: "color 0.2s" }} onMouseOver={e => e.target.style.color = "#fff"} onMouseOut={e => e.target.style.color = "#64748b"}>API</span>
        </div>
      </footer>

      {modal === "create" && (
        <CreateProjectModal onClose={() => setModal(null)} onCreate={handleCreate} />
      )}
      {modal === "join" && (
        <JoinModal onClose={() => setModal(null)} onJoin={handleJoin} />
      )}
    </div>
  );
}
