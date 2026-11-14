'use strict';
// Vercel Function: GET /api/artist-search?q=...  (Wikipedia + Commons image search)
const { wrap, handleArtistSearch } = require('../lib/api');
module.exports = wrap(handleArtistSearch);
