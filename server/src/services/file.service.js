/**
 * @file file.service.js
 * @description File and folder CRUD within a project.
 * All operations verify project access before touching files.
 */

"use strict";

const File = require("../models/File");
const Project = require("../models/Project");
const ApiError = require("../utils/ApiError");

/**
 * Verifies the user has access to the project.
 * @param {string} projectId
 * @param {string} userId
 */
async function assertProjectAccess(projectId, userId) {
  const project = await Project.findById(projectId).lean();
  if (!project) throw ApiError.notFound("Project not found");

  const isOwner = project.owner.toString() === userId;
  const isMember = project.members.some((m) => m.user.toString() === userId);
  if (!isOwner && !isMember) throw ApiError.notFound("Project not found");
}

/**
 * Returns the full flat list of files/folders for a project,
 * suitable for client-side tree reconstruction.
 * @param {string} projectId
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function getFileTree(projectId, userId) {
  await assertProjectAccess(projectId, userId);

  // Return only root-level nodes (parentId: null) for lazy loading
  // Client fetches children on-demand when a folder is expanded
  return File.find({ project: projectId, parentId: null })
    .select("-content")
    .sort({ type: -1, name: 1 }) // folders first, then files alphabetically
    .lean();
}

/**
 * Returns the direct children of a folder.
 * Used for lazy tree loading — children are fetched on-demand.
 * @param {string} folderId
 * @param {string} projectId
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function getChildren(folderId, projectId, userId) {
  await assertProjectAccess(projectId, userId);

  return File.find({ project: projectId, parentId: folderId })
    .select("-content")
    .sort({ type: -1, name: 1 })
    .lean();
}

/**
 * Gets a single file including its content.
 * @param {string} fileId
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getFile(fileId, userId) {
  const file = await File.findById(fileId).lean();
  if (!file) throw ApiError.notFound("File not found");
  await assertProjectAccess(file.project.toString(), userId);
  return file;
}

/**
 * Creates a file or folder inside a project.
 * @param {{ projectId: string, name: string, type: "file"|"folder", parentId?: string, language?: string }} data
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function createFile(data, userId) {
  const { projectId, name, type, parentId = null, language = "javascript", content = "" } = data;

  await assertProjectAccess(projectId, userId);

  // If parentId is provided, verify it belongs to the same project
  if (parentId) {
    const parent = await File.findOne({ _id: parentId, project: projectId });
    if (!parent || parent.type !== "folder") {
      throw ApiError.badRequest("Parent folder not found");
    }
  }

  const file = await File.create({
    project: projectId,
    name,
    type,
    parentId,
    language: type === "file" ? language : undefined,
    content: type === "file" ? content : "",
    lastEditedBy: userId,
  });

  return file;
}

/**
 * Renames a file or folder.
 * @param {string} fileId
 * @param {string} newName
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function renameFile(fileId, newName, userId) {
  const file = await File.findById(fileId);
  if (!file) throw ApiError.notFound("File not found");
  await assertProjectAccess(file.project.toString(), userId);

  file.name = newName;
  file.lastEditedBy = userId;
  await file.save();
  return file;
}

/**
 * Saves file content (called on debounced autosave from the editor).
 * @param {string} fileId
 * @param {string} content
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function saveContent(fileId, content, userId) {
  const file = await File.findById(fileId);
  if (!file) throw ApiError.notFound("File not found");
  if (file.type !== "file") throw ApiError.badRequest("Cannot save content to a folder");

  await assertProjectAccess(file.project.toString(), userId);

  file.content = content;
  file.lastEditedBy = userId;
  await file.save();
}

/**
 * Deletes a file, or a folder and all its descendants.
 * @param {string} fileId
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function deleteFile(fileId, userId) {
  const file = await File.findById(fileId);
  if (!file) throw ApiError.notFound("File not found");
  await assertProjectAccess(file.project.toString(), userId);

  if (file.type === "folder") {
    // Recursively collect all descendant IDs and delete them
    const descendants = await collectDescendants(fileId, file.project.toString());
    await File.deleteMany({ _id: { $in: [...descendants, fileId] } });
  } else {
    await file.deleteOne();
  }
}

/**
 * Recursively collects all descendant file IDs of a folder.
 * @param {string} folderId
 * @param {string} projectId
 * @returns {Promise<string[]>}
 */
async function collectDescendants(folderId, projectId) {
  const children = await File.find({ project: projectId, parentId: folderId }).lean();
  let ids = children.map((c) => c._id.toString());

  for (const child of children) {
    if (child.type === "folder") {
      const nested = await collectDescendants(child._id.toString(), projectId);
      ids = ids.concat(nested);
    }
  }

  return ids;
}

/**
 * Returns the full flat list of files/folders WITH content.
 * @param {string} projectId
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function exportProject(projectId, userId) {
  await assertProjectAccess(projectId, userId);

  // Return all nodes with content
  return File.find({ project: projectId })
    .sort({ type: -1, name: 1 }) // folders first, then files alphabetically
    .lean();
}

module.exports = {
  getFileTree,
  getChildren,
  getFile,
  createFile,
  renameFile,
  saveContent,
  deleteFile,
  exportProject,
};
