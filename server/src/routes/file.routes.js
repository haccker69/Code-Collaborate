/**
 * @file file.routes.js
 *
 * Route map:
 *   GET    /api/files/:id          → get file with content
 *   PATCH  /api/files/:id/rename   → rename file or folder
 *   PATCH  /api/files/:id/content  → save file content (autosave)
 *   DELETE /api/files/:id          → delete file or folder (+ descendants)
 */

"use strict";

const { Router } = require("express");
const { getFile, renameFile, saveContent, deleteFile } = require("../controllers/file.controller");
const { protect } = require("../middleware/auth.middleware");

const router = Router();

router.use(protect);

router.get("/:id",           getFile);
router.patch("/:id/rename",  renameFile);
router.patch("/:id/content", saveContent);
router.delete("/:id",        deleteFile);

module.exports = router;
