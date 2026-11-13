'use strict';
// Vercel Function: GET /api/health
const { wrap, sendJson, health } = require('../lib/api');
module.exports = wrap(async (req, res) => sendJson(res, 200, health()));
