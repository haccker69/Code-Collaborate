/**
 * @file project.service.js
 * @description Project business logic — create, list, get, update, delete,
 * join via invite code, and member management.
 */

"use strict";

const crypto = require("crypto");
const Project = require("../models/Project");
const File = require("../models/File");
const ApiError = require("../utils/ApiError");

// ── Helpers ──────────────────────────────────────────────────────────

/** Generates a short random invite code */
const generateInviteCode = () => crypto.randomBytes(4).toString("hex"); // e.g. "a3f9c1b2"

/**
 * Asserts the user has access to the project, throws 404/403 otherwise.
 * We return 404 (not 403) when the user has no access to avoid leaking
 * whether the project exists at all.
 * @param {string} projectId
 * @param {string} userId
 * @returns {Promise<import("../models/Project")>}
 */
async function getAuthorizedProject(projectId, userId) {
  const project = await Project.findById(projectId);
  if (!project || !project.hasAccess(userId)) {
    throw ApiError.notFound("Project not found");
  }
  return project;
}

// ── Service functions ────────────────────────────────────────────────

/**
 * Creates a new project and seeds a default file inside it.
 * @param {{ name: string, description?: string, defaultLanguage?: string }} data
 * @param {string} ownerId
 * @returns {Promise<object>}
 */
async function createProject(data, ownerId) {
  const { name, description = "", defaultLanguage = "javascript" } = data;

  // Create the project, retrying up to 3 times on inviteCode collision
  let project;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      project = await Project.create({
        name,
        description,
        defaultLanguage,
        owner: ownerId,
        members: [],
        inviteCode: generateInviteCode(),
      });
      break; // success — exit loop
    } catch (err) {
      // Only retry on an inviteCode duplicate-key collision
      const isInviteCodeCollision =
        err.code === 11000 && err.keyPattern && err.keyPattern.inviteCode;
      if (!isInviteCodeCollision || attempt === 2) throw err;
    }
  }

  return project;
}

/**
 * Lists all projects the user owns or is a member of.
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function listProjects(userId) {
  return Project.find({
    $or: [{ owner: userId }, { "members.user": userId }],
  })
    .populate("owner", "username email")
    .sort({ updatedAt: -1 })
    .lean();
}

/**
 * Gets a single project by ID (user must have access).
 * @param {string} projectId
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getProject(projectId, userId) {
  const project = await getAuthorizedProject(projectId, userId);
  return Project.findById(project._id)
    .populate("owner", "username email")
    .populate("members.user", "username email")
    .lean();
}

/**
 * Updates project metadata (owner only).
 * @param {string} projectId
 * @param {string} userId
 * @param {{ name?: string, description?: string }} updates
 * @returns {Promise<object>}
 */
async function updateProject(projectId, userId, updates) {
  const project = await getAuthorizedProject(projectId, userId);

  if (project.getRoleOf(userId) !== "owner") {
    throw ApiError.forbidden("Only the project owner can edit project details");
  }

  const allowed = ["name", "description", "defaultLanguage"];
  allowed.forEach((key) => {
    if (updates[key] !== undefined) project[key] = updates[key];
  });

  await project.save();
  return project;
}

/**
 * Deletes a project and all its files (owner only).
 * @param {string} projectId
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function deleteProject(projectId, userId) {
  const project = await getAuthorizedProject(projectId, userId);

  if (project.getRoleOf(userId) !== "owner") {
    throw ApiError.forbidden("Only the project owner can delete the project");
  }

  await File.deleteMany({ project: projectId });
  await project.deleteOne();
}

/**
 * Joins a project using its invite code.
 * @param {string} inviteCode
 * @param {string} userId
 * @returns {Promise<object>} The joined project
 */
async function joinByInviteCode(inviteCode, userId) {
  const project = await Project.findOne({ inviteCode });
  if (!project) throw ApiError.notFound("Invalid invite code");

  // Already a member?
  if (project.hasAccess(userId)) return project;

  project.members.push({ user: userId, role: "editor" });
  await project.save();

  return project;
}

/**
 * Regenerates the invite code for a project (owner only).
 * @param {string} projectId
 * @param {string} userId
 * @returns {Promise<string>} New invite code
 */
async function regenerateInviteCode(projectId, userId) {
  const project = await getAuthorizedProject(projectId, userId);
  if (project.getRoleOf(userId) !== "owner") {
    throw ApiError.forbidden("Only the owner can regenerate the invite code");
  }

  project.inviteCode = generateInviteCode();
  await project.save();
  return project.inviteCode;
}

// ── Utility ──────────────────────────────────────────────────────────

/** Maps a language name to a common file extension */
function langToExt(lang) {
  const map = {
    javascript: "js", typescript: "ts", python: "py",
    java: "java", cpp: "cpp", c: "c", go: "go",
    rust: "rs", ruby: "rb", php: "php",
  };
  return map[lang] || "txt";
}

/**
 * Leaves a project (member removes themselves).
 * Owners cannot leave — they must delete the project.
 * @param {string} projectId
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function leaveProject(projectId, userId) {
  const project = await Project.findById(projectId);
  if (!project) throw ApiError.notFound("Project not found");

  if (project.owner.toString() === userId.toString()) {
    throw ApiError.badRequest("Owners cannot leave their own project. Delete it instead.");
  }

  const memberIdx = project.members.findIndex(
    (m) => m.user.toString() === userId.toString()
  );
  if (memberIdx === -1) {
    throw ApiError.notFound("You are not a member of this project");
  }

  project.members.splice(memberIdx, 1);
  await project.save();
}

module.exports = {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  joinByInviteCode,
  regenerateInviteCode,
  leaveProject,
};
