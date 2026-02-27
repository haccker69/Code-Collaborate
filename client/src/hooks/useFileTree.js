/**
 * @file useFileTree.js
 * @description Loads root-level files from server and supports lazy loading
 * of folder children on-demand. Exposes helpers for CRUD operations.
 */

import { useState, useEffect, useCallback } from "react";
import * as fileApi from "../api/fileApi";
import { webcontainerInstance } from "../utils/webcontainerManager";

// Find absolute file path for WebContainers from a flat array
const getFilePath = (fileId, flat) => {
  if (!fileId || flat.length === 0) return null;
  let current = flat.find((f) => f._id === fileId);
  if (!current) return null;

  const parts = [current.name];
  while (current.parentId) {
    current = flat.find((f) => f._id === current.parentId);
    if (current) parts.unshift(current.name);
    else break;
  }
  return parts.join("/");
};

/**
 * @param {string} projectId
 */
export function useFileTree(projectId) {
  // flat holds every node we've loaded so far (root + expanded children)
  const [flat, setFlat] = useState([]);
  // rootItems holds only root-level nodes
  const [rootItems, setRootItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const files = await fileApi.getFileTree(projectId);
      setRootItems(files);
      setFlat(files);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load file tree");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  /**
   * Fetch children of a folder (lazy load).
   * Called by FileNode when a folder is expanded for the first time.
   * @param {string} folderId
   * @returns {Promise<object[]>} The children nodes
   */
  const fetchChildren = useCallback(async (folderId) => {
    try {
      const children = await fileApi.getChildren(projectId, folderId);
      // Add children to flat list (avoiding duplicates)
      setFlat((prev) => {
        const existingIds = new Set(prev.map((f) => f._id));
        const newItems = children.filter((c) => !existingIds.has(c._id));
        return [...prev, ...newItems];
      });
      return children;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load folder contents");
      throw err;
    }
  }, [projectId]);

  /**
   * @param {{ name: string, type: "file"|"folder", parentId?: string, language?: string }} data
   */
  const createNode = async (data) => {
    try {
      const file = await fileApi.createFile(projectId, data);
      setFlat((prev) => {
        const newFlat = [...prev, file];
        if (webcontainerInstance) {
          const path = getFilePath(file._id, newFlat);
          if (path) {
            if (file.type === "folder") {
              webcontainerInstance.fs.mkdir(path, { recursive: true }).catch((err) => console.error("WC mkdir err:", err));
            } else {
              webcontainerInstance.fs.writeFile(path, "").catch((err) => console.error("WC writeFile err:", err));
            }
          }
        }
        return newFlat;
      });
      // If the new item is a root-level item, also update rootItems
      if (!data.parentId) {
        setRootItems((prev) => [...prev, file]);
      }
      setError("");
      return file;
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to create item";
      setError(msg);
      throw err;
    }
  };

  /**
   * @param {string} fileId
   * @param {string} newName
   */
  const renameNode = async (fileId, newName) => {
    const oldPath = getFilePath(fileId, flat);
    const updated = await fileApi.renameFile(fileId, newName);

    const updateName = (list) => list.map((f) => (f._id === fileId ? { ...f, name: updated.name } : f));

    setFlat((prev) => {
      const newFlat = updateName(prev);
      if (webcontainerInstance && oldPath) {
        const newPath = getFilePath(fileId, newFlat);
        if (newPath) {
          try {
            webcontainerInstance.fs.rename(oldPath, newPath).catch(err => console.log('WC rename err', err));
          } catch (e) { }
        }
      }
      return newFlat;
    });
    setRootItems(updateName);
  };

  /**
   * @param {string} fileId
   */
  const deleteNode = async (fileId) => {
    const path = getFilePath(fileId, flat);
    await fileApi.deleteFile(fileId);

    // Remove this node AND all its nested descendants from flat
    const toRemove = new Set([fileId]);
    let added;
    do {
      added = false;
      flat.forEach((f) => {
        if (f.parentId && toRemove.has(f.parentId) && !toRemove.has(f._id)) {
          toRemove.add(f._id);
          added = true;
        }
      });
    } while (added);

    setFlat((prev) => {
      if (webcontainerInstance && path) {
        webcontainerInstance.fs.rm(path, { recursive: true }).catch(err => console.warn('WC rm err', err));
      }
      return prev.filter((f) => !toRemove.has(f._id));
    });

    setRootItems((prev) => prev.filter((f) => !toRemove.has(f._id)));

    return Array.from(toRemove);
  };

  return {
    flat,
    tree: rootItems,
    loading,
    error,
    createNode,
    renameNode,
    deleteNode,
    fetchChildren,
    refresh,
  };
}
