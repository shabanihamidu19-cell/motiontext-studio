#!/usr/bin/env node
'use strict';
/**
 * MotionText Studio local server — zero dependencies (Node >= 20).
 *  - serves ./public
 *  - GET  /api/health, GET /api/selftest
 *  - POST /api/transcribe  (multipart: audio, language?, prompt?, words?, groqKey?, openaiKey?)
 * The same handlers run on Vercel via ./api/*.js
 */
const http = require('node:http');
// Termux/Android: IPv6 often hangs; prefer IPv4 and fail over quickly.
try { require('node:dns').setDefaultResultOrder('ipv4first'); } catch { /* ignore */ }
try { require('node:net').setDefaultAutoSelectFamilyAttemptTimeout(400); } catch { /* ignore */ }
const fs = require('node:fs');
const path = require('node:path');

// --- tiny .env loader (no dotenv needed) -----------------------------------
function parseEnv(text) {
  const out = {};
  for (const line of String(text).split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m) continue;
    let v = m[2];
    const q = v[0];
    if ((q === '"' || q === "'") && v.indexOf(q, 1) > 0) v = v.slice(1, v.indexOf(q, 1));
    else v = v.replace(/\s+#.*$/, '').trim();
    out[m[1]] = v;
  }
  return out;
}
try {
  const parsed = parseEnv(fs.readFileSync(path.join(__dirname, '.env'), 'utf8'));
  for (const k in parsed) if (!(k in process.env)) process.env[k] = parsed[k];
} catch {
  /* no .env: fine */
}

const api = require('./lib/api');

const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function securityHeaders(res) {
  res.setHeader('Content-Security-Policy', api.CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

function serveStatic(pathname, req, res) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    return api.sendJson(res, 400, { error: 'Bad path' });
  }
  if (rel === '/' || rel === '') rel = '/index.html';
  const full = path.normalize(path.join(PUBLIC_DIR, rel));
  if (full !== PUBLIC_DIR && !full.startsWith(PUBLIC_DIR + path.sep)) return api.sendJson(res, 403, { error: 'Forbidden' });
  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) return api.sendJson(res, 404, { error: 'Haipatikani' });
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      // Always revalidate code/manifest/service worker so updates are never stuck in the HTTP cache.
      'Cache-Control': ext === '.png' ? 'public, max-age=86400' : 'no-cache',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(full).pipe(res);
  });
}

const transcribe = api.wrap(api.handleTranscribe);
const server = http.createServer(async (req, res) => {
  securityHeaders(res);
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/health' && req.method === 'GET') return api.sendJson(res, 200, api.health());
  if (url.pathname === '/api/selftest' && req.method === 'GET') return api.wrap(async () => api.sendJson(res, 200, await api.selftest()))(req, res);
  if (url.pathname === '/api/transcribe') return transcribe(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') return api.sendJson(res, 405, { error: 'Method not allowed' });
  return serveStatic(url.pathname, req, res);
});

server.requestTimeout = 5 * 60 * 1000;
server.headersTimeout = 30 * 1000;

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    const h = api.health();
    console.log(`\n  ✦ MotionText Studio v${h.version}`);
    console.log(`  → http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}`);
    console.log(`  Keys kwenye server: Groq ${h.providers.groq.configured ? '✓' : '✗'}  OpenAI ${h.providers.openai.configured ? '✓' : '✗'}  (unaweza kuandika key kwenye UI)`);
    if (HOST === '0.0.0.0' && !process.env.ACCESS_TOKEN) console.warn('  ⚠ HOST=0.0.0.0 bila ACCESS_TOKEN: mtu yeyote kwenye mtandao anaweza kutumia keys zako.');
    console.log('');
  });
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

module.exports = { server, parseEnv };
