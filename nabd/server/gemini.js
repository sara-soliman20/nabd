// طبقة الاتصال بـ Gemini: دردشة عامة + صور + صوت. مستقلة تماماً عن محرك الـ NLP/LLM الذي بنيناه (src/nlp).
// لتغيير المزوّد لاحقاً، عدّل هذا الملف فقط. لمعرفة النماذج المتاحة لمفتاحك: npm run gemini:models
import { systemText, buildContents } from './prompts.js'

const BASE = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '')
let model = (process.env.GEMINI_MODEL || '').trim() || 'gemini-2.5-flash'
const hdr = () => ({ 'Content-Type': 'application/json', 'x-goog-api-key': (process.env.GEMINI_API_KEY || '').trim() })

// يحوّل أخطاء HTTP إلى رموز تفهمها الواجهة (notices.js).
const fail = (status, body) => {
  const e = new Error(`Gemini ${status}: ${String(body).slice(0, 300)}`); e.detail = e.message
  e.code = status === 404 ? 'bad_model' : status === 429 ? 'quota'
    : (status === 400 || status === 401 || status === 403) ? (/API key|API_KEY|PERMISSION|UNAUTHENTICATED/i.test(body) ? 'bad_key' : 'bad_request') : 'upstream'
  return e
}
const coded = (code, detail) => Object.assign(new Error(code), { code, detail })
async function http(url, opts, ms) {
  const t = AbortSignal.timeout(ms), signal = opts.signal ? AbortSignal.any([t, opts.signal]) : t
  try { return await fetch(url, { ...opts, signal }) }
  catch (e) { throw coded('upstream', `network: ${e.cause?.code || e.name}: ${e.message}`) }
}
async function listModels() {
  const r = await http(`${BASE}/models?pageSize=200`, { headers: hdr() }, 10000)
  if (!r.ok) throw fail(r.status, await r.text())
  return (await r.json()).models || []
}
const canGenerate = m => m.supportedGenerationMethods?.includes('generateContent')
const ver = n => (n.match(/gemini-(\d+(?:\.\d+)?)/) || [0, 0])[1]
// النماذج النصية المتاحة لمفتاحك مرتبة: flash أولاً، ثم flash-lite، ثم pro؛ والأحدث أولاً داخل كل مجموعة.
async function candidates() {
  const names = (await listModels()).filter(canGenerate).map(m => m.name.replace('models/', ''))
    .filter(n => /^gemini/.test(n) && !/image|tts|live|audio|embed|robotics|computer|vision|aqa|learnlm|native|exp/.test(n))
  const rank = n => (/flash-lite/.test(n) ? 1 : /flash/.test(n) ? 0 : /pro/.test(n) ? 2 : 3)
  return names.sort((x, y) => rank(x) - rank(y) || ver(y) - ver(x) || x.localeCompare(y))
}
let cands = null
// يتحقق من المفتاح ويختار نموذجاً متاحاً لو المضبوط غير موجود.
export const listAvailable = candidates
export async function checkGemini() {
  cands = await candidates()
  if (!cands.length) throw coded('bad_model', 'لا توجد نماذج توليد متاحة لهذا المفتاح (راجع npm run gemini:models)')
  if (!cands.includes(model)) model = cands[0]
  return { model, available: cands.slice(0, 8) }
}
async function gen(m, body, ms) {
  const r = await http(`${BASE}/models/${m}:generateContent`, { method: 'POST', headers: hdr(), body: JSON.stringify(body) }, ms)
  if (!r.ok) throw fail(r.status, await r.text())
  return r.json()
}
const parts = d => d.candidates?.[0]?.content?.parts || []
// نص الرد فقط: نتجاهل أجزاء "التفكير" (thought) كي لا تظهر للمستخدم.
const textRaw = d => {
  if (d.promptFeedback?.blockReason) throw coded('blocked')
  const c = d.candidates?.[0]; if (c?.finishReason === 'SAFETY' || c?.finishReason === 'PROHIBITED_CONTENT') throw coded('blocked')
  return parts(d).filter(p => p.text && !p.thought).map(p => p.text).join('')
}
const textOf = d => textRaw(d).trim()
// ينفّذ الطلب، ولو النموذج غير متاح (404) يجرب بدائله المتاحة (حتى 4) ويثبّت أول ما ينجح.
async function withText(makeBody) { return tryModels(m => gen(m, makeBody(m), 25000).then(textOf)) }
// ينفّذ run(model)، ولو النموذج غير متاح (404) يجرب بدائله المتاحة ويثبّت أول ما ينجح.
async function tryModels(run) {
  try { return await run(model) } catch (e) {
    if (e.code !== 'bad_model' && e.code !== 'quota') throw e
    // bad_model: النموذج غير موجود. quota: حصة هذا النموذج خلصت، ولكل نموذج حصته المستقلة فنجرّب غيره (مثلاً flash-lite) بدل ما يفشل الرد.
    console.error(`[gemini] النموذج "${model}" ${e.code === 'quota' ? 'حصته خلصت' : 'غير متاح'}، أبحث عن بديل...`)
    if (!cands) await checkGemini(); let last = e
    for (const m of [model, ...cands.filter(x => x !== model)].slice(0, 6)) {
      if (m === model && e.code === 'quota') continue
      try { const out = await run(m); if (e.code === 'bad_model') model = m; console.error(`[gemini] سأستخدم النموذج "${m}"`); return out } catch (er) { last = er; if (er.code !== 'bad_model' && er.code !== 'quota') throw er }
    }
    throw last
  }
}
const textCall = body => withText(() => body)
// نماذج 2.5 "تفكّر" وتستهلك من حد الإخراج، فنعطّل التفكير لأن الرد قصير ويعتمد على المحتوى المرجعي.
const thinkingOff = m => (/gemini-2\.5-(flash|pro)/.test(m) && !/lite/.test(m) && !/pro/.test(m) ? { thinkingConfig: { thinkingBudget: 0 } } : {})

