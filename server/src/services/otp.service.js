/**
 * @file otp.service.js
 * @description OTP generation, storage (MongoDB), and verification.
 * Uses Brevo (Sendinblue) transactional email API to send OTP codes.
 *
 * OTPs expire after 10 minutes via MongoDB TTL index — survives server
 * restarts on free hosting tiers like Render.
 */

"use strict";

const crypto = require("crypto");
const https = require("https");
const OtpModel = require("../models/Otp");

/**
 * Generates a random numeric OTP.
 * @returns {string} 6-digit code
 */
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

/**
 * Makes an HTTPS POST request forcing IPv4 to avoid IPv6 timeout issues.
 */
function httpsPost(url, headers, body) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const data = JSON.stringify(body);

        const options = {
            hostname: parsed.hostname,
            port: 443,
            path: parsed.pathname,
            method: "POST",
            family: 4, // Force IPv4
            headers: {
                ...headers,
                "Content-Length": Buffer.byteLength(data),
            },
        };

        const req = https.request(options, (res) => {
            let responseBody = "";
            res.on("data", (chunk) => (responseBody += chunk));
            res.on("end", () => {
                resolve({ status: res.statusCode, body: responseBody });
            });
        });

        req.on("error", reject);
        req.write(data);
        req.end();
    });
}

/**
 * Sends an OTP to the given email address via Brevo transactional API.
 * Stores the OTP in MongoDB (persists across server restarts).
 * @param {string} email
 * @returns {Promise<{ success: boolean }>}
 */
async function sendOTP(email) {
    const code = generateOTP();

    // Upsert: replace any existing OTP for this email
    await OtpModel.findOneAndUpdate(
        { email: email.toLowerCase() },
        { code, createdAt: new Date() },
        { upsert: true, new: true }
    );

    const brevoApiKey = process.env.BREVO_API_KEY;

    if (!brevoApiKey) {
        console.log(`[OTP] Code for ${email}: ${code} (Brevo API key not set, logging to console)`);
        return { success: true };
    }

    try {
        const response = await httpsPost(
            "https://api.brevo.com/v3/smtp/email",
            {
                "accept": "application/json",
                "api-key": brevoApiKey,
                "content-type": "application/json",
            },
            {
                sender: {
                    name: "CodeCollaborate",
                    email: process.env.BREVO_SENDER_EMAIL || "noreply@codecollaborate.com",
                },
                to: [{ email }],
                subject: "Your CodeCollaborate Verification Code",
                htmlContent: `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #5048e5; margin-bottom: 8px;">CodeCollaborate</h2>
            <p style="color: #333; font-size: 16px;">Your verification code is:</p>
            <div style="background: #f4f4f8; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #5048e5;">${code}</span>
            </div>
            <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
          </div>
        `,
            }
        );

        if (response.status < 200 || response.status >= 300) {
            console.error("[OTP] Brevo API error:", response.body);
            throw new Error("Failed to send OTP email");
        }

        console.log(`[OTP] Sent code to ${email}`);
        return { success: true };
    } catch (err) {
        console.error("[OTP] Send error:", err.message);
        throw err;
    }
}

/**
 * Verifies the OTP for a given email.
 * Deletes the OTP from MongoDB on successful verification.
 * @param {string} email
 * @param {string} code
 * @returns {Promise<{ valid: boolean, message?: string }>}
 */
async function verifyOTP(email, code) {
    const entry = await OtpModel.findOne({ email: email.toLowerCase() });

    if (!entry) {
        return { valid: false, message: "No OTP found. Please request a new one." };
    }

    if (entry.code !== code) {
        return { valid: false, message: "Invalid OTP code." };
    }

    // OTP is valid — delete so it cannot be reused
    await OtpModel.deleteOne({ email: email.toLowerCase() });
    return { valid: true };
}

module.exports = { sendOTP, verifyOTP };

