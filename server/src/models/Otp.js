/**
 * @file Otp.js
 * @description Mongoose model for OTP storage.
 * Uses a TTL index so MongoDB automatically deletes expired OTPs.
 */

"use strict";

const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        index: true,
    },
    code: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600, // TTL: MongoDB auto-deletes after 600 seconds (10 minutes)
    },
});

module.exports = mongoose.model("Otp", otpSchema);