export const currentModel = () => model
// topics: حالات اختيارية من مكتبة نبض (بحث بسيط) تُرفق كمرجع للأسئلة الإسعافية.
const SAFETY = ['HARM_CATEGORY_DANGEROUS_CONTENT', 'HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT'].map(category => ({ category, threshold: 'BLOCK_ONLY_HIGH' }))
const chatBody = (messages, topics, voice, lang) => m => ({
  systemInstruction: { parts: [{ text: systemText(voice, lang) }] },
  contents: buildContents(messages, topics),
  // الحدود سخية عمداً: نماذج Gemini 3 "تفكّر" افتراضياً وتستهلك من حد الإخراج، وحد ضيق كان يقطع الرد أو يرجعه فارغاً.
  generationConfig: { temperature: voice ? 0.7 : 0.4, maxOutputTokens: voice ? 1200 : 4000, ...thinkingOff(m) },
  safetySettings: SAFETY,
})
export async function askGemini(messages, topics = [], voice = false, lang = 'ar') { return withText(chatBody(messages, topics, voice, lang)) }

// رد متدفق (SSE من Gemini): onText(جزء) يُستدعى فور وصول كل جزء، فيبدأ الصوت قبل اكتمال الرد (يقلل التأخير كثيراً).
export async function streamGemini(messages, topics, voice, onText, signal, lang = 'ar') {
  const make = chatBody(messages, topics, voice, lang); let sent = false, full = ''
  const run = async m => {
    const r = await http(`${BASE}/models/${m}:streamGenerateContent?alt=sse`, { method: 'POST', headers: hdr(), body: JSON.stringify(make(m)), signal }, 40000)
    if (!r.ok) throw fail(r.status, await r.text())
    const dec = new TextDecoder(); let buf = ''
    for await (const chunk of r.body) {
      buf += dec.decode(chunk, { stream: true }); let i
      while ((i = buf.search(/\r?\n\r?\n/)) >= 0) {
        const ev = buf.slice(0, i); buf = buf.slice(i).replace(/^\r?\n\r?\n/, '')
        const line = ev.split(/\r?\n/).find(l => l.startsWith('data:')); if (!line) continue
        let d; try { d = JSON.parse(line.slice(5)) } catch { continue }
        const t = textRaw(d); if (t) { sent = true; full += t; onText(t) }
      }
    }
    return full
  }
  try { return await tryModels(run) } catch (e) { if (sent && e.code === 'bad_model') throw coded('upstream', e.detail); throw e }
}

