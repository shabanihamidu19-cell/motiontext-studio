# MotionText Studio v1.2

Pakia wimbo → pata maneno (AI au Tap-Sync) → hariri kwenye timeline → animation inayojibu muziki → toa video (MP4/WebM).
Hakuna dependencies: Node 20+ pekee.

## A) Kuendesha kwenye simu/kompyuta (Termux, Linux, Mac, Windows)

```bash
cd motiontext-studio
cp .env.example .env     # weka GROQ_API_KEY na/au OPENAI_API_KEY
npm start                # fungua http://127.0.0.1:8787
```
Ukiona transcription inakwama: fungua `http://127.0.0.1:8787/api/selftest` kuangalia kama server inafika Groq/OpenAI.

## B) Kuweka kwenye Vercel

1. Weka folda hii kwenye GitHub repo (`.env` haipandi, `.gitignore` inailinda).
2. Vercel → Add New → Project → chagua repo. Hakuna build: Framework "Other", `vercel.json` inajitosheleza.
3. Settings → Environment Variables (chagua MOJA):
   - **Salama zaidi:** `ACCESS_TOKEN` (neno refu la siri) + `GROQ_API_KEY`. Kwenye app, andika token kwenye "Access token".
   - **Bila keys kwenye server:** usiweke chochote; andika Groq key yako kwenye app ("Tumia API key yangu"). Keys za server hazitumiki kamwe kwenye Vercel bila `ACCESS_TOKEN`, ili mtu asitumie quota yako kwa kujua URL tu.
4. Redeploy. Fungua `https://jina-lako.vercel.app/api/selftest` kuangalia mtandao.

Mipaka ya Vercel (imethibitishwa kwenye docs za Vercel, Nov 2026): body ya request ≤ 4.5 MB; muda wa function hadi sekunde 300 kwenye Hobby. App inashughulikia kikomo cha ukubwa kiotomatiki kwa **Trim + vipande** (angalia chini).

## C) Kuiweka kwenye simu kama app (PWA, bure)

Baada ya kuweka kwenye Vercel (HTTPS inahitajika; `127.0.0.1` pia inafanya kazi kwa majaribio):
1. Fungua `https://jina-lako.vercel.app` kwenye **Chrome ya Android**.
2. Bonyeza kitufe cha **"⬇ Sakinisha app"** kinachotokea juu, au menyu ya Chrome (⋮) → **Install app** / **Add to Home screen**.
3. Ikoni ya MotionText inaingia kwenye skrini ya nyumbani na inafunguka bila mwambaa wa kivinjari.

- Inafanya kazi **bila mtandao**: kufungua, kuhariri captions, timeline, preview, na kuhifadhi mradi. Transcription ya AI na kupakua toleo jipya vinahitaji mtandao.
- iPhone: Safari → Share → **Add to Home Screen** (kitufe cha Sakinisha hakitokei kwenye iPhone).
- Toleo jipya likipakuliwa, app inakuambia ufunge na ufungue tena.
- Kila unapotoa toleo jipya: badilisha `VERSION` ndani ya `public/sw.js` (jaribio linakagua inalingana na `package.json`).
- Kumbuka: app ya PWA haihifadhi nyimbo zako; inahifadhi mradi (captions na mitindo) kwenye kifaa. Pakia wimbo tena ukifungua.

## Trim na vipande (kupunguza ukubwa wa faili la kutranscribe)

- Kwenye sehemu ya "AI Transcription": chagua mwanzo/mwisho (andika sekunde, au "Mwanzo = sasa" / "Mwisho = sasa" ukiwa umesimamisha wimbo mahali pake). Sehemu isiyochaguliwa inafifia kwenye timeline.
- Ukichagua sehemu, faili linabadilishwa kuwa WAV ya 16 kHz mono ndani ya kivinjari (Whisper yenyewe hutumia muundo huo ndani, hivyo usahihi hautelemki).
- Sehemu ikiwa kubwa kuliko kikomo cha server, inagawanywa kwenye vipande vinavyokatwa penye ukimya, vinatumwa moja moja, na captions zinaunganishwa kwa muda sahihi.
- Wimbo mzima unaotoshea kikomo unatumwa kama faili asili (MP3 yako, bila kubadilishwa).
- Ukibadilisha sehemu moja tu na kutranscribe tena, captions za nje ya sehemu hiyo zinabaki.
- Kama kivinjari hakiwezi kusoma faili (au ni > 80 MB), trimming haipatikani; tumia MP3 ndogo.

Takriban ukubwa: 1 dakika ≈ 1.9 MB (WAV iliyopunguzwa). Wimbo wa dakika 4 kwenye Vercel = vipande 3.

## Majaribio
`npm test` (17 tests) · `npm run check` (syntax).

## Vipengele vikuu
- **Usalama:** keys kwenye server (.env / Vercel env), CSP kali, rate limit, kikomo cha ukubwa, `ACCESS_TOKEN` hiari, 127.0.0.1 kwa chaguo-msingi.
- **Transcription:** Groq → OpenAI fallback, retry kwenye 429/5xx, timeout ya sekunde 75, muda wa kila neno (karaoke), kichujio cha hallucination, Ghairi, upload progress, logs za `[transcribe]` kwenye server.
- **Editor:** timeline ya waveform (buruta kingo/katikati, zoom), Tap-Sync, undo/redo, split/merge, hifadhi/fungua mradi, autosave.
- **Captions:** leta SRT/VTT/LRC; toa SRT/VTT/LRC/TTML (TTML ina muda wa kila neno).
- **Video:** 9:16 (720p/1080p), 1:1, 16:9; MP4 pale inapowezekana, vinginevyo WebM; Ghairi; wake-lock.
- UI ya Kiswahili na English.

## Mipaka
- Export ya video ni kwa muda halisi (dakika 3 = dakika 3). Weka tab wazi na inayoonekana.
- Usahihi wa AI kwenye muziki/rap hupungua; Tap-Sync au pitia captions kabla ya export.
- Matumizi ya API yanaweza kutozwa na provider wako. Model ya OpenAI inabadilishwa kupitia `OPENAI_STT_MODEL`.
