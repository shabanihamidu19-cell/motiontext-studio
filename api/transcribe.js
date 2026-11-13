'use strict';
// Vercel Function: POST /api/transcribe
const { wrap, handleTranscribe } = require('../lib/api');
module.exports = wrap(handleTranscribe);
