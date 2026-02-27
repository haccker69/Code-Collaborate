/**
 * @file Project.js
 * @description A project is a collaboration room. It has an owner, a list of
 * members, and a root-level file tree (stored separately in the File collection).
 */

"use strict";

const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["owner", "editor", "viewer"], default: "editor" },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      minlength: [1, "Name cannot be empty"],
      maxlength: [80, "Name cannot exceed 80 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, "Description cannot exceed 300 characters"],
      default: "",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [memberSchema],

    // Invite code allows users to join without being explicitly added
    inviteCode: {
      type: String,
      unique: true,
      sparse: true, // not all projects need an invite code
    },

    // Snapshot of last active language for the default file
    defaultLanguage: {
      type: String,
      default: "javascript",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ──────────────────────────────────────────────────────────
projectSchema.index({ owner: 1, createdAt: -1 });
projectSchema.index({ "members.user": 1 });
// Note: inviteCode index is declared implicitly via unique:true + sparse:true on the field

// ── Virtuals ─────────────────────────────────────────────────────────

/** Total number of members including owner */
projectSchema.virtual("memberCount").get(function () {
  return this.members.length;
});

// ── Methods ──────────────────────────────────────────────────────────

/**
 * Check if a userId is the owner or a member of this project.
 * @param {string} userId
 * @returns {boolean}
 */
projectSchema.methods.hasAccess = function (userId) {
  const id = userId.toString();
  if (this.owner.toString() === id) return true;
  return this.members.some((m) => m.user.toString() === id);
};

/**
 * Returns the role of a user in this project.
 * @param {string} userId
 * @returns {"owner"|"editor"|"viewer"|null}
 */
projectSchema.methods.getRoleOf = function (userId) {
  const id = userId.toString();
  if (this.owner.toString() === id) return "owner";
  const member = this.members.find((m) => m.user.toString() === id);
  return member ? member.role : null;
};

module.exports = mongoose.model("Project", projectSchema);
