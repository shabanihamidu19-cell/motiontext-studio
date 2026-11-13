'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalize, transcribeWithFallback } = require('../lib/transcribe');

const sample = {
  language: 'sw',
  duration: 12.5,
  text: 'habari yako rafiki',
  segments: [
    { start: 0, end: 2, text: ' habari yako ', no_speech_prob: 0.01, avg_logprob: -0.2, compression_ratio: 1.1 },
    { start: 2, end: 4, text: 'rafiki', no_speech_prob: 0.01, avg_logprob: -0.2, compression_ratio: 1.1 },
    { start: 4, end: 6, text: 'hallucination', no_speech_prob: 0.95, avg_logprob: -1.5, compression_ratio: 1 },
  ],
  words: [
    { word: 'habari', start: 0, end: 0.8 },
    { word: 'yako', start: 0.9, end: 1.7 },
    { word: 'rafiki', start: 2.1, end: 3.2 },
  ],
};

test('normalize attaches words and drops hallucinations', () => {
  const r = normalize(sample, 'groq');
  assert.equal(r.segments.length, 2);
  assert.equal(r.segments[0].text, 'habari yako');
  assert.deepEqual(r.segments[0].words.map((w) => w.w), ['habari', 'yako']);
  assert.deepEqual(r.segments[1].words.map((w) => w.w), ['rafiki']);
});

test('normalize drops 3x repeated loops', () => {
  const seg = (s) => ({ start: s, end: s + 1, text: 'la la la' });
  const r = normalize({ segments: [seg(0), seg(1), seg(2), seg(3)] }, 'groq');
  assert.equal(r.segments.length, 2);
});

const okRes = (json) => ({ ok: true, status: 200, json: async () => json, headers: new Headers() });
const errRes = (status, message) => ({
  ok: false,
  status,
  headers: new Headers(),
  text: async () => JSON.stringify({ error: { message } }),
});
const file = new File([new Uint8Array([1, 2, 3])], 'a.mp3', { type: 'audio/mpeg' });

test('falls back from Groq (401) to OpenAI', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return url.includes('groq') ? errRes(401, 'Invalid API key') : okRes(sample);
  };
  const r = await transcribeWithFallback({ file, keys: { groq: 'gsk_x', openai: 'sk-x' }, fetchImpl });
  assert.equal(r.provider, 'openai');
  assert.equal(r.attempts.length, 1);
  assert.equal(r.attempts[0].status, 401);
  assert.equal(calls.length, 2);
});

test('retries once on 429 then succeeds', async () => {
  let n = 0;
  const fetchImpl = async () => {
    n++;
    const r = n === 1 ? errRes(429, 'slow down') : okRes(sample);
    return r;
  };
  const r = await transcribeWithFallback({ file, keys: { groq: 'gsk_x' }, fetchImpl });
  assert.equal(r.provider, 'groq');
  assert.equal(n, 2);
});

test('retries without word timestamps on HTTP 400', async () => {
  const bodies = [];
  const fetchImpl = async (_u, init) => {
    bodies.push(init.body.getAll('timestamp_granularities[]').length);
    return bodies.length === 1 ? errRes(400, 'bad granularity') : okRes(sample);
  };
  const r = await transcribeWithFallback({ file, keys: { groq: 'gsk_x' }, fetchImpl });
  assert.equal(r.provider, 'groq');
  assert.deepEqual(bodies, [2, 0]);
});

test('no keys -> 400 error', async () => {
  await assert.rejects(transcribeWithFallback({ file, keys: {}, fetchImpl: async () => null }), (e) => e.status === 400);
});

test('all providers fail with auth -> 401', async () => {
  const fetchImpl = async () => errRes(401, 'bad key');
  await assert.rejects(
    transcribeWithFallback({ file, keys: { groq: 'gsk_x', openai: 'sk-x' }, fetchImpl }),
    (e) => e.status === 401 && e.attempts.length === 2
  );
});
