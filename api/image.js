'use strict';
// Vercel Function: GET /api/image?url=...  (SSRF-safe image proxy)
const { wrap, handleImage } = require('../lib/api');
module.exports = wrap(handleImage);
