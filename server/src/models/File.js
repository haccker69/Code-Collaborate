/**
 * @file File.js
 * @description Represents both files and folders within a project.
 * Nested structure is achieved via a parentId reference (adjacency list model).
 * This keeps queries simple and supports unlimited depth.
 *
 * Tree reconstruction: query all files for a project, then build the tree
 * client-side or via a recursive aggregation pipeline.
 */

"use strict";

const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    name: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
      maxlength: [120, "File name cannot exceed 120 characters"],
    },

    // null parentId → root-level item
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      default: null,
    },

    type: {
      type: String,
      enum: ["file", "folder"],
      required: true,
    },

    // Only populated for type === "file"
    content: {
      type: String,
      default: "",
    },

    // Programming language for syntax highlighting / Judge0
    language: {
      type: String,
      default: "javascript",
    },

    // Tracks who last modified the file
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────
fileSchema.index({ project: 1, parentId: 1 }); // fetch children of a folder
fileSchema.index({ project: 1, name: 1 });

// ── Prevent duplicate names within the same parent ───────────────────
fileSchema.index(
  { project: 1, parentId: 1, name: 1 },
  { unique: true }
);

module.exports = mongoose.model("File", fileSchema);
