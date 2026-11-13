'use strict';
/**
 * Shared HTTP handlers used by BOTH the local server (server.js) and the
 * Vercel functions (api/*.js). Config is read lazily from process.env.
 */
const crypto = require('node:crypto');
const { transcribeWithFallback, ProviderError, PROVIDERS } = require('./transcribe');
const pkg = require('../package.json');

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join('; ');

function config() {
  const onVercel = Boolean(process.env.VERCEL);
  const accessToken = process.env.ACCESS_TOKEN || '';
  return {
    onVercel,
    accessToken,
    // Vercel Functions reject request bodies > 4.5 MB, so stay under it there.
    maxMB: Number(process.env.MAX_UPLOAD_MB) || (onVercel ? 4 : 25),
    allowClientKeys: process.env.ALLOW_CLIENT_KEYS !== 'false',
    ratePerMin: Number(process.env.RATE_LIMIT_PER_MIN) || 10,
    // On a public Vercel URL, server-side keys are used ONLY if an ACCESS_TOKEN protects them.
    serverKeysAllowed: !onVercel || Boolean(accessToken),
  };
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Cache-Control': 'no-store',
  });
  res.end(data);
}

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    if (res.headersSent) return res.destroy && res.destroy();
    const status = e && e.status ? e.status : 500;
    if (status === 500) console.error('[api]', e && e.message);
    sendJson(res, status, { error: status === 500 ? 'Hitilafu ya ndani ya server.' : e.message });
  }
};

// --- naive in-memory rate limiter (per instance) -----------------------------
const hits = new Map();
function rateLimited(ip, limit) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < 60000)) hits.delete(k);
  return arr.length > limit;
}

function tooBig(maxMB) {
  const e = new Error(`Faili ni kubwa kuliko ${maxMB} MB.`);
  e.status = 413;
  return e;
}

function readBody(req, limit, maxMB) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > limit) return reject(tooBig(maxMB));
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        req.destroy();
        return reject(tooBig(maxMB));
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function tokenOk(req, token) {
  const a = Buffer.from(String(req.headers['x-access-token'] || ''));
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const keyOk = (k) => typeof k === 'string' && k.length >= 8 && k.length <= 256 && !/\s/.test(k);

async function handleTranscribe(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
  const c = config();
  if (c.accessToken && !tokenOk(req, c.accessToken)) return sendJson(res, 401, { error: 'Access token si sahihi.' });
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = fwd || (req.socket && req.socket.remoteAddress) || 'unknown';
  if (rateLimited(ip, c.ratePerMin)) return sendJson(res, 429, { error: 'Maombi mengi sana. Subiri dakika moja.' });

  const ct = req.headers['content-type'] || '';
  if (!/^multipart\/form-data/i.test(ct)) return sendJson(res, 400, { error: 'Tuma multipart/form-data.' });

  const maxBytes = c.maxMB * 1024 * 1024;
  const buf = await readBody(req, maxBytes + 512 * 1024, c.maxMB);
  let form;
  try {
    form = await new Response(buf, { headers: { 'content-type': ct } }).formData();
  } catch {
    return sendJson(res, 400, { error: 'Fomu haisomeki (multipart batili).' });
  }

  const file = form.get('audio');
  if (!file || typeof file === 'string' || !file.size) return sendJson(res, 400, { error: 'Faili la audio halijatumwa.' });
  if (file.size > maxBytes) return sendJson(res, 413, { error: `Faili ni kubwa kuliko ${c.maxMB} MB.` });
  const okType = /^(audio|video)\//.test(file.type || '') || /\.(mp3|wav|m4a|mp4|ogg|oga|opus|webm|flac|aac|mpeg|mpga)$/i.test(file.name || '');
  if (!okType) return sendJson(res, 415, { error: 'Aina ya faili haikubaliki. Tumia MP3, WAV, M4A, OGG, FLAC au WebM.' });

  const clientGroq = String(form.get('groqKey') || '').trim();
  const clientOpenai = String(form.get('openaiKey') || '').trim();
  const keys = {
    groq: (c.allowClientKeys && keyOk(clientGroq) && clientGroq) || (c.serverKeysAllowed && process.env.GROQ_API_KEY) || '',
    openai: (c.allowClientKeys && keyOk(clientOpenai) && clientOpenai) || (c.serverKeysAllowed && process.env.OPENAI_API_KEY) || '',
  };

  const language = String(form.get('language') || '').trim();
  if (language && !/^[a-z]{2,3}$/i.test(language)) return sendJson(res, 400, { error: 'Lugha si sahihi.' });
  const prompt = String(form.get('prompt') || '').slice(0, 400);
  const words = String(form.get('words') || '1') !== '0';

  try {
    const t0 = Date.now();
    console.log(`[transcribe] ${file.name} ${(file.size / 1048576).toFixed(2)}MB lang=${language || 'auto'} groq=${keys.groq ? 'yes' : 'no'} openai=${keys.openai ? 'yes' : 'no'}`);
    const result = await transcribeWithFallback({ file, keys, language, prompt, words });
    console.log(`[transcribe] OK via ${result.provider} in ${((Date.now() - t0) / 1000).toFixed(1)}s, ${result.segments.length} segments`);
    return sendJson(res, 200, result);
  } catch (e) {
    const status = e instanceof ProviderError ? e.status : 500;
    console.error('[transcribe] FAILED:', e.message);
    return sendJson(res, status >= 400 && status < 600 ? status : 502, { error: e.message, attempts: e.attempts || undefined });
  }
}

function health() {
  const c = config();
  return {
    ok: true,
    version: pkg.version,
    maxMB: c.maxMB,
    auth: Boolean(c.accessToken),
    clientKeys: c.allowClientKeys,
    vercel: c.onVercel,
    providers: Object.fromEntries(
      PROVIDERS.map((p) => [p.id, { configured: c.serverKeysAllowed && Boolean(process.env[p.id.toUpperCase() + '_API_KEY']), model: p.model }])
    ),
  };
}

async function selftest() {
  const targets = { groq: 'https://api.groq.com/openai/v1/models', openai: 'https://api.openai.com/v1/models' };
  const out = {};
  for (const [id, url] of Object.entries(targets)) {
    const t0 = Date.now();
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
      out[id] = { reachable: true, httpStatus: r.status, ms: Date.now() - t0 };
    } catch (e) {
      out[id] = { reachable: false, error: (e.cause && e.cause.code) || e.name, ms: Date.now() - t0 };
    }
  }
  return out;
}

module.exports = { CSP, config, sendJson, wrap, handleTranscribe, health, selftest };
