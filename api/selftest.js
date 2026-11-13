'use strict';
// Vercel Function: GET /api/selftest — checks that the server can reach Groq/OpenAI.
const { wrap, sendJson, selftest } = require('../lib/api');
module.exports = wrap(async (req, res) => sendJson(res, 200, await selftest()));
