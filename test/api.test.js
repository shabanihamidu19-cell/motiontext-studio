'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const realFetch = globalThis.fetch;
const sample = { language: 'sw', text: 'habari', segments: [{ start: 0, end: 2, text: 'habari', no_speech_prob: 0, avg_logprob: -0.1, compression_ratio: 1 }] };
let lastAuth = '';
globalThis.fetch = (url, init) => {
  if (String(url).startsWith('https://api.')) {
    lastAuth = init && init.headers ? init.headers.Authorization : '';
    return Promise.resolve({ ok: true, status: 200, headers: new Headers(), json: async () => sample });
  }
  return realFetch(url, init);
};

const ENV_KEYS = ['VERCEL', 'ACCESS_TOKEN', 'GROQ_API_KEY', 'OPENAI_API_KEY', 'MAX_UPLOAD_MB', 'ALLOW_CLIENT_KEYS', 'RATE_LIMIT_PER_MIN'];
async function withServer(env, fn) {
  const saved = {};
  for (const k of ENV_KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
  Object.assign(process.env, { RATE_LIMIT_PER_MIN: '1000' }, env);
  const handler = require('../api/transcribe.js'); // the real Vercel entrypoint
  const health = require('../api/health.js');
  const srv = http.createServer((req, res) => (req.url.startsWith('/api/health') ? health(req, res) : handler(req, res)));
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  try { await fn(base); } finally {
    await new Promise((r) => srv.close(r));
    for (const k of ENV_KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  }
}
const form = (bytes = 1000, extra = {}) => {
  const fd = new FormData();
  fd.append('audio', new File([new Uint8Array(bytes)], 'a.wav', { type: 'audio/wav' }));
  for (const k in extra) fd.append(k, extra[k]);
  return fd;
};
const post = (base, body, headers = {}) => fetch(base + '/api/transcribe', { method: 'POST', body, headers });

test('Vercel without ACCESS_TOKEN ignores server keys (public URL safety)', async () => {
  await withServer({ VERCEL: '1', GROQ_API_KEY: 'gsk_serverkey1' }, async (base) => {
    const h = await (await fetch(base + '/api/health')).json();
    assert.equal(h.maxMB, 4);
    assert.equal(h.providers.groq.configured, false);
    const r = await post(base, form());
    assert.equal(r.status, 400);
  });
});

test('Vercel with ACCESS_TOKEN: requires token, then uses server key', async () => {
  await withServer({ VERCEL: '1', ACCESS_TOKEN: 'secret-token-123', GROQ_API_KEY: 'gsk_serverkey1' }, async (base) => {
    assert.equal((await post(base, form())).status, 401);
    assert.equal((await post(base, form(), { 'x-access-token': 'wrong' })).status, 401);
    const r = await post(base, form(), { 'x-access-token': 'secret-token-123' });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).provider, 'groq');
    assert.equal(lastAuth, 'Bearer gsk_serverkey1');
  });
});

test('client key is used when provided', async () => {
  await withServer({ VERCEL: '1' }, async (base) => {
    const r = await post(base, form(1000, { groqKey: 'gsk_clientkey99' }));
    assert.equal(r.status, 200);
    assert.equal(lastAuth, 'Bearer gsk_clientkey99');
  });
});

test('oversize upload -> 413 JSON', async () => {
  await withServer({ MAX_UPLOAD_MB: '1', GROQ_API_KEY: 'gsk_serverkey1' }, async (base) => {
    const r = await post(base, form(1.2 * 1048576));
    assert.equal(r.status, 413);
    assert.match((await r.json()).error, /kubwa/);
  });
});

test('GET on /api/transcribe -> 405', async () => {
  await withServer({}, async (base) => {
    assert.equal((await fetch(base + '/api/transcribe')).status, 405);
  });
});
