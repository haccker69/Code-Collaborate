/**
 * @file project.routes.js
 *
 * Route map:
 *   POST   /api/projects                        → create project
 *   GET    /api/projects                        → list my projects
 *   POST   /api/projects/join                   → join via invite code
 *   GET    /api/projects/:id                    → get single project
 *   PATCH  /api/projects/:id                    → update project
 *   DELETE /api/projects/:id                    → delete project
 *   POST   /api/projects/:id/invite/regenerate  → new invite code
 *   GET    /api/projects/:id/files              → file tree (flat)
 *   POST   /api/projects/:id/files              → create file/folder
 */

"use strict";

const { Router } = require("express");
const {
  createProject, listProjects, getProject,
  updateProject, deleteProject, joinProject, regenerateInvite,
} = require("../controllers/project.controller");

const { getFileTree, getChildren, createFile, exportProject } = require("../controllers/file.controller");
const { protect } = require("../middleware/auth.middleware");

const router = Router();

// All project routes require auth
router.use(protect);

router.post("/", createProject);
router.get("/", listProjects);
router.post("/join", joinProject);

router.get("/:id", getProject);
router.patch("/:id", updateProject);
router.delete("/:id", deleteProject);

router.post("/:id/invite/regenerate", regenerateInvite);

// File tree nested under project
router.get("/:projectId/files", getFileTree);
router.get("/:projectId/files/:folderId/children", getChildren);
router.post("/:projectId/files", createFile);

// Export full project with file contents (for WebContainers)
router.get("/:projectId/export", exportProject);

module.exports = router;
