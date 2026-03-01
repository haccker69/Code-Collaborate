/**
 * @file FileTree.jsx
 * @description Renders the project file tree matching the reference IDE design.
 * Uses Material Symbols icons, "EXPLORER" header with action buttons.
 */

import { useState, useEffect, useCallback } from "react";
import { useRoom } from "../../contexts/RoomContext";
import { useFileTree } from "../../hooks/useFileTree";
import { exportProject } from "../../api/fileApi";
import FileNode from "./FileNode";

/**
 * @param {{ projectId: string }} props
 */
export default function FileTree({ projectId }) {
  const { activeFileId, openFile, closeFile, setProjectFiles } = useRoom();
  const { flat, tree, loading, error, createNode, renameNode, deleteNode, fetchChildren } =
    useFileTree(projectId);

  // Sync flat file list to RoomContext for path resolution in the editor
  useEffect(() => {
    setProjectFiles(flat);
  }, [flat, setProjectFiles]);

  // "new item" form state: null | { parentId, type }
  const [newItem, setNewItem] = useState(null);
  const [newName, setNewName] = useState("");
  const [downloading, setDownloading] = useState(false);

  const handleOpen = (fileId, language, fileName) => openFile(fileId, language, fileName);

  const handleCreate = (parentId, type) => {
    setNewItem({ parentId, type });
    setNewName("");
  };

  const commitCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await createNode({ name: newName.trim(), type: newItem.type, parentId: newItem.parentId });
      setNewItem(null);
    } catch {
      // Error is set by useFileTree — keep the form open so user can fix
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm("Delete this item? Folders delete all contents.")) return;
    const removedIds = await deleteNode(fileId);
    if (removedIds && removedIds.length > 0) {
      removedIds.forEach(id => closeFile(id));
    }
  };

  /**
   * Download all project files as a .zip using JSZip (loaded from CDN).
   */
  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const files = await exportProject(projectId);
      if (!files || files.length === 0) {
        alert("No files to download.");
        return;
      }

      // Build a lookup map: id → file
      const idMap = {};
      for (const f of files) {
        idMap[f._id] = f;
      }

      // Reconstruct full path for each file by walking the parentId chain
      const getPath = (file) => {
        const parts = [file.name];
        let current = file;
        while (current.parentId && idMap[current.parentId]) {
          current = idMap[current.parentId];
          parts.unshift(current.name);
        }
        return parts.join("/");
      };

      // Dynamically load JSZip from CDN (avoids adding dependency)
      if (!window.JSZip) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const zip = new window.JSZip();

      for (const file of files) {
        if (file.type === "file") {
          zip.file(getPath(file), file.content || "");
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `project-${projectId.slice(-6)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[download] Failed:", err);
      alert("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }, [projectId]);

  return (
    <div className="file-tree">
      {/* Header */}
      <div className="file-tree__header">
        <span>Explorer</span>
        <div className="file-tree__header-actions">
          <button
            className="file-tree__icon-btn"
            onClick={() => handleCreate(null, "file")}
            title="New file"
          >
            <span className="material-symbols-outlined">note_add</span>
          </button>
          <button
            className="file-tree__icon-btn"
            onClick={() => handleCreate(null, "folder")}
            title="New folder"
          >
            <span className="material-symbols-outlined">create_new_folder</span>
          </button>
          <button
            className="file-tree__icon-btn"
            onClick={handleDownload}
            title="Download project as ZIP"
            disabled={downloading}
          >
            <span className="material-symbols-outlined">
              {downloading ? "hourglass_top" : "download"}
            </span>
          </button>
          <button
            className="file-tree__icon-btn"
            onClick={() => window.location.reload()}
            title="Refresh"
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>
      </div>

      {/* Status */}
      {loading && <p className="file-tree__status">Loading…</p>}
      {error && <p className="file-tree__status file-tree__status--err">{error}</p>}

      {/* New item input */}
      {newItem && (
        <form className="file-tree__new-form" onSubmit={commitCreate}>
          <input
            autoFocus
            placeholder={newItem.type === "folder" ? "Folder name…" : "File name (e.g. index.js)…"}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setNewItem(null)}
          />
          <button type="submit">✓</button>
          <button type="button" onClick={() => setNewItem(null)}>✕</button>
        </form>
      )}

      {/* Tree */}
      <div className="file-tree__nodes">
        {tree.map((node) => (
          <FileNode
            key={node._id}
            node={node}
            depth={0}
            activeFileId={activeFileId}
            onOpen={handleOpen}
            onRename={renameNode}
            onDelete={handleDelete}
            onCreate={handleCreate}
            fetchChildren={fetchChildren}
          />
        ))}
      </div>
    </div>
  );
}
