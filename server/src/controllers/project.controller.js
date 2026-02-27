/**
 * @file project.controller.js
 */

"use strict";

const projectService = require("../services/project.service");
const asyncHandler   = require("../utils/asyncHandler");
const ApiError       = require("../utils/ApiError");

/** POST /api/projects */
const createProject = asyncHandler(async (req, res) => {
  const { name, description, defaultLanguage } = req.body;
  if (!name) throw ApiError.badRequest("Project name is required");

  const project = await projectService.createProject(
    { name, description, defaultLanguage },
    req.user.id
  );
  res.status(201).json({ success: true, data: { project } });
});

/** GET /api/projects */
const listProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.listProjects(req.user.id);
  res.json({ success: true, data: { projects } });
});

/** GET /api/projects/:id */
const getProject = asyncHandler(async (req, res) => {
  const project = await projectService.getProject(req.params.id, req.user.id);
  res.json({ success: true, data: { project } });
});

/** PATCH /api/projects/:id */
const updateProject = asyncHandler(async (req, res) => {
  const project = await projectService.updateProject(
    req.params.id,
    req.user.id,
    req.body
  );
  res.json({ success: true, data: { project } });
});

/** DELETE /api/projects/:id */
const deleteProject = asyncHandler(async (req, res) => {
  await projectService.deleteProject(req.params.id, req.user.id);
  res.json({ success: true, message: "Project deleted" });
});

/** POST /api/projects/join */
const joinProject = asyncHandler(async (req, res) => {
  const { inviteCode } = req.body;
  if (!inviteCode) throw ApiError.badRequest("inviteCode is required");

  const project = await projectService.joinByInviteCode(inviteCode, req.user.id);
  res.json({ success: true, data: { project } });
});

/** POST /api/projects/:id/invite/regenerate */
const regenerateInvite = asyncHandler(async (req, res) => {
  const inviteCode = await projectService.regenerateInviteCode(
    req.params.id,
    req.user.id
  );
  res.json({ success: true, data: { inviteCode } });
});

module.exports = {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  joinProject,
  regenerateInvite,
};
