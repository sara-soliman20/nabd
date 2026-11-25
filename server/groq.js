// مزوّد Groq (مجاني، متوافق مع OpenAI): دردشة (Llama) + تفريغ صوت (Whisper يفهم اللهجات). بديل أو احتياط لـ Gemini.
// لا يدعم النطق/الصور هنا: النطق يرجع لصوت المتصفح. المفتاح من console.groq.com ← GROQ_API_KEY.
import { systemText, refBlock } from './prompts.js'
const BASE = () => (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '')
const CHAT_MODEL = () => (process.env.GROQ_MODEL || '').trim() || 'llama-3.3-70b-versatile'
const STT_MODEL = () => (process.env.GROQ_STT_MODEL || '').trim() || 'whisper-large-v3'
export const groqOn = () => !!(process.env.GROQ_API_KEY || '').trim()
const key = () => ({ Authorization: `Bearer ${(process.env.GROQ_API_KEY || '').trim()}` })
const coded = (code, detail) => Object.assign(new Error(code), { code, detail })
const fail = (status, body) => coded(status === 429 ? 'quota' : status === 401 || status === 403 ? 'bad_key' : status === 404 ? 'bad_model' : status === 400 ? 'bad_request' : 'upstream', `Groq ${status}: ${String(body).slice(0, 300)}`)
async function http(path, opts, ms) {
  const t = AbortSignal.timeout(ms), signal = opts.signal ? AbortSignal.any([t, opts.signal]) : t
  try { return await fetch(BASE() + path, { ...opts, signal }) } catch (e) { throw coded('upstream', `network: ${e.cause?.code || e.name}: ${e.message}`) }
}
// أدوار OpenAI: system ثم user/assistant بالتناوب؛ المحتوى المرجعي يُلحق بآخر رسالة user.
function body(messages, topics, voice, lang, stream) {
  const out = []
  for (const m of messages) {
    const role = m.role === 'user' ? 'user' : 'assistant'
    if (!out.length && role !== 'user') continue
    if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += '\n' + m.text; else out.push({ role, content: m.text })
  }
  if (out.length && out[out.length - 1].role === 'user') out[out.length - 1].content += refBlock(topics)
  return { model: CHAT_MODEL(), stream, temperature: voice ? 0.7 : 0.4, max_tokens: voice ? 500 : 2000, messages: [{ role: 'system', content: systemText(voice, lang) }, ...out] }
}
const jh = { 'Content-Type': 'application/json' }
export async function checkGroq() {
  const r = await http('/models', { headers: key() }, 10000); if (!r.ok) throw fail(r.status, await r.text())
  return { model: CHAT_MODEL() }
}
export async function askGroq(messages, topics = [], voice = false, lang = 'ar') {
  const r = await http('/chat/completions', { method: 'POST', headers: { ...jh, ...key() }, body: JSON.stringify(body(messages, topics, voice, lang, false)) }, 30000)
  if (!r.ok) throw fail(r.status, await r.text())
  return ((await r.json()).choices?.[0]?.message?.content || '').trim()
}
export async function streamGroq(messages, topics, voice, onText, signal, lang = 'ar') {
  const r = await http('/chat/completions', { method: 'POST', headers: { ...jh, ...key() }, signal, body: JSON.stringify(body(messages, topics, voice, lang, true)) }, 40000)
  if (!r.ok) throw fail(r.status, await r.text())
  const dec = new TextDecoder(); let buf = '', full = ''
  for await (const chunk of r.body) {
    buf += dec.decode(chunk, { stream: true }); let i
    while ((i = buf.search(/\r?\n\r?\n/)) >= 0) {
      const ev = buf.slice(0, i); buf = buf.slice(i).replace(/^\r?\n\r?\n/, '')
      const line = ev.split(/\r?\n/).find(l => l.startsWith('data:')); if (!line || /\[DONE\]/.test(line)) continue
      let d; try { d = JSON.parse(line.slice(5)) } catch { continue }
      const t = d.choices?.[0]?.delta?.content; if (t) { full += t; onText(t) }
    }
  }
  return full
}
// صوت (WAV base64) -> نص. بدون تحديد لغة: Whisper يكتشف اللغة واللهجة تلقائياً.
export async function transcribeGroq(b64) {
  const fd = new FormData(); fd.append('file', new Blob([Buffer.from(b64, 'base64')], { type: 'audio/wav' }), 'a.wav')
  fd.append('model', STT_MODEL()); fd.append('temperature', '0'); fd.append('response_format', 'json')
  const r = await http('/audio/transcriptions', { method: 'POST', headers: key(), body: fd }, 30000)
  if (!r.ok) throw fail(r.status, await r.text())
  const t = String((await r.json()).text || '').trim()
  return /^(thank you|thanks for watching|شكرا (على|لكم)|اشتركوا|ترجمة)/i.test(t) && t.length < 40 ? '' : t // هلوسات Whisper المعروفة على الصمت
}
