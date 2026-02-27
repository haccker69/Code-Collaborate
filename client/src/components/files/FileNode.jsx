/**
 * @file FileNode.jsx
 * @description A single node in the file tree with lazy loading support.
 * Folders fetch their children from the server only when first expanded.
 * Uses Material Symbols for expand arrows and file/folder type icons.
 */

import { useState, useRef, useEffect } from "react";
import { extToLanguage } from "../../utils/languageMap";

/** Map file extension → { icon, color class } */
function getFileIcon(name) {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js": case "jsx":
    case "ts": case "tsx":
      return { icon: "javascript", color: "#60a5fa" };      // blue
    case "css": case "scss": case "less":
      return { icon: "css", color: "#34d399" };              // emerald
    case "html": case "htm":
      return { icon: "html", color: "#fb923c" };             // orange
    case "json":
      return { icon: "data_object", color: "#fbbf24" };      // amber
    case "md": case "txt":
      return { icon: "description", color: "#fb923c" };      // orange
    case "py":
      return { icon: "code", color: "#60a5fa" };             // blue
    case "java": case "c": case "cpp": case "go":
      return { icon: "code", color: "#60a5fa" };             // blue
    default:
      return { icon: "draft", color: "rgba(148, 163, 184, 0.6)" }; // gray
  }
}

/**
 * @param {{
 *   node: object,
 *   depth: number,
 *   activeFileId: string|null,
 *   onOpen: (fileId: string, language: string, name: string) => void,
 *   onRename: (fileId: string, newName: string) => Promise<void>,
 *   onDelete: (fileId: string) => Promise<void>,
 *   onCreate: (parentId: string|null, type: "file"|"folder") => void,
 *   fetchChildren: (folderId: string) => Promise<object[]>,
 * }} props
 */
export default function FileNode({ node, depth, activeFileId, onOpen, onRename, onDelete, onCreate, fetchChildren }) {
  const [open, setOpen] = useState(false);       // folder expanded?
  const [children, setChildren] = useState(null); // null = not loaded, [] = loaded but empty
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(node.name);
  const inputRef = useRef(null);

  const isFolder = node.type === "folder";
  const isActive = node._id === activeFileId;
  const fileIcon = !isFolder ? getFileIcon(node.name) : null;

  // Focus input when rename mode activates
  useEffect(() => {
    if (renaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renaming]);

  const commitRename = async () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== node.name) {
      await onRename(node._id, trimmed);
    } else {
      setNameInput(node.name); // revert
    }
    setRenaming(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") { setNameInput(node.name); setRenaming(false); }
  };

  const handleClick = async () => {
    if (isFolder) {
      const willOpen = !open;
      setOpen(willOpen);

      // Lazy load: fetch children only on first expand
      if (willOpen && children === null) {
        setLoadingChildren(true);
        try {
          const loaded = await fetchChildren(node._id);
          setChildren(loaded);
        } catch {
          setChildren([]);
        } finally {
          setLoadingChildren(false);
        }
      }
      return;
    }
    const lang = extToLanguage(node.name);
    onOpen(node._id, lang, node.name);
  };

  const indent = depth * 24; // 24px per level to match reference pl-6

  return (
    <div className="file-node">
      {/* Row */}
      <div
        className={`file-node__row ${isActive ? "file-node__row--active" : ""}`}
        style={{ paddingLeft: indent + 8 }}
        onClick={handleClick}
      >
        {/* Expand arrow (folders) or spacer (files) */}
        {isFolder ? (
          <span className="material-symbols-outlined file-node__arrow">
            {open ? "keyboard_arrow_down" : "keyboard_arrow_right"}
          </span>
        ) : (
          <span className="file-node__arrow-spacer" />
        )}

        {/* Type icon */}
        {isFolder ? (
          <span
            className="material-symbols-outlined file-node__type-icon"
            style={{ color: "#fbbf24" }}
          >
            {open ? "folder_open" : "folder"}
          </span>
        ) : (
          <span
            className="material-symbols-outlined file-node__type-icon"
            style={{ color: fileIcon.color }}
          >
            {fileIcon.icon}
          </span>
        )}

        {/* Name — either label or rename input */}
        {renaming ? (
          <input
            ref={inputRef}
            className="file-node__rename-input"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`file-node__name ${isActive ? "file-node__name--active" : ""}`}>
            {node.name}
          </span>
        )}

        {/* Actions (shown on hover via CSS) */}
        <div className="file-node__actions" onClick={(e) => e.stopPropagation()}>
          {isFolder && (
            <>
              <button title="New file" onClick={() => onCreate(node._id, "file")}>
                <span className="material-symbols-outlined">note_add</span>
              </button>
              <button title="New folder" onClick={() => onCreate(node._id, "folder")}>
                <span className="material-symbols-outlined">create_new_folder</span>
              </button>
            </>
          )}
          <button title="Rename" onClick={() => setRenaming(true)}>
            <span className="material-symbols-outlined">edit</span>
          </button>
          <button title="Delete" onClick={() => onDelete(node._id)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      {/* Children (folders only, when open) — lazy loaded */}
      {isFolder && open && (
        <>
          {loadingChildren && (
            <div style={{ paddingLeft: indent + 32, fontSize: 11, color: "#64748b", padding: "4px 0 4px " + (indent + 32) + "px" }}>
              Loading…
            </div>
          )}
          {children && children.map((child) => (
            <FileNode
              key={child._id}
              node={child}
              depth={depth + 1}
              activeFileId={activeFileId}
              onOpen={onOpen}
              onRename={onRename}
              onDelete={onDelete}
              onCreate={onCreate}
              fetchChildren={fetchChildren}
            />
          ))}
          {children && children.length === 0 && !loadingChildren && (
            <div style={{ paddingLeft: indent + 32, fontSize: 11, color: "#64748b", fontStyle: "italic", padding: "4px 0 4px " + (indent + 32) + "px" }}>
              Empty folder
            </div>
          )}
        </>
      )}
    </div>
  );
}
