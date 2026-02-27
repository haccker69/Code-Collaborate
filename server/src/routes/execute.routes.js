/**
 * @file execute.routes.js
 *
 * POST /api/execute — requires auth + rate limiting
 */

"use strict";

const { Router }      = require("express");
const { execute }     = require("../controllers/execute.controller");
const { protect }     = require("../middleware/auth.middleware");
const { executeLimiter } = require("../middleware/rateLimiter");

const router = Router();

router.post("/", protect, executeLimiter, execute);

module.exports = router;
