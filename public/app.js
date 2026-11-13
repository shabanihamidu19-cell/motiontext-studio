'use strict';
/* MotionText Studio v1.0 — single-file vanilla JS app (no build step). */
(() => {
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const r2 = (n) => Math.round(n * 100) / 100;
  const r3 = (n) => Math.round(n * 1000) / 1000;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);

  /* ------------------------------------------------------------ storage */
  const store = {
    get(area, k) { try { return window[area].getItem(k); } catch { return null; } },
    set(area, k, v) { try { window[area].setItem(k, v); } catch { /* ignore */ } },
    del(area, k) { try { window[area].removeItem(k); } catch { /* ignore */ } },
  };

  /* --------------------------------------------------------------- i18n */
  const I18N = {
    sw: {
      undo: 'Rudisha', redo: 'Rudia', install: '⬇ Sakinisha app', m_installed: 'Imesakinishwa. Utaipata kwenye skrini ya nyumbani.', m_update: 'Toleo jipya limepakuliwa. Funga na ufungue app ili kulitumia.', saveProject: 'Hifadhi mradi', openProject: 'Fungua mradi', demo: 'Demo',
      s1: '01 · Audio', drop: 'Buruta audio hapa au bonyeza kuchagua', noAudio: 'Hakuna audio', localHint: 'Uchambuzi wa audio unafanyika ndani ya browser yako.',
      s2: '02 · Maneno / Captions', pasteLyrics: 'Bandika maneno (mstari mmoja = caption moja)', lyricsPh: 'Bandika maneno ya wimbo hapa…',
      tapSync: '⏱ Tap-Sync', autoSplit: 'Gawanya kiotomatiki', tapHint: 'Tap-Sync: cheza wimbo, bonyeza kitufe (au T) mwanzo wa kila mstari. Ni njia sahihi zaidi bila AI.',
      quickAdd: 'Ongeza caption moja', importCaps: 'Leta captions (.srt / .vtt / .lrc)',
      trim: 'Kata sehemu ya kutranscribe (inapunguza ukubwa wa faili)', trimSetStart: '⇤ Mwanzo = sasa', trimSetEnd: '⇥ Mwisho = sasa', trimReset: 'Wimbo mzima',
      s3: '03 · AI Transcription', language: 'Lugha ya wimbo', autoDetect: 'Tambua kiotomatiki', sttPrompt: 'Maelezo ya kusaidia usahihi (majina, maneno magumu)',
      wordStamps: 'Muda wa kila neno (karaoke)', ownKeys: 'Tumia API key yangu (hiari)', remember: 'Kumbuka kwenye kifaa hiki (si salama kwenye kifaa cha pamoja)',
      keysHint: 'Kwa chaguo-msingi keys hukaa kwenye kipindi hiki tu (sessionStorage). Njia salama zaidi: ziweke kwenye .env ya server.',
      transcribe: '✨ Transcribe', cancel: 'Ghairi', timeline: 'TIMELINE', fit: 'Yote', captions: 'CAPTIONS', clearAll: 'Futa zote',
      tlHint: 'Buruta kingo za caption kubadili muda, buruta katikati kuhamisha, bonyeza kuruka. Ctrl+gurudumu = zoom.',
      s4: '04 · Mitindo', s5: '05 · Mandharinyuma', sens: 'Ukali wa beat', motion: 'Mwendo', flash: 'Nguvu ya flash', reactive: 'Jibu bass / beat', autoHue: 'Badilisha rangi kulingana na muziki',
      s6: '06 · Maandishi', font: 'Fonti', size: 'Ukubwa', textColor: 'Maandishi', position: 'Nafasi', bottom: 'Chini', center: 'Katikati', top: 'Juu', anim: 'Animation',
      karaoke: 'Karaoke (neno kwa neno)', outline: 'Mstari wa nje (outline)',
      s7: '07 · Export', exportVideo: '⬇ Toa video', muteExport: 'Nyamazisha sauti wakati wa export',
      exportHint: 'Inarekodi canvas + sauti kwa muda halisi. Weka tab wazi hadi iishe. MP4 ikiungwa mkono na browser, vinginevyo WebM.',
      shortcuts: 'Njia za mkato: Space cheza/simamisha · ←/→ ±5s (Shift ±1s) · S gawanya · T tap · [ ] weka mwanzo/mwisho · Delete futa · Ctrl+Z / Ctrl+Shift+Z',
      // dynamic
      m_needAudio: 'Pakia audio kwanza.', m_pasteFirst: 'Bandika maneno kwanza.', m_split: 'Zimeundwa captions {n}. Pitia muda kabla ya export.',
      m_imported: 'Zimeletwa captions {n} kutoka {f}.', m_importFail: 'Faili halina captions halali (SRT/VTT/LRC).', m_noCaps: 'Hakuna captions za kutoa.', m_exported: 'Zimetolewa captions {n}.',
      m_demo: 'Demo imepakiwa. Pakia audio uone na muziki.', m_cantSplit: 'Caption hii haiwezi kugawanywa.', m_merged: 'Zimeunganishwa.', m_restored: 'Mradi wako wa mwisho umerudishwa.',
      m_saved: 'Mradi umehifadhiwa.', m_badProject: 'Faili la mradi si sahihi.', m_audioLoaded: 'Audio imepakiwa', m_noBackend: '⚠ Server haipatikani. Endesha "npm start" kisha fungua http://127.0.0.1:8787 (si kwa kufungua faili moja kwa moja).',
      m_serverKeys: 'Server ina keys: Groq {g} · OpenAI {o}', m_noKeys: 'Weka key kwenye UI au kwenye .env ya server.',
      m_tooBig: 'Faili ni kubwa kuliko {n} MB na kivinjari hakikuweza kulipunguza. Tumia faili dogo zaidi (MP3).', m_noPcm: 'Faili ni kubwa kuliko kikomo na haliwezi kupunguzwa kwenye kivinjari hiki. Tumia MP3 ndogo.', m_trimFull: 'Wimbo mzima · {mb} MB (faili asili, halijabadilishwa)', m_trimInfo: 'Itatumwa: {a} → {b} ({d}s) · ~{mb} MB · vipande {n}', m_413: 'Faili ni kubwa kuliko kikomo cha server (Vercel ni 4.5 MB). Kata sehemu fupi kwa Trim.', m_timeout: 'Muda umeisha: server haikupata jibu kutoka AI. Fungua /api/selftest kuangalia mtandao, kisha jaribu tena.', m_partial: 'Vipande vya mwanzo vimewekwa, lakini kimoja kimeshindwa: {e}', m_uploading: 'Inatuma audio… {p}%', m_processing: 'AI inachakata wimbo…',
      m_done: 'Imefanikiwa kupitia {p}. Captions {n}. Pitia maneno na muda kabla ya export.', m_fellback: ' (Groq ilishindwa, imetumika OpenAI)', m_err: 'Hitilafu: {e}', m_cancelled: 'Imeghairiwa.', m_noSegs: 'AI haikurudisha captions zinazotumika. Jaribu lugha nyingine au tumia Tap-Sync.',
      m_tapStart: 'Bonyeza TAP mwanzo wa kila mstari.', m_tapEnd: '(bonyeza mara ya mwisho wimbo wa mstari wa mwisho ukiisha)', m_tapDone: 'Tap-Sync imekamilika: captions {n}.',
      m_recStart: 'Inarekodi… usifunge tab hii.', m_recDone: 'Export imekamilika: {f}', m_noRec: 'Browser hii haiungi mkono kurekodi canvas. Tumia Chrome, au screen recorder.', m_recFail: 'Imeshindwa kuanza kurekodi: {e}', m_recCancel: 'Export imeghairiwa.',
      t_play: 'Cheza kutoka hapa', t_ss: 'Weka mwanzo = sasa', t_se: 'Weka mwisho = sasa', t_split: 'Gawanya (S)', t_merge: 'Unganisha na inayofuata', t_del: 'Futa',
      stop: '■ Simamisha', exporting: 'Inarekodi…', beat: 'BEAT', live: 'MOJA KWA MOJA', waiting: 'Inasubiri audio', clearConfirm: 'Futa captions zote?',
    },
    en: {
      undo: 'Undo', redo: 'Redo', install: '⬇ Install app', m_installed: 'Installed. Find it on your home screen.', m_update: 'A new version was downloaded. Close and reopen the app to use it.', saveProject: 'Save project', openProject: 'Open project', demo: 'Demo',
      s1: '01 · Audio', drop: 'Drop an audio file here or click to choose', noAudio: 'No audio loaded', localHint: 'Audio analysis runs locally in this browser tab.',
      s2: '02 · Lyrics / Captions', pasteLyrics: 'Paste lyrics (one line = one caption)', lyricsPh: 'Paste lyrics here…',
      tapSync: '⏱ Tap-Sync', autoSplit: 'Auto-distribute', tapHint: 'Tap-Sync: play the song and press the button (or T) at the start of every line. Most accurate non-AI method.',
      quickAdd: 'Add a single caption', importCaps: 'Import captions (.srt / .vtt / .lrc)',
      trim: 'Trim the part to transcribe (shrinks the upload)', trimSetStart: '⇤ Start = now', trimSetEnd: '⇥ End = now', trimReset: 'Whole song',
      s3: '03 · AI Transcription', language: 'Audio language', autoDetect: 'Auto-detect', sttPrompt: 'Hint for accuracy (names, hard words)',
      wordStamps: 'Per-word timestamps (karaoke)', ownKeys: 'Use my own API key (optional)', remember: 'Remember on this device (unsafe on shared devices)',
      keysHint: 'By default keys live only for this session (sessionStorage). Safest: put them in the server .env.',
      transcribe: '✨ Transcribe', cancel: 'Cancel', timeline: 'TIMELINE', fit: 'Fit', captions: 'CAPTIONS', clearAll: 'Clear all',
      tlHint: 'Drag caption edges to retime, drag the middle to move, click to seek. Ctrl+wheel = zoom.',
      s4: '04 · Presets', s5: '05 · Background', sens: 'Beat sensitivity', motion: 'Motion', flash: 'Flash strength', reactive: 'React to bass / beats', autoHue: 'Shift hue with music energy',
      s6: '06 · Typography', font: 'Font', size: 'Size', textColor: 'Text', position: 'Position', bottom: 'Bottom', center: 'Center', top: 'Top', anim: 'Animation',
      karaoke: 'Karaoke (word by word)', outline: 'Outline',
      s7: '07 · Export', exportVideo: '⬇ Export video', muteExport: 'Mute speakers while exporting',
      exportHint: 'Records canvas + audio in real time. Keep this tab visible until it finishes. MP4 when the browser supports it, otherwise WebM.',
      shortcuts: 'Shortcuts: Space play/pause · ←/→ ±5s (Shift ±1s) · S split · T tap · [ ] set start/end · Delete remove · Ctrl+Z / Ctrl+Shift+Z',
      m_needAudio: 'Load audio first.', m_pasteFirst: 'Paste lyrics first.', m_split: 'Created {n} captions. Review timing before export.',
      m_imported: 'Imported {n} captions from {f}.', m_importFail: 'No valid captions found (SRT/VTT/LRC).', m_noCaps: 'No captions to export.', m_exported: 'Exported {n} captions.',
      m_demo: 'Demo loaded. Load audio to preview with music.', m_cantSplit: 'This caption cannot be split.', m_merged: 'Merged.', m_restored: 'Your last project was restored.',
      m_saved: 'Project saved.', m_badProject: 'Invalid project file.', m_audioLoaded: 'Audio loaded', m_noBackend: '⚠ Backend unreachable. Run "npm start" and open http://127.0.0.1:8787 (not the file directly).',
      m_serverKeys: 'Server keys: Groq {g} · OpenAI {o}', m_noKeys: 'Enter a key in the UI or set it in the server .env.',
      m_tooBig: 'File is larger than {n} MB and the browser could not shrink it. Use a smaller file (MP3).', m_noPcm: 'File exceeds the limit and cannot be shrunk in this browser. Use a smaller MP3.', m_trimFull: 'Whole song · {mb} MB (original file, untouched)', m_trimInfo: 'Will send: {a} → {b} ({d}s) · ~{mb} MB · chunks {n}', m_413: 'File exceeds the server limit (Vercel is 4.5 MB). Use Trim to cut a shorter part.', m_timeout: 'Timed out: the server got no reply from the AI. Open /api/selftest to check the network, then retry.', m_partial: 'The first chunks were applied, but one failed: {e}', m_uploading: 'Uploading audio… {p}%', m_processing: 'AI is processing the song…',
      m_done: 'Success via {p}. {n} captions. Review wording and timing before export.', m_fellback: ' (Groq failed, OpenAI used)', m_err: 'Error: {e}', m_cancelled: 'Cancelled.', m_noSegs: 'The AI returned no usable captions. Try another language or use Tap-Sync.',
      m_tapStart: 'Press TAP at the start of each line.', m_tapEnd: '(tap once more when the last line ends)', m_tapDone: 'Tap-Sync done: {n} captions.',
      m_recStart: 'Recording… keep this tab open.', m_recDone: 'Export complete: {f}', m_noRec: 'This browser cannot record canvas. Use Chrome or a screen recorder.', m_recFail: 'Could not start recording: {e}', m_recCancel: 'Export cancelled.',
      t_play: 'Play from here', t_ss: 'Set start = now', t_se: 'Set end = now', t_split: 'Split (S)', t_merge: 'Merge with next', t_del: 'Delete',
      stop: '■ Stop', exporting: 'Recording…', beat: 'BEAT', live: 'LIVE AUDIO REACTIVE', waiting: 'Waiting for audio', clearConfirm: 'Clear all captions?',
    },
  };
  let lang = store.get('localStorage', 'mts:lang') === 'en' ? 'en' : 'sw';
  const t = (k, v) => {
    let s = (I18N[lang] && I18N[lang][k]) ?? I18N.en[k] ?? k;
    if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]);
    return s;
  };
  function applyI18n() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
    $('langBtn').textContent = lang === 'sw' ? 'EN' : 'SW';
    renderList();
    renderProviderStatus();
    updateTrimInfo();
  }

  /* -------------------------------------------------------------- state */
  const PRESETS = {
    neon: { colorA: '#100d35', colorB: '#123b50', accent: '#73f7e8', animation: 'pop', autoHue: true },
    cinema: { colorA: '#090b16', colorB: '#34202b', accent: '#e6bd83', animation: 'fade', autoHue: false },
    gradient: { colorA: '#38105d', colorB: '#075d70', accent: '#b8ffed', animation: 'rise', autoHue: true },
    minimal: { colorA: '#111827', colorB: '#293548', accent: '#ffffff', animation: 'fade', autoHue: false },
    wave: { colorA: '#061c2d', colorB: '#123f58', accent: '#52e5ff', animation: 'rise', autoHue: false },
    party: { colorA: '#310d3c', colorB: '#651d37', accent: '#fff16a', animation: 'pop', autoHue: false },
    bars: { colorA: '#0b1026', colorB: '#2a1250', accent: '#ff7ad9', animation: 'rise', autoHue: false },
  };
  const FORMATS = { '9:16': [720, 1280], '9:16hd': [1080, 1920], '1:1': [1080, 1080], '16:9': [1280, 720] };
  const defaultStyle = () => ({
    ...PRESETS.neon, textColor: '#ffffff', font: 'Arial', size: 54, position: 'bottom',
    reactive: true, sensitivity: 1.35, motion: 70, flash: 65, karaoke: true, outline: true,
  });
  const S = { clips: [], style: defaultStyle(), preset: 'neon', format: '9:16', sel: null };
  let currentFile = null;
  let audioName = '';

  const audio = $('audio');
  const canvas = $('preview');
  const ctx = canvas.getContext('2d');

  /* ------------------------------------------------------ toast / status */
  let toastTimer = 0;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }
  function setStatus(id, msg, cls) {
    const el = $(id);
    el.textContent = msg;
    el.classList.remove('err', 'ok');
    if (cls) el.classList.add(cls);
  }

  /* ------------------------------------------------------------ history */
  const H = { undo: [], redo: [], cur: '[]' };
  const snap = () => JSON.stringify(S.clips);
  let saveTimer = 0;
  let tlDirty = true;

  function updateUndoButtons() {
    $('undoBtn').disabled = !H.undo.length;
    $('redoBtn').disabled = !H.redo.length;
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      store.set('localStorage', 'mts:autosave', JSON.stringify({ v: 1, clips: S.clips, style: S.style, preset: S.preset, format: S.format }));
    }, 400);
  }
  function commit(opts = {}) {
    S.clips.sort((a, b) => a.start - b.start);
    const s = snap();
    if (s === H.cur) { scheduleSave(); return; }
    H.undo.push(H.cur);
    if (H.undo.length > 100) H.undo.shift();
    H.cur = s;
    H.redo = [];
    afterChange(opts);
  }
  function resetHistory() {
    H.undo = []; H.redo = []; H.cur = snap();
    updateUndoButtons();
  }
  function afterChange(opts = {}) {
    if (opts.list !== false) renderList();
    tlDirty = true;
    updateUndoButtons();
    scheduleSave();
  }
  function undo() {
    if (!H.undo.length) return;
    H.redo.push(H.cur);
    H.cur = H.undo.pop();
    S.clips = JSON.parse(H.cur);
    afterChange();
  }
  function redo() {
    if (!H.redo.length) return;
    H.undo.push(H.cur);
    H.cur = H.redo.pop();
    S.clips = JSON.parse(H.cur);
    afterChange();
  }

  /* ---------------------------------------------------------- audio graph */
  const A = { ctx: null, an: null, src: null, dest: null, gain: null, freq: null };
  const B = { beat: 0, last: 0, smooth: 0, energy: 0, hue: 0, bass: 0 };

  function setupAudio() {
    if (A.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    A.ctx = new AC();
    A.an = A.ctx.createAnalyser();
    A.an.fftSize = 2048;
    A.an.smoothingTimeConstant = 0.72;
    A.src = A.ctx.createMediaElementSource(audio);
    A.dest = A.ctx.createMediaStreamDestination();
    A.gain = A.ctx.createGain();
    A.src.connect(A.an);
    A.an.connect(A.gain);
    A.gain.connect(A.ctx.destination);
    A.an.connect(A.dest);
    A.freq = new Uint8Array(A.an.frequencyBinCount);
    return true;
  }

  function analyze(dt, now) {
    const decay = Math.pow(0.88, dt * 60);
    if (!A.an) { B.beat *= decay; return; }
    A.an.getByteFrequencyData(A.freq);
    let bass = 0;
    for (let i = 1; i <= 10; i++) bass += A.freq[i];
    bass /= 10 * 255;
    let total = 0;
    for (let i = 1; i < A.freq.length; i++) total += A.freq[i];
    total /= (A.freq.length - 1) * 255;
    B.smooth = B.smooth * 0.92 + bass * 0.08;
    const thr = Math.max(0.12, B.smooth * S.style.sensitivity + 0.055);
    if (S.style.reactive && bass > thr && bass > 0.19 && now - B.last > 210) { B.beat = 1; B.last = now; } else B.beat *= decay;
    B.energy = B.energy * 0.82 + total * 0.18;
    B.bass = bass;
    B.hue = (B.hue + B.energy * (S.style.motion / 100) * 0.55 * dt * 60) % 360;
  }

  /* ------------------------------------------------------------ renderer */
  function fontStack() { return `"${S.style.font}", system-ui, sans-serif`; }

  function wordsFor(c) {
    if (c.words && c.words.length) return c.words.map((w) => ({ w: w.w, s: w.s, e: w.e }));
    const parts = String(c.text || '').split(/\s+/).filter(Boolean);
    const total = parts.reduce((n, x) => n + x.length + 1, 0) || 1;
    const d = c.end - c.start;
    let cur = c.start;
    return parts.map((p) => { const s = cur; cur += (d * (p.length + 1)) / total; return { w: p, s, e: cur }; });
  }

  function drawBackground(c, w, h, tm, pulse) {
    const st = S.style;
    const ca = st.autoHue ? `hsl(${(B.hue + 245) % 360} 65% 15%)` : st.colorA;
    const cb = st.autoHue ? `hsl(${(B.hue + 175) % 360} 72% 25%)` : st.colorB;
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, ca); g.addColorStop(1, cb);
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const m = Math.min(w, h);
    const glow = c.createRadialGradient(w * 0.5, h * 0.43, 20, w * 0.5, h * 0.43, m * (0.5 + pulse * 0.2));
    glow.addColorStop(0, `rgba(102,91,255,${0.08 + B.energy * 0.3 + pulse * 0.24})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = glow; c.fillRect(0, 0, w, h);
    const sc = m / 720;
    const p = S.preset;
    if (p === 'wave' || p === 'neon' || p === 'party') {
      c.save();
      c.lineWidth = (3 + pulse * 5) * sc; c.strokeStyle = st.accent; c.globalAlpha = clamp(0.2 + B.energy * 0.65 + pulse * 0.45, 0, 1);
      c.beginPath();
      const base = h * 0.72, amp = (p === 'wave' ? 150 : 65) * sc * (1 + B.energy * 2 + pulse * 0.8);
      for (let x = 0; x <= w; x += 5) {
        const y = base + Math.sin(x * 0.018 / sc + tm * 3) * amp * 0.42 + Math.sin(x * 0.043 / sc - tm * 2) * amp * 0.2;
        if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke(); c.restore();
    }
    if (p === 'bars') {
      const n = 48, bw = w / n;
      c.save(); c.fillStyle = st.accent; c.globalAlpha = 0.75;
      for (let i = 0; i < n; i++) {
        let v = 0;
        if (A.freq) v = A.freq[1 + Math.floor(Math.pow(i / n, 1.6) * (A.freq.length * 0.5))] / 255;
        const bh = Math.max(4 * sc, v * h * 0.3);
        c.fillRect(i * bw + bw * 0.15, h - bh, bw * 0.7, bh);
      }
      c.restore();
    }
    if (p === 'party' && pulse > 0.25) {
      c.fillStyle = `rgba(255,255,255,${pulse * (st.flash / 100) * 0.26})`;
      c.fillRect(0, 0, w, h);
    }
    for (let i = 0; i < 24; i++) {
      const x = ((i * 137 + Math.sin(tm * 0.5 + i) * 35) * (w / 720)) % w;
      let y = (i * 211 - tm * 18 * (i % 3 + 1)) % h;
      if (y < 0) y += h;
      c.fillStyle = `rgba(255,255,255,${0.12 + B.energy * 0.2})`;
      c.beginPath(); c.arc(x, y, (1.5 + (i % 3)) * sc, 0, Math.PI * 2); c.fill();
    }
  }

  function drawCaption(c, w, h, tm, pulse) {
    const st = S.style;
    const active = S.clips.filter((k) => tm >= k.start && tm < k.end);
    if (!active.length) return;
    const clip = active[active.length - 1];
    const sc = Math.min(w, h) / 720;
    const size = st.size * sc;
    const dur = Math.max(0.01, clip.end - clip.start);
    const p = clamp((tm - clip.start) / dur, 0, 1);
    const intro = clamp((tm - clip.start) / 0.38, 0, 1);
    const outro = clamp((clip.end - tm) / 0.2, 0, 1);

    let words = wordsFor(clip);
    if (st.animation === 'type') {
      const total = words.reduce((n, x) => n + x.w.length, 0);
      let left = Math.max(1, Math.ceil(total * p));
      words = words.map((x) => { const n = Math.min(left, x.w.length); left -= n; return n > 0 ? { ...x, w: x.w.slice(0, n) } : null; }).filter(Boolean);
    }
    if (!words.length) return;

    c.save();
    c.textBaseline = 'middle'; c.textAlign = 'left'; c.lineJoin = 'round';
    c.font = `900 ${size * (0.94 + pulse * 0.05)}px ${fontStack()}`;
    const space = c.measureText(' ').width;
    const maxW = w * 0.86;
    const lines = [];
    let cur = { items: [], width: 0 };
    for (const wd of words) {
      const ww = c.measureText(wd.w).width;
      if (cur.items.length && cur.width + space + ww > maxW) { lines.push(cur); cur = { items: [], width: 0 }; }
      cur.width += (cur.items.length ? space : 0) + ww;
      cur.items.push({ ...wd, ww });
    }
    if (cur.items.length) lines.push(cur);

    const lineH = size * 1.22;
    let y = st.position === 'top' ? h * 0.19 : st.position === 'center' ? h * 0.5 : h * 0.79;
    if (st.animation === 'rise') y += (1 - easeOut(intro)) * 90 * sc;
    const y0 = y - ((lines.length - 1) * lineH) / 2;
    c.globalAlpha = (st.animation === 'fade' ? intro : Math.min(1, intro * 4)) * outro;
    if (st.animation === 'pop') {
      const s = 0.7 + 0.3 * easeOut(intro);
      c.translate(w / 2, y); c.scale(s, s); c.translate(-w / 2, -y);
    }

    const paint = (dx, dy, override) => {
      lines.forEach((ln, li) => {
        let x = (w - ln.width) / 2 + dx;
        const ly = y0 + li * lineH + dy;
        for (const it of ln.items) {
          const sung = st.karaoke && tm >= it.s;
          const activeWord = sung && tm < it.e;
          const k = activeWord ? 1 + 0.1 * (1 - clamp((tm - it.s) / Math.max(0.05, it.e - it.s), 0, 1)) : 1;
          c.save();
          c.translate(x + it.ww / 2, ly);
          c.scale(k, k);
          if (st.outline && !override) {
            c.shadowBlur = 0;
            c.lineWidth = size * 0.14; c.strokeStyle = 'rgba(0,0,0,.55)';
            c.strokeText(it.w, -it.ww / 2, 0);
          }
          c.shadowColor = st.accent;
          c.shadowBlur = S.preset === 'minimal' || override ? 0 : (14 + pulse * 20) * sc;
          c.fillStyle = override || (st.karaoke ? (sung ? st.accent : st.textColor) : st.textColor);
          if (st.karaoke && !sung && !override) c.globalAlpha *= 0.82;
          c.fillText(it.w, -it.ww / 2, 0);
          c.restore();
          x += it.ww + space;
        }
      });
    };
    if (st.animation === 'glitch' && pulse > 0.25) {
      paint(-5 * sc, 2 * sc, '#ff4b91');
      paint(5 * sc, -2 * sc, '#42e8ff');
    }
    paint(0, 0, null);
    c.restore();
  }

  function drawFrame(c, w, h, tm) {
    const pulse = S.style.reactive ? B.beat : 0;
    drawBackground(c, w, h, tm, pulse);
    drawCaption(c, w, h, tm, pulse);
  }

  /* ------------------------------------------------------------- timeline */
  const tl = $('tl');
  const tlc = tl.getContext('2d');
  const V = { start: 0, span: 10 };
  let peaks = null;
  const RULER = 18, CLIPH = 34;

  function totalDur() {
    if (audio.duration && isFinite(audio.duration)) return audio.duration;
    if (peaks) return peaks.dur;
    return Math.max(10, ...S.clips.map((c) => c.end));
  }
  function clampView() {
    const d = totalDur();
    V.span = clamp(V.span, Math.min(2, d), d);
    V.start = clamp(V.start, 0, Math.max(0, d - V.span));
  }
  function fitView() { V.start = 0; V.span = totalDur(); clampView(); tlDirty = true; }
  const tx = (time) => ((time - V.start) / V.span) * tl.clientWidth;
  const xt = (x) => V.start + (x / tl.clientWidth) * V.span;

  function computePeaks(buf) {
    const ch = buf.getChannelData(0);
    const N = clamp(Math.floor(buf.duration * 20), 500, 6000);
    const size = Math.max(1, Math.floor(ch.length / N));
    const step = Math.max(1, size >> 6);
    const mins = new Float32Array(N), maxs = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      let mn = 1, mx = -1;
      const s = i * size, e = Math.min(ch.length, s + size);
      for (let j = s; j < e; j += step) { const v = ch[j]; if (v < mn) mn = v; if (v > mx) mx = v; }
      mins[i] = mn > mx ? 0 : mn; maxs[i] = mx < mn ? 0 : mx;
    }
    return { mins, maxs, N, dur: buf.duration };
  }

  function drawTimeline() {
    const dpr = window.devicePixelRatio || 1;
    const W = tl.clientWidth, Ht = tl.clientHeight;
    if (!W) return;
    if (tl.width !== Math.round(W * dpr) || tl.height !== Math.round(Ht * dpr)) { tl.width = Math.round(W * dpr); tl.height = Math.round(Ht * dpr); }
    tlc.setTransform(dpr, 0, 0, dpr, 0, 0);
    tlc.clearRect(0, 0, W, Ht);
    clampView();
    const waveTop = RULER, waveBot = Ht - CLIPH - 2;
    const mid = (waveTop + waveBot) / 2, amp = (waveBot - waveTop) / 2 - 2;

    // ruler
    const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
    const step = steps.find((s) => (s / V.span) * W >= 70) || 300;
    tlc.fillStyle = '#7f8aa8'; tlc.font = '10px system-ui'; tlc.textBaseline = 'top'; tlc.strokeStyle = '#1f2740'; tlc.lineWidth = 1;
    for (let tm = Math.ceil(V.start / step) * step; tm <= V.start + V.span; tm += step) {
      const x = Math.round(tx(tm)) + 0.5;
      tlc.beginPath(); tlc.moveTo(x, 12); tlc.lineTo(x, Ht); tlc.stroke();
      tlc.fillText(fmt(tm), x + 3, 2);
    }
    // waveform
    if (peaks) {
      tlc.fillStyle = '#5b64a8';
      for (let px = 0; px < W; px++) {
        const t0 = V.start + (px / W) * V.span, t1 = t0 + V.span / W;
        const i0 = clamp(Math.floor((t0 / peaks.dur) * peaks.N), 0, peaks.N - 1);
        const i1 = clamp(Math.floor((t1 / peaks.dur) * peaks.N), i0, peaks.N - 1);
        let mn = 1, mx = -1;
        for (let i = i0; i <= Math.min(i1, i0 + 64); i++) { if (peaks.mins[i] < mn) mn = peaks.mins[i]; if (peaks.maxs[i] > mx) mx = peaks.maxs[i]; }
        const y1 = mid - mx * amp, y2 = mid - mn * amp;
        tlc.fillRect(px, y1, 1, Math.max(1, y2 - y1));
      }
    } else {
      tlc.strokeStyle = '#2b3556'; tlc.beginPath(); tlc.moveTo(0, mid); tlc.lineTo(W, mid); tlc.stroke();
    }
    // clips
    const cy = Ht - CLIPH;
    for (const c of S.clips) {
      const x0 = tx(c.start), x1 = tx(c.end);
      if (x1 < 0 || x0 > W) continue;
      const sel = c.id === S.sel;
      tlc.fillStyle = sel ? 'rgba(139,124,255,.78)' : 'rgba(66,217,208,.38)';
      tlc.fillRect(x0, cy, Math.max(2, x1 - x0), CLIPH - 4);
      tlc.strokeStyle = sel ? '#d8d2ff' : '#42d9d0'; tlc.strokeRect(x0 + 0.5, cy + 0.5, Math.max(2, x1 - x0) - 1, CLIPH - 5);
      tlc.save();
      tlc.beginPath(); tlc.rect(x0 + 3, cy, Math.max(0, x1 - x0 - 6), CLIPH - 4); tlc.clip();
      tlc.fillStyle = '#fff'; tlc.font = '11px system-ui'; tlc.textBaseline = 'middle';
      tlc.fillText(c.text, x0 + 4, cy + (CLIPH - 4) / 2);
      tlc.restore();
    }
    const tr = trimRange();
    if (tr.trimmed) {
      const xa = tx(tr.a), xb = tx(tr.b);
      tlc.fillStyle = 'rgba(5,7,17,.6)';
      if (xa > 0) tlc.fillRect(0, RULER, Math.min(W, xa), Ht - RULER);
      if (xb < W) tlc.fillRect(Math.max(0, xb), RULER, W - Math.max(0, xb), Ht - RULER);
      tlc.fillStyle = '#ffb454';
      if (xa >= 0 && xa <= W) tlc.fillRect(xa - 1, RULER, 2, Ht - RULER);
      if (xb >= 0 && xb <= W) tlc.fillRect(xb - 1, RULER, 2, Ht - RULER);
    }
    // playhead
    const px = tx(audio.currentTime || 0);
    if (px >= 0 && px <= W) { tlc.fillStyle = '#ff5d7a'; tlc.fillRect(px - 1, 0, 2, Ht); }
  }

  function hitTest(x, y) {
    if (y < tl.clientHeight - CLIPH - 2) return null;
    for (let i = S.clips.length - 1; i >= 0; i--) {
      const c = S.clips[i];
      const x0 = tx(c.start), x1 = tx(c.end);
      if (x < x0 - 6 || x > x1 + 6) continue;
      if (Math.abs(x - x0) <= 7) return { c, mode: 'l' };
      if (Math.abs(x - x1) <= 7) return { c, mode: 'r' };
      if (x > x0 && x < x1) return { c, mode: 'move' };
    }
    return null;
  }
  function retime(c, orig, ns, ne) {
    c.start = r3(ns); c.end = r3(ne);
    if (orig.words) {
      const od = Math.max(0.001, orig.end - orig.start), nd = ne - ns;
      c.words = orig.words.map((w) => ({ w: w.w, s: r3(ns + ((w.s - orig.start) * nd) / od), e: r3(ns + ((w.e - orig.start) * nd) / od) }));
    }
  }
  let drag = null;
  tl.addEventListener('pointerdown', (e) => {
    const rect = tl.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const hit = hitTest(x, y);
    tl.setPointerCapture(e.pointerId);
    if (hit) {
      selectClip(hit.c.id, { scroll: true });
      drag = { mode: hit.mode, id: hit.c.id, t0: xt(x), orig: JSON.parse(JSON.stringify(hit.c)), moved: false };
    } else {
      drag = { mode: 'seek' };
      seekTo(xt(x));
    }
  });
  tl.addEventListener('pointermove', (e) => {
    const rect = tl.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (!drag) {
      const hit = hitTest(x, y);
      tl.style.cursor = !hit ? 'pointer' : hit.mode === 'move' ? 'grab' : 'ew-resize';
      return;
    }
    if (drag.mode === 'seek') { seekTo(xt(x)); return; }
    const c = S.clips.find((k) => k.id === drag.id);
    if (!c) return;
    const dt = xt(x) - drag.t0;
    const d = totalDur();
    const o = drag.orig;
    drag.moved = drag.moved || Math.abs(dt) > 0.02;
    if (!drag.moved) return;
    if (drag.mode === 'move') {
      const len = o.end - o.start;
      const ns = clamp(o.start + dt, 0, Math.max(0, d - len));
      retime(c, o, ns, ns + len);
    } else if (drag.mode === 'l') {
      retime(c, o, clamp(o.start + dt, 0, o.end - 0.1), o.end);
    } else {
      retime(c, o, o.start, Math.max(o.start + 0.1, Math.min(d, o.end + dt)));
    }
    tlDirty = true;
    syncRow(c);
  });
  const endDrag = () => {
    if (drag && drag.moved) commit({ list: false });
    drag = null;
  };
  tl.addEventListener('pointerup', endDrag);
  tl.addEventListener('pointercancel', endDrag);
  tl.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = tl.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) {
      const anchor = xt(e.clientX - rect.left);
      const f = e.deltaY > 0 ? 1.2 : 1 / 1.2;
      V.span *= f; clampView();
      V.start = anchor - ((e.clientX - rect.left) / tl.clientWidth) * V.span; clampView();
    } else {
      V.start += ((e.deltaX || e.deltaY) / tl.clientWidth) * V.span; clampView();
    }
    tlDirty = true;
  }, { passive: false });
  function zoom(f) {
    const c = audio.currentTime || V.start + V.span / 2;
    V.span *= f; clampView();
    V.start = c - V.span / 2; clampView(); tlDirty = true;
  }
  $('zoomIn').onclick = () => zoom(0.5);
  $('zoomOut').onclick = () => zoom(2);
  $('zoomFit').onclick = fitView;
  new ResizeObserver(() => { tlDirty = true; }).observe(tl);

  /* ------------------------------------------------------------- helpers */
  function fmt(s) {
    if (!isFinite(s)) s = 0;
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  }
  function seekTo(tm) {
    if (!audio.src) return;
    audio.currentTime = clamp(tm, 0, totalDur());
    tlDirty = true;
  }
  function downloadBlob(name, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }
  const baseName = () => (audioName || 'motiontext').replace(/\.[^.]+$/, '') || 'motiontext';

  /* ------------------------------------------------------------ clips list */
  function newClip(text, start, end, words) {
    const c = { id: uid(), text, start: r3(start), end: r3(end) };
    if (words && words.length) c.words = words;
    return c;
  }
  function renderList() {
    const box = $('clipList');
    box.innerHTML = S.clips.map((c) => `<div class="clip${c.id === S.sel ? ' sel' : ''}" data-id="${c.id}">
<input class="ctext" data-f="text" aria-label="Caption" value="${esc(c.text)}">
<input type="number" data-f="start" step=".1" min="0" value="${r2(c.start)}" aria-label="Start">
<input type="number" data-f="end" step=".1" min=".1" value="${r2(c.end)}" aria-label="End">
<div class="clip-actions">
<button data-act="play" title="${esc(t('t_play'))}">▶</button><button data-act="ss" title="${esc(t('t_ss'))}">⇤</button><button data-act="se" title="${esc(t('t_se'))}">⇥</button>
<button data-act="split" title="${esc(t('t_split'))}">✂</button><button data-act="merge" title="${esc(t('t_merge'))}">⤓</button><button data-act="del" title="${esc(t('t_del'))}">×</button>
</div></div>`).join('');
  }
  function rowOf(id) { return $('clipList').querySelector(`.clip[data-id="${id}"]`); }
  function syncRow(c) {
    const row = rowOf(c.id);
    if (!row) return;
    row.querySelector('[data-f="start"]').value = r2(c.start);
    row.querySelector('[data-f="end"]').value = r2(c.end);
  }
  function selectClip(id, opts = {}) {
    S.sel = id;
    $('clipList').querySelectorAll('.clip').forEach((r) => r.classList.toggle('sel', r.dataset.id === id));
    if (opts.scroll) { const r = rowOf(id); if (r) r.scrollIntoView({ block: 'nearest' }); }
    tlDirty = true;
  }
  const clipById = (id) => S.clips.find((c) => c.id === id);

  function splitClip(c, at) {
    const words = wordsFor(c);
    let a, b;
    if (c.words && c.words.length > 1) {
      a = c.words.filter((w) => (w.s + w.e) / 2 < at);
      b = c.words.filter((w) => (w.s + w.e) / 2 >= at);
    }
    if (!a || !a.length || !b || !b.length) {
      const toks = c.text.split(/\s+/).filter(Boolean);
      if (toks.length < 2) return false;
      const k = clamp(Math.round(toks.length * ((at - c.start) / (c.end - c.start))), 1, toks.length - 1);
      const parts = [toks.slice(0, k).join(' '), toks.slice(k).join(' ')];
      const x = clamp(at, c.start + 0.1, c.end - 0.1);
      const i = S.clips.indexOf(c);
      S.clips.splice(i, 1, newClip(parts[0], c.start, x), newClip(parts[1], x, c.end));
      return true;
    }
    const x = clamp(at, c.start + 0.1, c.end - 0.1);
    const i = S.clips.indexOf(c);
    S.clips.splice(i, 1,
      newClip(a.map((w) => w.w).join(' '), c.start, x, a),
      newClip(b.map((w) => w.w).join(' '), x, c.end, b));
    void words;
    return true;
  }
  function splitAtPlayhead(id) {
    const now = audio.currentTime || 0;
    let c = id ? clipById(id) : S.clips.find((k) => now > k.start + 0.1 && now < k.end - 0.1);
    if (!c) c = clipById(S.sel);
    if (!c) return toast(t('m_cantSplit'));
    const inside = now > c.start + 0.1 && now < c.end - 0.1;
    if (!splitClip(c, inside ? now : (c.start + c.end) / 2)) return toast(t('m_cantSplit'));
    commit();
  }
  function mergeNext(id) {
    const i = S.clips.findIndex((c) => c.id === id);
    if (i < 0 || i >= S.clips.length - 1) return;
    const a = S.clips[i], b = S.clips[i + 1];
    const m = newClip(`${a.text} ${b.text}`, a.start, Math.max(a.end, b.end), a.words && b.words ? [...a.words, ...b.words] : null);
    S.clips.splice(i, 2, m);
    S.sel = m.id;
    commit();
    toast(t('m_merged'));
  }

  const list = $('clipList');
  list.addEventListener('input', (e) => {
    const row = e.target.closest('.clip');
    if (!row || e.target.dataset.f !== 'text') return;
    const c = clipById(row.dataset.id);
    if (!c) return;
    c.text = e.target.value;
    delete c.words; // word timing no longer matches the edited text
    tlDirty = true;
  });
  list.addEventListener('change', (e) => {
    const row = e.target.closest('.clip');
    const f = e.target.dataset.f;
    if (!row || !f) return;
    const c = clipById(row.dataset.id);
    if (!c) return;
    if (f !== 'text') {
      const orig = JSON.parse(JSON.stringify(c));
      let ns = c.start, ne = c.end;
      const v = parseFloat(e.target.value);
      if (!Number.isFinite(v)) { syncRow(c); return; }
      if (f === 'start') { ns = Math.max(0, v); if (ne <= ns + 0.05) ne = ns + 0.5; } else { ne = Math.max(c.start + 0.1, v); }
      retime(c, orig, ns, ne);
      syncRow(c);
    }
    commit({ list: false });
    tlDirty = true;
  });
  list.addEventListener('focusin', (e) => { const row = e.target.closest('.clip'); if (row) selectClip(row.dataset.id); });
  list.addEventListener('click', (e) => {
    const row = e.target.closest('.clip');
    if (!row) return;
    const c = clipById(row.dataset.id);
    if (!c) return;
    const act = e.target.dataset && e.target.dataset.act;
    const now = audio.currentTime || 0;
    if (!act) { if (e.target.tagName !== 'INPUT') { selectClip(c.id); seekTo(c.start); } return; }
    selectClip(c.id);
    if (act === 'play') { seekTo(c.start); audio.play().catch(() => {}); }
    else if (act === 'ss') { const orig = JSON.parse(JSON.stringify(c)); retime(c, orig, Math.min(now, c.end - 0.1), c.end); commit(); }
    else if (act === 'se') { const orig = JSON.parse(JSON.stringify(c)); retime(c, orig, c.start, Math.max(now, c.start + 0.1)); commit(); }
    else if (act === 'split') splitAtPlayhead(c.id);
    else if (act === 'merge') mergeNext(c.id);
    else if (act === 'del') { S.clips = S.clips.filter((k) => k.id !== c.id); commit(); }
  });

  /* ---------------------------------------------------- caption bulk tools */
  $('addCaption').onclick = () => {
    const text = $('newCaption').value.trim();
    if (!text) return;
    const s = Math.max(0, +$('newStart').value || 0);
    S.clips.push(newClip(text, s, Math.max(s + 0.1, +$('newEnd').value || s + 3)));
    $('newCaption').value = '';
    commit();
  };
  $('clearBtn').onclick = () => { if (S.clips.length && confirm(t('clearConfirm'))) { S.clips = []; commit(); } };
  $('splitLyrics').onclick = () => {
    const lines = $('bulkLyrics').value.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    if (!lines.length) return setStatus('captionStatus', t('m_pasteFirst'), 'err');
    const d = audio.duration && isFinite(audio.duration) ? audio.duration : Math.max(3, lines.length * 3);
    const wts = lines.map((x) => Math.max(1, x.length)), total = wts.reduce((a, b) => a + b, 0);
    let cur = 0;
    S.clips = lines.map((text, i) => { const s = cur; cur += (d * wts[i]) / total; return newClip(text, s, i === lines.length - 1 ? d : cur); });
    commit();
    setStatus('captionStatus', t('m_split', { n: S.clips.length }), 'ok');
  };
  $('demoBtn').onclick = () => {
    S.clips = [newClip('FEEL THE RHYTHM', 0, 2.4), newClip('LET THE BEAT MOVE YOU', 2.4, 5.1), newClip('CREATE WITHOUT LIMITS', 5.1, 8)];
    commit(); toast(t('m_demo'));
  };

  /* ------------------------------------------------- caption import / export */
  function parseTime(v) {
    const x = String(v).trim().replace(',', '.').split(':').map(Number);
    if (x.some((n) => !Number.isFinite(n))) return NaN;
    return x.length === 3 ? x[0] * 3600 + x[1] * 60 + x[2] : x.length === 2 ? x[0] * 60 + x[1] : NaN;
  }
  function parseCaptions(raw) {
    raw = raw.replace(/^﻿/, '').replace(/\r/g, '');
    const out = [];
    if (/^\s*\[\d+:\d+/m.test(raw) && !raw.includes('-->')) { // LRC
      const rows = [];
      for (const ln of raw.split('\n')) {
        const m = ln.match(/^\s*\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/);
        if (m && m[3].trim()) rows.push({ s: +m[1] * 60 + +m[2], text: m[3].trim() });
      }
      rows.forEach((r, i) => out.push(newClip(r.text, r.s, rows[i + 1] ? rows[i + 1].s : r.s + 4)));
      return out;
    }
    for (const block of raw.split(/\n\s*\n/)) {
      const lines = block.split('\n').map((x) => x.trim()).filter(Boolean);
      const ti = lines.findIndex((x) => x.includes('-->'));
      if (ti < 0) continue;
      const [a, b] = lines[ti].split('-->');
      const s = parseTime(a), e = parseTime(b.trim().split(/\s+/)[0]);
      const text = lines.slice(ti + 1).join(' ').replace(/<[^>]*>/g, '').trim();
      if (Number.isFinite(s) && Number.isFinite(e) && e > s && text) out.push(newClip(text, s, e));
    }
    return out;
  }
  $('captionFile').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const parsed = parseCaptions(await f.text());
      if (!parsed.length) throw new Error(t('m_importFail'));
      S.clips = parsed; commit();
      setStatus('captionStatus', t('m_imported', { n: parsed.length, f: f.name }), 'ok');
    } catch (err) { setStatus('captionStatus', err.message, 'err'); }
    e.target.value = '';
  };
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  function stamp(s, sep) {
    s = Math.max(0, s);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60), ms = Math.min(999, Math.round((s - Math.floor(s)) * 1000));
    return `${pad(h)}:${pad(m)}:${pad(sec)}${sep}${pad(ms, 3)}`;
  }
  const xmlEsc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  function exportCaptions(kind) {
    if (!S.clips.length) return setStatus('captionStatus', t('m_noCaps'), 'err');
    const rows = [...S.clips].sort((a, b) => a.start - b.start);
    let body, ext, mime;
    if (kind === 'srt') {
      body = rows.map((c, i) => `${i + 1}\n${stamp(c.start, ',')} --> ${stamp(c.end, ',')}\n${c.text}`).join('\n\n') + '\n'; ext = 'srt'; mime = 'application/x-subrip';
    } else if (kind === 'vtt') {
      body = 'WEBVTT\n\n' + rows.map((c) => `${stamp(c.start, '.')} --> ${stamp(c.end, '.')}\n${c.text}`).join('\n\n') + '\n'; ext = 'vtt'; mime = 'text/vtt';
    } else if (kind === 'lrc') {
      body = rows.map((c) => `[${pad(Math.floor(c.start / 60))}:${(c.start % 60).toFixed(2).padStart(5, '0')}]${c.text}`).join('\n') + '\n'; ext = 'lrc'; mime = 'text/plain';
    } else {
      const ps = rows.map((c) => {
        const inner = c.words && c.words.length
          ? c.words.map((w) => `<span begin="${stamp(w.s, '.')}" end="${stamp(w.e, '.')}">${xmlEsc(w.w)}</span>`).join(' ')
          : xmlEsc(c.text);
        return `      <p begin="${stamp(c.start, '.')}" end="${stamp(c.end, '.')}">${inner}</p>`;
      }).join('\n');
      body = `<?xml version="1.0" encoding="UTF-8"?>\n<tt xmlns="http://www.w3.org/ns/ttml" xml:lang="${lang === 'sw' ? 'sw' : 'en'}">\n  <body>\n    <div>\n${ps}\n    </div>\n  </body>\n</tt>\n`;
      ext = 'ttml'; mime = 'application/ttml+xml';
    }
    downloadBlob(`${baseName()}.${ext}`, new Blob([body], { type: mime + ';charset=utf-8' }));
    setStatus('captionStatus', t('m_exported', { n: rows.length }), 'ok');
  }
  $('exportSrt').onclick = () => exportCaptions('srt');
  $('exportVtt').onclick = () => exportCaptions('vtt');
  $('exportLrc').onclick = () => exportCaptions('lrc');
  $('exportTtml').onclick = () => exportCaptions('ttml');

  /* -------------------------------------------------------------- tap-sync */
  const TAP = { on: false, lines: [], idx: 0 };
  function tapRender() {
    const L = TAP.lines;
    $('tapPrev').textContent = TAP.idx > 0 ? L[TAP.idx - 1] || '' : '';
    $('tapCur').textContent = TAP.idx < L.length ? L[TAP.idx] : t('m_tapEnd');
    $('tapNext').textContent = L[TAP.idx + 1] || '';
  }
  function tapStart() {
    const lines = $('bulkLyrics').value.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    if (!lines.length) return setStatus('captionStatus', t('m_pasteFirst'), 'err');
    if (!audio.src) return toast(t('m_needAudio'));
    TAP.on = true; TAP.lines = lines; TAP.idx = 0;
    S.clips = [];
    renderList();
    $('tapOverlay').hidden = false;
    tapRender();
    toast(t('m_tapStart'));
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }
  function tapPress() {
    if (!TAP.on) return;
    const tm = audio.currentTime || 0;
    const last = S.clips[S.clips.length - 1];
    if (TAP.idx < TAP.lines.length) {
      if (last) last.end = Math.max(last.start + 0.1, r3(tm));
      S.clips.push(newClip(TAP.lines[TAP.idx], tm, tm + 3));
      TAP.idx++;
      tl && (tlDirty = true);
      tapRender();
    } else {
      if (last) last.end = Math.max(last.start + 0.1, r3(tm));
      tapFinish();
    }
  }
  function tapFinish(cancel) {
    TAP.on = false;
    $('tapOverlay').hidden = true;
    audio.pause();
    commit();
    if (!cancel) setStatus('captionStatus', t('m_tapDone', { n: S.clips.length }), 'ok');
  }
  $('tapSync').onclick = tapStart;
  $('tapBtn').onclick = tapPress;
  $('tapCancel').onclick = () => tapFinish(true);

  /* ------------------------------------------------------------- audio I/O */
  async function loadAudio(file) {
    if (!file) return;
    if (audio.dataset.url) URL.revokeObjectURL(audio.dataset.url);
    const url = URL.createObjectURL(file);
    audio.dataset.url = url;
    audio.src = url;
    currentFile = file;
    audioName = file.name;
    const fn = $('fileName');
    fn.removeAttribute('data-i18n');
    fn.textContent = `${file.name} · ${(file.size / 1048576).toFixed(1)} MB`;
    setupAudio();
    peaks = null; pcm16 = null; TRIM.start = 0; TRIM.end = 0; tlDirty = true;
    syncTrimInputs();
    $('previewMode').textContent = t('m_audioLoaded');
    try {
      if (file.size <= 80 * 1048576) {
        const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        const buf = await new OC(1, 1, 44100).decodeAudioData(await file.arrayBuffer());
        if (currentFile === file) {
          peaks = computePeaks(buf); fitView();
          try { const mono = await resample16k(buf); if (currentFile === file) pcm16 = mono; } catch { /* trimming falls back to original file */ }
          syncTrimInputs();
        }
      }
    } catch { /* waveform is optional */ }
  }
  $('audioFile').onchange = (e) => { loadAudio(e.target.files[0]); };
  const dz = $('dropzone');
  ['dragenter', 'dragover'].forEach((ev) => document.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((ev) => document.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('drag'); }));
  document.addEventListener('drop', (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f && (/^audio\//.test(f.type) || /\.(mp3|wav|m4a|ogg|flac|opus|aac)$/i.test(f.name))) loadAudio(f);
  });
  audio.addEventListener('loadedmetadata', () => { fitView(); });
  audio.addEventListener('play', async () => {
    setupAudio();
    if (A.ctx && A.ctx.state === 'suspended') await A.ctx.resume();
    $('playBtn').textContent = '⏸';
  });
  audio.addEventListener('pause', () => { $('playBtn').textContent = '▶'; });
  audio.addEventListener('ended', () => { $('playBtn').textContent = '▶'; });
  function togglePlay() {
    if (!audio.src) return toast(t('m_needAudio'));
    if (audio.paused) audio.play().catch(() => {}); else audio.pause();
  }
  $('playBtn').onclick = togglePlay;
  $('restartBtn').onclick = () => { if (!audio.src) return toast(t('m_needAudio')); audio.currentTime = 0; audio.play().catch(() => {}); };
  $('fullscreenBtn').onclick = () => { const el = $('stage'); if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); };

  /* ----------------------------------------------------------------- style UI */
  function syncControls() {
    document.querySelectorAll('[data-style]').forEach((el) => {
      const v = S.style[el.dataset.style];
      if (el.type === 'checkbox') el.checked = !!v; else el.value = v;
    });
    $('sizeVal').textContent = `${S.style.size}px`;
    $('sensitivityVal').textContent = `${(+S.style.sensitivity).toFixed(2)}×`;
    document.querySelectorAll('[data-preset]').forEach((b) => b.classList.toggle('active', b.dataset.preset === S.preset));
    $('format').value = S.format;
  }
  document.querySelectorAll('[data-style]').forEach((el) => {
    el.addEventListener('input', () => {
      const k = el.dataset.style;
      S.style[k] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? parseFloat(el.value) : el.value;
      $('sizeVal').textContent = `${S.style.size}px`;
      $('sensitivityVal').textContent = `${(+S.style.sensitivity).toFixed(2)}×`;
      scheduleSave();
    });
  });
  document.querySelectorAll('[data-preset]').forEach((b) => {
    b.onclick = () => { S.preset = b.dataset.preset; Object.assign(S.style, PRESETS[S.preset]); syncControls(); scheduleSave(); };
  });
  function applyFormat() {
    const [w, h] = FORMATS[S.format] || FORMATS['9:16'];
    canvas.width = w; canvas.height = h;
    $('stage').style.aspectRatio = `${w}/${h}`;
  }
  $('format').onchange = (e) => { if (exporting) { e.target.value = S.format; return; } S.format = e.target.value; applyFormat(); scheduleSave(); };

  /* --------------------------------------------------------- project file I/O */
  $('saveProject').onclick = () => {
    const data = { app: 'motiontext-studio', v: 1, audioName, clips: S.clips, style: S.style, preset: S.preset, format: S.format };
    downloadBlob(`${baseName()}.motiontext.json`, new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    toast(t('m_saved'));
  };
  function loadProject(d) {
    if (!d || !Array.isArray(d.clips)) throw new Error(t('m_badProject'));
    S.clips = d.clips
      .filter((c) => c && typeof c.text === 'string' && Number.isFinite(+c.start) && Number.isFinite(+c.end) && +c.end > +c.start)
      .map((c) => {
        const words = Array.isArray(c.words) ? c.words.filter((w) => w && typeof w.w === 'string' && Number.isFinite(+w.s) && Number.isFinite(+w.e)).map((w) => ({ w: w.w, s: +w.s, e: +w.e })) : null;
        return newClip(c.text, +c.start, +c.end, words);
      });
    if (d.style && typeof d.style === 'object') {
      const base = defaultStyle();
      for (const k in base) if (k in d.style && typeof d.style[k] === typeof base[k]) base[k] = d.style[k];
      S.style = base;
    }
    S.preset = PRESETS[d.preset] ? d.preset : 'neon';
    S.format = FORMATS[d.format] ? d.format : '9:16';
    applyFormat(); syncControls(); resetHistory(); renderList(); tlDirty = true;
  }
  $('openProject').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try { loadProject(JSON.parse(await f.text())); toast(f.name); } catch (err) { toast(err.message || t('m_badProject')); }
    e.target.value = '';
  };

  /* -------------------------------------------------------------- AI transcription */
  const MAXC = 42, MAXD = 5;
  function refineSegment(seg) {
    const words = seg.words && seg.words.length ? seg.words : null;
    const text = String(seg.text || '').trim();
    if (!text) return [];
    if (words) {
      if (text.length <= MAXC && seg.end - seg.start <= MAXD) return [newClip(text, seg.start, seg.end, words)];
      const out = [];
      let cur = [];
      const flush = () => {
        if (!cur.length) return;
        out.push(newClip(cur.map((w) => w.w).join(' '), cur[0].s, Math.max(cur[cur.length - 1].e, cur[0].s + 0.1), cur));
        cur = [];
      };
      for (const w of words) {
        const len = cur.map((x) => x.w).join(' ').length + w.w.length + 1;
        if (cur.length && (len > MAXC || w.e - cur[0].s > MAXD)) flush();
        cur.push(w);
        if (/[.!?]$/.test(w.w) && cur.length >= 3) flush();
      }
      flush();
      return out;
    }
    if (text.length <= MAXC * 1.3) return [newClip(text, seg.start, seg.end)];
    const toks = text.split(/\s+/);
    const groups = [];
    let g = '';
    for (const tk of toks) { if (g && (g + ' ' + tk).length > MAXC) { groups.push(g); g = tk; } else g = g ? g + ' ' + tk : tk; }
    if (g) groups.push(g);
    const total = groups.reduce((n, x) => n + x.length, 0);
    let cur = seg.start;
    return groups.map((tx2) => { const s = cur; cur += ((seg.end - seg.start) * tx2.length) / total; return newClip(tx2, s, cur); });
  }

  let providerInfo = null;
  function renderProviderStatus() {
    const el = $('providerStatus');
    if (providerInfo === false) { setStatus('providerStatus', t('m_noBackend'), 'err'); return; }
    if (!providerInfo) { el.textContent = ''; return; }
    const g = providerInfo.providers.groq.configured, o = providerInfo.providers.openai.configured;
    setStatus('providerStatus', t('m_serverKeys', { g: g ? '✓' : '✗', o: o ? '✓' : '✗' }), g || o ? 'ok' : '');
  }
  async function loadHealth() {
    try {
      const r = await fetch('/api/health', { cache: 'no-store' });
      providerInfo = await r.json();
      if (providerInfo.auth) { $('tokenRow').classList.remove('hidden'); $('accessToken').classList.remove('hidden'); $('keysBox').open = true; }
      if (!providerInfo.providers.groq.configured && !providerInfo.providers.openai.configured) $('keysBox').open = true;
    } catch { providerInfo = false; }
    renderProviderStatus();
    updateTrimInfo();
  }

  const keyEls = { groq: $('groqKey'), openai: $('openaiKey'), token: $('accessToken') };
  function loadKeys() {
    const raw = store.get('localStorage', 'mts:keys');
    const sess = store.get('sessionStorage', 'mts:keys');
    $('rememberKeys').checked = !!raw;
    try {
      const k = JSON.parse(raw || sess || '{}');
      keyEls.groq.value = k.groq || ''; keyEls.openai.value = k.openai || '';
    } catch { /* ignore */ }
    keyEls.token.value = store.get('sessionStorage', 'mts:token') || '';
  }
  function saveKeys() {
    const data = JSON.stringify({ groq: keyEls.groq.value.trim(), openai: keyEls.openai.value.trim() });
    if ($('rememberKeys').checked) { store.set('localStorage', 'mts:keys', data); store.del('sessionStorage', 'mts:keys'); }
    else { store.set('sessionStorage', 'mts:keys', data); store.del('localStorage', 'mts:keys'); }
    store.set('sessionStorage', 'mts:token', keyEls.token.value);
  }
  [keyEls.groq, keyEls.openai, keyEls.token, $('rememberKeys')].forEach((el) => el.addEventListener('change', saveKeys));
  $('transcriptLanguage').value = store.get('localStorage', 'mts:stt-lang') || '';
  $('transcriptLanguage').addEventListener('change', (e) => store.set('localStorage', 'mts:stt-lang', e.target.value));

  /* ------------------------------------------------------------ trim + chunking */
  const R16 = 16000;
  const TRIM = { start: 0, end: 0 }; // end 0 = until the end of the song
  let pcm16 = null;                  // whole song, 16 kHz mono (what Whisper uses internally anyway)

  async function resample16k(buf) {
    const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const oc = new OC(1, Math.max(1, Math.ceil(buf.duration * R16)), R16);
    const src = oc.createBufferSource();
    src.buffer = buf; src.connect(oc.destination); src.start();
    return (await oc.startRendering()).getChannelData(0);
  }
  function wavBlob(samples, from, to) {
    const n = Math.max(0, to - from), buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const str = (o, x) => { for (let i = 0; i < x.length; i++) v.setUint8(o + i, x.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, R16, true); v.setUint32(28, R16 * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) { const x = clamp(samples[from + i], -1, 1); v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true); }
    return new Blob([buf], { type: 'audio/wav' });
  }
  function trimRange() {
    const dur = totalDur();
    const a = clamp(TRIM.start, 0, Math.max(0, dur - 0.5));
    const b = TRIM.end > a + 0.5 ? Math.min(TRIM.end, dur) : dur;
    return { a, b, dur, trimmed: a > 0.05 || b < dur - 0.05 };
  }
  const maxUploadBytes = () => (providerInfo && providerInfo.maxMB ? providerInfo.maxMB : 25) * 1048576;
  // Cut chunks where the music is quietest (±win seconds) so words are rarely split.
  function quietPoint(tm, win) {
    const lo = Math.max(0, Math.floor((tm - win) * R16)), hi = Math.min(pcm16.length, Math.floor((tm + win) * R16));
    const step = 1600;
    let best = tm, bestE = Infinity;
    for (let i = lo; i + step <= hi; i += 800) {
      let e = 0;
      for (let j = i; j < i + step; j += 4) e += pcm16[j] * pcm16[j];
      if (e < bestE) { bestE = e; best = (i + step / 2) / R16; }
    }
    return best;
  }
  function planUpload() {
    const { a, b, dur, trimmed } = trimRange();
    const max = maxUploadBytes();
    if (!trimmed && currentFile && currentFile.size <= max * 0.97) {
      return { a, b, trimmed, bytes: currentFile.size, chunks: [{ s: 0, e: dur, file: currentFile, name: currentFile.name }] };
    }
    if (!pcm16) return { a, b, trimmed, error: true, bytes: currentFile ? currentFile.size : 0, chunks: [] };
    const perChunk = Math.max(10, Math.floor((max * 0.85 - 44) / (R16 * 2)));
    const total = b - a, n = Math.max(1, Math.ceil(total / perChunk)), len = total / n;
    const cuts = [a];
    for (let k = 1; k < n; k++) cuts.push(quietPoint(a + k * len, Math.min(3, len / 3)));
    cuts.push(b);
    const base = baseName(), chunks = [];
    for (let k = 0; k < n; k++) {
      const s = cuts[k], e = cuts[k + 1];
      chunks.push({ s, e, i0: Math.round(s * R16), i1: Math.min(pcm16.length, Math.round(e * R16)), name: `${base}_${k + 1}.wav` });
    }
    return { a, b, trimmed, bytes: chunks.reduce((sum, c) => sum + (c.i1 - c.i0) * 2 + 44, 0), chunks };
  }
  function updateTrimInfo() {
    const el = $('trimInfo');
    if (!el) return;
    if (!currentFile) { el.textContent = ''; el.classList.remove('err'); return; }
    const p = planUpload();
    if (p.error) { el.textContent = t('m_noPcm'); el.classList.add('err'); return; }
    el.classList.remove('err');
    const mb = (p.bytes / 1048576).toFixed(1);
    el.textContent = !p.trimmed && p.chunks.length === 1 && p.chunks[0].file
      ? t('m_trimFull', { mb })
      : t('m_trimInfo', { a: fmt(p.a), b: fmt(p.b), d: Math.round(p.b - p.a), mb, n: p.chunks.length });
  }
  function normalizeTrim() {
    const dur = totalDur();
    if (TRIM.end >= dur - 0.05) TRIM.end = 0;
    if (TRIM.end && TRIM.end <= TRIM.start + 0.5) TRIM.end = 0;
  }
  function syncTrimInputs() {
    const r = trimRange();
    $('trimStart').value = r2(r.a);
    $('trimEnd').value = r2(r.b);
    tlDirty = true;
    updateTrimInfo();
  }
  $('trimStart').onchange = (e) => { const v = parseFloat(e.target.value); TRIM.start = Number.isFinite(v) ? Math.max(0, v) : 0; normalizeTrim(); syncTrimInputs(); };
  $('trimEnd').onchange = (e) => { const v = parseFloat(e.target.value); TRIM.end = Number.isFinite(v) && v > 0 ? v : 0; normalizeTrim(); syncTrimInputs(); };
  $('trimSetStart').onclick = () => { TRIM.start = audio.currentTime || 0; normalizeTrim(); syncTrimInputs(); };
  $('trimSetEnd').onclick = () => { TRIM.end = audio.currentTime || 0; normalizeTrim(); syncTrimInputs(); };
  $('trimReset').onclick = () => { TRIM.start = 0; TRIM.end = 0; syncTrimInputs(); };
  audio.addEventListener('loadedmetadata', syncTrimInputs);

  /* ------------------------------------------------------------ transcription */
  let xhr = null, cancelled = false;
  $('cancelTranscribe').onclick = () => { cancelled = true; if (xhr) xhr.abort(); };

  function postAudio(blob, name, onPhase) {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append('audio', blob, name);
      fd.append('language', $('transcriptLanguage').value);
      fd.append('prompt', $('sttPrompt').value.trim());
      fd.append('words', $('wordStamps').checked ? '1' : '0');
      const gk = keyEls.groq.value.trim(), ok = keyEls.openai.value.trim();
      if (gk) fd.append('groqKey', gk);
      if (ok) fd.append('openaiKey', ok);
      const x = (xhr = new XMLHttpRequest());
      x.open('POST', '/api/transcribe');
      x.timeout = 240000;
      if (keyEls.token.value) x.setRequestHeader('x-access-token', keyEls.token.value);
      x.upload.onprogress = (e) => { if (e.lengthComputable) onPhase('up', e.loaded / e.total); };
      x.upload.onload = () => onPhase('wait', 1);
      x.onerror = () => reject(new Error(t('m_noBackend')));
      x.ontimeout = () => reject(new Error(t('m_timeout')));
      x.onabort = () => reject(Object.assign(new Error('cancelled'), { cancelled: true }));
      x.onload = () => {
        let data = null;
        try { data = JSON.parse(x.responseText); } catch { /* ignore */ }
        if (x.status < 200 || x.status >= 300 || !data) return reject(new Error((data && data.error) || (x.status === 413 ? t('m_413') : `HTTP ${x.status}`)));
        resolve(data);
      };
      x.send(fd);
    });
  }

  $('transcribeBtn').onclick = async () => {
    const meter = $('transcriptionMeter'), btn = $('transcribeBtn'), cancel = $('cancelTranscribe');
    if (!currentFile) return setStatus('transcriptionStatus', t('m_needAudio'), 'err');
    const gk = keyEls.groq.value.trim(), ok = keyEls.openai.value.trim();
    const serverHas = providerInfo && (providerInfo.providers.groq.configured || providerInfo.providers.openai.configured);
    if (!gk && !ok && !serverHas) return setStatus('transcriptionStatus', t('m_noKeys'), 'err');
    const plan = planUpload();
    if (plan.error) return setStatus('transcriptionStatus', t('m_tooBig', { n: Math.round(maxUploadBytes() / 1048576) }), 'err');
    saveKeys();

    btn.disabled = true; cancel.hidden = false; cancelled = false; meter.style.width = '3%';
    const n = plan.chunks.length, got = [];
    let provider = '', fell = false, failure = null;
    for (let i = 0; i < n; i++) {
      const c = plan.chunks[i], tag = n > 1 ? ` (${i + 1}/${n})` : '';
      const base = (i / n) * 100, span = 100 / n;
      let crawl = 0;
      try {
        setStatus('transcriptionStatus', t('m_uploading', { p: 0 }) + tag);
        const blob = c.file || wavBlob(pcm16, c.i0, c.i1);
        const data = await postAudio(blob, c.name, (phase, p) => {
          if (phase === 'up') {
            meter.style.width = `${Math.max(3, base + p * span * 0.5)}%`;
            setStatus('transcriptionStatus', t('m_uploading', { p: Math.round(p * 100) }) + tag);
          } else {
            setStatus('transcriptionStatus', t('m_processing') + tag);
            let w = base + span * 0.5;
            crawl = setInterval(() => { w = Math.min(base + span * 0.95, w + span * 0.012); meter.style.width = `${w}%`; }, 400);
          }
        });
        clearInterval(crawl);
        const off = c.s;
        for (const sg of Array.isArray(data.segments) ? data.segments : []) {
          got.push({
            text: sg.text, start: +sg.start + off, end: +sg.end + off,
            words: Array.isArray(sg.words) ? sg.words.filter((w) => w && w.w && Number.isFinite(+w.s) && Number.isFinite(+w.e)).map((w) => ({ w: String(w.w), s: +w.s + off, e: +w.e + off })) : null,
          });
        }
        provider = data.provider;
        if (data.attempts && data.attempts.length) fell = true;
        meter.style.width = `${base + span}%`;
      } catch (err) { clearInterval(crawl); failure = err; break; }
    }
    xhr = null; btn.disabled = false; cancel.hidden = true;

    const clips = got.flatMap(refineSegment);
    if (!clips.length) {
      meter.style.width = '0%';
      if (!failure) return setStatus('transcriptionStatus', t('m_noSegs'), 'err');
      return failure.cancelled ? setStatus('transcriptionStatus', t('m_cancelled')) : setStatus('transcriptionStatus', t('m_err', { e: failure.message }), 'err');
    }
    // When only a part was transcribed, keep captions outside that part.
    const keep = plan.trimmed ? S.clips.filter((k) => k.end <= plan.a + 0.01 || k.start >= plan.b - 0.01) : [];
    S.clips = [...keep, ...clips];
    commit();
    if (failure) {
      meter.style.width = '0%';
      return failure.cancelled ? setStatus('transcriptionStatus', t('m_cancelled')) : setStatus('transcriptionStatus', t('m_partial', { e: failure.message }), 'err');
    }
    meter.style.width = '100%';
    setStatus('transcriptionStatus', t('m_done', { p: provider, n: clips.length }) + (fell ? t('m_fellback') : ''), 'ok');
  };

  /* ---------------------------------------------------------------- export video */
  let exporting = false, rec = null, recChunks = [], recCancelled = false, wake = null, lastUrl = null;
  function pickMime() {
    const list = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return list.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
  }
  async function startExport() {
    if (!audio.src) return toast(t('m_needAudio'));
    if (!canvas.captureStream || !window.MediaRecorder || !setupAudio()) return setStatus('recordStatus', t('m_noRec'), 'err');
    try {
      await A.ctx.resume();
      audio.pause(); audio.currentTime = 0;
      const stream = canvas.captureStream(30);
      A.dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
      const mime = pickMime();
      const bps = canvas.width * canvas.height > 1.2e6 ? 8e6 : 5e6;
      rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: bps, audioBitsPerSecond: 192000 });
      recChunks = []; recCancelled = false;
      rec.ondataavailable = (e) => { if (e.data && e.data.size) recChunks.push(e.data); };
      rec.onstop = () => {
        exporting = false;
        A.gain.gain.value = 1;
        if (wake) { wake.release().catch(() => {}); wake = null; }
        $('exportBtn').textContent = t('exportVideo');
        $('exportMeter').style.width = recCancelled ? '0%' : '100%';
        if (recCancelled) return setStatus('recordStatus', t('m_recCancel'));
        const type = rec.mimeType || mime || 'video/webm';
        const name = `${baseName()}.${type.includes('mp4') ? 'mp4' : 'webm'}`;
        const blob = new Blob(recChunks, { type });
        if (lastUrl) URL.revokeObjectURL(lastUrl);
        lastUrl = URL.createObjectURL(blob);
        const a = $('dlLast'); a.href = lastUrl; a.download = name; a.textContent = `⬇ ${name}`; a.classList.remove('hidden');
        downloadBlob(name, blob);
        setStatus('recordStatus', t('m_recDone', { f: name }), 'ok');
      };
      A.gain.gain.value = $('muteExport').checked ? 0 : 1;
      try { wake = navigator.wakeLock ? await navigator.wakeLock.request('screen') : null; } catch { wake = null; }
      rec.start(1000);
      exporting = true;
      $('exportBtn').textContent = t('stop');
      setStatus('recordStatus', t('m_recStart'));
      audio.addEventListener('ended', stopExport, { once: true });
      await audio.play();
    } catch (err) {
      exporting = false; A.gain && (A.gain.gain.value = 1);
      setStatus('recordStatus', t('m_recFail', { e: err.message }), 'err');
    }
  }
  function stopExport(cancel) {
    if (rec && rec.state === 'recording') { recCancelled = cancel === true; rec.stop(); }
    audio.pause();
  }
  $('exportBtn').onclick = () => { if (exporting) stopExport(true); else startExport(); };

  /* -------------------------------------------------------------------- shortcuts */
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); return; }
    if (typing || mod || e.altKey) return;
    if (TAP.on && (e.key === 't' || e.key === 'T' || e.key === 'Enter')) { e.preventDefault(); tapPress(); return; }
    if (TAP.on && e.key === 'Escape') { tapFinish(true); return; }
    switch (e.key) {
      case ' ': e.preventDefault(); togglePlay(); break;
      case 'ArrowLeft': e.preventDefault(); seekTo((audio.currentTime || 0) - (e.shiftKey ? 1 : 5)); break;
      case 'ArrowRight': e.preventDefault(); seekTo((audio.currentTime || 0) + (e.shiftKey ? 1 : 5)); break;
      case 's': case 'S': splitAtPlayhead(); break;
      case 't': case 'T': tapStart(); break;
      case '[': { const c = clipById(S.sel); if (c) { const o = JSON.parse(JSON.stringify(c)); retime(c, o, Math.min(audio.currentTime || 0, c.end - 0.1), c.end); commit(); } break; }
      case ']': { const c = clipById(S.sel); if (c) { const o = JSON.parse(JSON.stringify(c)); retime(c, o, c.start, Math.max(audio.currentTime || 0, c.start + 0.1)); commit(); } break; }
      case 'Delete': case 'Backspace': if (S.sel) { S.clips = S.clips.filter((c) => c.id !== S.sel); S.sel = null; commit(); } break;
      default:
    }
  });
  $('undoBtn').onclick = undo;
  $('redoBtn').onclick = redo;
  $('langBtn').onclick = () => { lang = lang === 'sw' ? 'en' : 'sw'; store.set('localStorage', 'mts:lang', lang); applyI18n(); };

  /* ---------------------------------------------------------------------- main loop */
  let lastFrame = performance.now();
  let lastClock = '';
  function loop(now) {
    const dt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    analyze(dt, now);
    const tm = audio.currentTime || 0;
    drawFrame(ctx, canvas.width, canvas.height, tm);
    const playing = !audio.paused && !audio.ended;
    if (playing) {
      // follow playhead when zoomed in
      if (V.span < totalDur() - 0.01 && (tm > V.start + V.span * 0.95 || tm < V.start)) { V.start = tm - V.span * 0.1; clampView(); }
      $('audioMeter').style.width = `${Math.min(100, B.bass * 200)}%`;
      $('previewMode').textContent = exporting ? t('exporting') : B.beat > 0.35 ? t('beat') : t('live');
      if (exporting && audio.duration) $('exportMeter').style.width = `${Math.min(99, (tm / audio.duration) * 100)}%`;
    }
    if (playing || tlDirty || drag) { drawTimeline(); tlDirty = false; }
    const clock = `${fmt(tm)} / ${fmt(audio.duration || 0)}`;
    if (clock !== lastClock) { $('clock').textContent = clock; lastClock = clock; }
    requestAnimationFrame(loop);
  }

  /* --------------------------------------------------------------------------- init */
  function init() {
    try {
      const raw = store.get('localStorage', 'mts:autosave');
      if (raw) { const d = JSON.parse(raw); if (d && Array.isArray(d.clips) && d.clips.length) { loadProject(d); toast(t('m_restored')); } }
    } catch { /* ignore corrupt autosave */ }
    applyFormat();
    syncControls();
    resetHistory();
    loadKeys();
    applyI18n();
    $('previewMode').textContent = t('waiting');
    loadHealth();
    requestAnimationFrame(loop);
  }
  init();

  /* ------------------------------------------------------------------ PWA */
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('installBtn').hidden = false; });
  $('installBtn').onclick = async () => {
    if (!installEvt) return;
    installEvt.prompt();
    try { await installEvt.userChoice; } catch { /* ignore */ }
    installEvt = null; $('installBtn').hidden = true;
  };
  window.addEventListener('appinstalled', () => { $('installBtn').hidden = true; toast(t('m_installed')); });
  if ('serviceWorker' in navigator) {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) toast(t('m_update')); });
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* needs https or localhost */ }); });
  }
})();

/*fix2*/
