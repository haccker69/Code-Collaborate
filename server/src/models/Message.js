/**
 * @file Message.js
 * @description Chat messages persisted per project room.
 * Uses a TTL index to auto-delete messages older than 30 days.
 */

"use strict";

const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true,
        index: true,
    },
    sender: {
        type: String,
        required: true,
    },
    senderId: {
        type: String,
        required: true,
    },
    text: {
        type: String,
        required: true,
        maxlength: 2000,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24 * 30, // Auto-delete after 30 days
    },
});

module.exports = mongoose.model("Message", messageSchema);
