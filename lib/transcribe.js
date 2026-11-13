'use strict';
/**
 * Transcription engine: Groq Whisper (primary) -> OpenAI Whisper (fallback).
 * Zero dependencies. Uses the global fetch/FormData/Blob of Node >= 20.
 */

const PROVIDERS = [
  {
    id: 'groq',
    label: 'Groq Whisper Large v3 Turbo',
    url: 'https://api.groq.com/openai/v1/audio/transcriptions',
    model: process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo',
  },
  {
    id: 'openai',
    label: 'OpenAI Whisper',
    url: 'https://api.openai.com/v1/audio/transcriptions',
    // Configurable: change via env when OpenAI retires a model.
    model: process.env.OPENAI_STT_MODEL || 'whisper-1',
  },
];

class ProviderError extends Error {
  constructor(message, { status = 502, retryable = false, provider = '', retryAfterMs = 0 } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.retryable = retryable;
    this.provider = provider;
    this.retryAfterMs = retryAfterMs;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const r3 = (n) => Math.round(n * 1000) / 1000;

/** Convert a provider verbose_json response into our compact shape. */
function normalize(json, providerId) {
  const wordsRaw = (Array.isArray(json.words) ? json.words : [])
    .map((w) => ({ w: clean(w.word), s: Number(w.start), e: Number(w.end) }))
    .filter((w) => w.w && Number.isFinite(w.s) && Number.isFinite(w.e) && w.e >= w.s);

  let segs = (Array.isArray(json.segments) ? json.segments : [])
    .map((s) => ({
      text: clean(s.text),
      start: Number(s.start),
      end: Number(s.end),
      noSpeech: Number(s.no_speech_prob) || 0,
      logprob: Number(s.avg_logprob) || 0,
      cr: Number(s.compression_ratio) || 0,
    }))
    .filter((s) => s.text && Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start);

  // Drop typical Whisper hallucinations on music/silence.
  segs = segs.filter((s) => !(s.noSpeech > 0.85 && s.logprob < -1) && !(s.cr > 2.6));
  // Drop looping repeats (same text 3x in a row).
  segs = segs.filter((s, i, a) => !(i >= 2 && s.text === a[i - 1].text && s.text === a[i - 2].text));

  // Attach words to the segment that contains their midpoint (both lists are sorted).
  let j = 0;
  const out = segs.map((s) => {
    const words = [];
    while (j < wordsRaw.length && (wordsRaw[j].s + wordsRaw[j].e) / 2 < s.start - 0.15) j++;
    while (j < wordsRaw.length && (wordsRaw[j].s + wordsRaw[j].e) / 2 <= s.end + 0.15) {
      const w = wordsRaw[j++];
      words.push({ w: w.w, s: r3(w.s), e: r3(w.e) });
    }
    const seg = { text: s.text, start: r3(s.start), end: r3(s.end) };
    if (words.length) seg.words = words;
    return seg;
  });

  return {
    provider: providerId,
    language: json.language || null,
    duration: Number.isFinite(Number(json.duration)) ? Number(json.duration) : null,
    text: clean(json.text),
    segments: out,
  };
}

async function readError(res) {
  let msg = '';
  try {
    const raw = await res.text();
    try {
      const j = JSON.parse(raw);
      msg = (j.error && (j.error.message || j.error)) || j.message || raw;
    } catch {
      msg = raw;
    }
  } catch {
    /* ignore */
  }
  return clean(msg).slice(0, 240);
}

async function callProvider(p, key, file, opts, fetchImpl) {
  const build = (withWords) => {
    const fd = new FormData();
    fd.append('file', file, file.name || 'audio');
    fd.append('model', p.model);
    fd.append('response_format', 'verbose_json');
    fd.append('temperature', '0');
    if (opts.language) fd.append('language', opts.language);
    if (opts.prompt) fd.append('prompt', opts.prompt);
    if (withWords) {
      fd.append('timestamp_granularities[]', 'word');
      fd.append('timestamp_granularities[]', 'segment');
    }
    return fd;
  };

  const send = async (withWords) => {
    let res;
    try {
      res = await fetchImpl(p.url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: build(withWords),
        signal: AbortSignal.timeout(opts.timeoutMs || 75000),
      });
    } catch (e) {
      const timeout = e && (e.name === 'TimeoutError' || e.name === 'AbortError');
      const code = e && e.cause && e.cause.code ? ' [' + e.cause.code + ']' : '';
      throw new ProviderError(p.label + ': ' + (timeout ? 'muda umeisha (timeout)' : 'hitilafu ya mtandao') + code, {
        status: 504,
        retryable: !timeout,
        provider: p.id,
      });
    }
    return res;
  };

  let res = await send(opts.words !== false);
  // Some models/accounts reject word granularity: retry once with segments only.
  if (res.status === 400 && opts.words !== false) res = await send(false);

  if (!res.ok) {
    const detail = await readError(res);
    const ra = Number(res.headers && res.headers.get && res.headers.get('retry-after'));
    throw new ProviderError(`${p.label}: ${detail || 'HTTP ' + res.status}`, {
      status: res.status,
      retryable: res.status === 429 || res.status >= 500,
      provider: p.id,
      retryAfterMs: Number.isFinite(ra) ? Math.min(ra * 1000, 8000) : 0,
    });
  }
  const json = await res.json();
  return normalize(json, p.id);
}

async function withRetry(fn, retries = 1) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (!(e instanceof ProviderError) || !e.retryable || attempt >= retries) throw e;
      await sleep(e.retryAfterMs || 1200 * (attempt + 1));
    }
  }
}

/**
 * @param {{file: File, keys: {groq?: string, openai?: string}, language?: string, prompt?: string, words?: boolean, fetchImpl?: Function}} o
 */
async function transcribeWithFallback(o) {
  const fetchImpl = o.fetchImpl || globalThis.fetch;
  const attempts = [];
  for (const p of PROVIDERS) {
    const key = o.keys && o.keys[p.id];
    if (!key) continue;
    try {
      const result = await withRetry(() => callProvider(p, key, o.file, o, fetchImpl));
      return { ...result, attempts };
    } catch (e) {
      attempts.push({ provider: p.id, status: e.status || 0, error: e.message });
    }
  }
  if (!attempts.length) {
    throw new ProviderError('Hakuna API key. Weka GROQ_API_KEY au OPENAI_API_KEY kwenye server, au andika key kwenye UI.', {
      status: 400,
    });
  }
  const last = attempts[attempts.length - 1];
  const authOnly = attempts.every((a) => a.status === 401 || a.status === 403);
  const err = new ProviderError(
    attempts.map((a) => a.error).join(' → '),
    { status: authOnly ? 401 : last.status === 429 ? 429 : 502, provider: last.provider }
  );
  err.attempts = attempts;
  throw err;
}

module.exports = { PROVIDERS, ProviderError, normalize, transcribeWithFallback };
