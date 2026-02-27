/**
 * @file file.controller.js
 */

"use strict";

const fileService = require("../services/file.service");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

/** GET /api/projects/:projectId/files */
const getFileTree = asyncHandler(async (req, res) => {
  const files = await fileService.getFileTree(req.params.projectId, req.user.id);
  res.json({ success: true, data: { files } });
});

/** GET /api/projects/:projectId/files/:folderId/children */
const getChildren = asyncHandler(async (req, res) => {
  const children = await fileService.getChildren(req.params.folderId, req.params.projectId, req.user.id);
  res.json({ success: true, data: { files: children } });
});

/** GET /api/files/:id */
const getFile = asyncHandler(async (req, res) => {
  const file = await fileService.getFile(req.params.id, req.user.id);
  res.json({ success: true, data: { file } });
});

/** POST /api/projects/:projectId/files */
const createFile = asyncHandler(async (req, res) => {
  const { name, type, parentId, language, content } = req.body;
  if (!name) throw ApiError.badRequest("name is required");
  if (!type || !["file", "folder"].includes(type)) {
    throw ApiError.badRequest("type must be 'file' or 'folder'");
  }

  const file = await fileService.createFile(
    { projectId: req.params.projectId, name, type, parentId, language, content },
    req.user.id
  );
  res.status(201).json({ success: true, data: { file } });
});

/** PATCH /api/files/:id/rename */
const renameFile = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) throw ApiError.badRequest("name is required");

  const file = await fileService.renameFile(req.params.id, name, req.user.id);
  res.json({ success: true, data: { file } });
});

/** PATCH /api/files/:id/content */
const saveContent = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (content === undefined) throw ApiError.badRequest("content is required");

  await fileService.saveContent(req.params.id, content, req.user.id);
  res.json({ success: true, message: "Saved" });
});

/** DELETE /api/files/:id */
const deleteFile = asyncHandler(async (req, res) => {
  await fileService.deleteFile(req.params.id, req.user.id);
  res.json({ success: true, message: "Deleted" });
});

/** GET /api/projects/:projectId/export */
const exportProject = asyncHandler(async (req, res) => {
  const files = await fileService.exportProject(req.params.projectId, req.user.id);
  res.json({ success: true, data: { files } });
});

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