// ───────── الصوت والصور ─────────
const resolved = {}
const MODEL_CFG = { tts: ['GEMINI_TTS_MODEL', 'gemini-2.5-flash-preview-tts', /tts/], image: ['GEMINI_IMAGE_MODEL', 'gemini-2.5-flash-image', /flash.*image|image.*flash/] }
// يجرب النموذج المضبوط، ولو غير موجود يبحث عن بديل متاح لنفس المفتاح.
async function withModel(kind, body, ms = 45000) {
  const [env, def, pat] = MODEL_CFG[kind], first = resolved[kind] || process.env[env] || def
  try { return await gen(first, body, ms) } catch (e) {
    if (e.code !== 'bad_model') throw e
    const alt = (await listModels()).filter(canGenerate).map(m => m.name.replace('models/', '')).filter(n => pat.test(n)).sort((a, b) => b.localeCompare(a, 'en', { numeric: true }))[0]
    if (!alt || alt === first) throw e
    resolved[kind] = alt; return gen(alt, body, ms)
  }
}
function pcmToWav(pcm, rate = 24000) {
  const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22)
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([h, pcm])
}
// نص -> صوت (WAV). يرجع null لو لم يرجع النموذج صوتاً.
export async function speakGemini(text) {
  // لا نفرض لهجة: النص مكتوب بلهجة المستخدم نفسها، فنطلب نطقه بنفس اللهجة والإيقاع كما ينطقه ابن البلد.
  const body = { contents: [{ parts: [{ text: `Read the following aloud in a warm, friendly, natural conversational voice, like a native speaker. Keep the exact language and dialect/accent the text is written in (for example Egyptian, Gulf, Levantine, Iraqi, Sudanese or Maghrebi Arabic, or English/French) and do NOT switch to formal Modern Standard Arabic. Say only the text, nothing else: ${text}` }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: process.env.GEMINI_VOICE || 'Kore' } } } } }
  const p = parts(await withModel('tts', body)).find(x => x.inlineData)?.inlineData
  if (!p) return null
  return pcmToWav(Buffer.from(p.data, 'base64'), +(/rate=(\d+)/.exec(p.mimeType || '')?.[1] || 24000))
}
// صوت (WAV base64) -> نص.
export async function transcribeGemini(b64, mime = 'audio/wav') {
  const body = { contents: [{ parts: [{ inlineData: { mimeType: mime, data: b64 } }, { text: 'فرّغ الكلام المسجّل حرفياً كما نُطق، بنفس اللغة واللهجة التي قالها المتحدث دون ترجمة ودون تحويل إلى الفصحى. المتحدث قد يتكلم بأي لهجة عربية (مصرية، خليجية، شامية، عراقية، سودانية، يمنية، ليبية، مغربية، جزائرية، تونسية...) أو بالإنجليزية أو الفرنسية أو يخلط بين لغتين، فاكتب كل كلمة بلغتها وبحروف اللهجة كما تُنطق. أعد النص فقط دون أي شرح أو علامات ترقيم زائدة أو ترجمة. لو لا يوجد كلام بشري واضح (صمت أو ضجيج أو موسيقى) أعد نصاً فارغاً تماماً ولا تخترع كلاماً.' }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 1000, ...thinkingOff(model) } }
  return textCall(body)
}
const IMG_STYLE = 'Simple flat vector educational illustration for a first-aid training guide. Calm soft colors (burgundy, blush pink, cream), white background, clean shapes. Modest friendly cartoon characters, anatomically careful hand and body positions. NO text, NO letters, NO numbers, NO blood or gore, NO realistic wounds. Subject: '
// وصف -> صورة. يرجع { mime, data(base64) } أو null (مثلاً لو رفضها فلتر الأمان).
export async function imageGemini(subject) {
  const body = { contents: [{ parts: [{ text: IMG_STYLE + String(subject).slice(0, 300) }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }
  const p = parts(await withModel('image', body, 60000)).find(x => x.inlineData?.mimeType?.startsWith('image/'))?.inlineData
  return p ? { mime: p.mimeType, data: p.data } : null
}
