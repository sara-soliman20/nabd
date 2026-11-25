// واجهة شات Gemini (دردشة عامة + صور + صوت) عبر الخادم. شات الـ NLP/LLM الذي بنيناه منفصل تماماً (src/nlp) ولا يستخدم هذا الملف.
// في المتصفح العادي: نفس النطاق. في تطبيق الموبايل (Capacitor): ضع VITE_API_BASE=https://your-server قبل البناء.
import { isNative } from '../utils/platform.js'
export const API = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
// نسخة APK بدون خادم (لم يُضبط VITE_API_BASE): لا توجد محاولات اتصال، والشات يعمل بمحرك نبض المحلي.
export const OFFLINE_BUILD = isNative && !API
const err = (code, detail) => Object.assign(new Error(code), { code, detail })
const post = async (path, body) => {
  let r; try { r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(40000) }) } catch { throw err('server_down') }
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw err(d.error || (r.status >= 500 ? 'server_down' : 'error'), d.detail) }
  return r
}
export const checkHealth = async () => {
  if (OFFLINE_BUILD) return { gemini: false, reason: 'offline_build' }
  try { const r = await fetch(API + '/api/health', { signal: AbortSignal.timeout(8000) }); const d = await r.json(); if (typeof d?.gemini !== 'boolean') throw 0; return d }
  catch { return { gemini: false, reason: 'server_down' } }
}
/** رد Gemini: { answer, mode:'gemini', image?, sources, emergency }. يرمي خطأ بـ code/detail عند الفشل. */
export async function askNabd(messages, { voice = false, image = false, lang = 'ar' } = {}) {
  return (await post('/api/chat', { messages: messages.map(({ role, text }) => ({ role, text })), voice, image, lang })).json()
}
export async function imageNabd(prompt) { return (await (await post('/api/image', { prompt })).json()).image }
export async function speakNabd(text) { return (await post('/api/tts', { text })).arrayBuffer() } // WAV
export async function transcribeNabd(audio) { return (await (await post('/api/stt', { audio })).json()).text || '' } // audio: WAV base64
/** رد متدفق: onChunk(جزء نص) فور وصوله. signal لإلغاء الطلب (مقاطعة المستخدم). يرجع النص الكامل. */
export async function streamNabd(messages, { voice = true, onChunk, signal, lang = 'ar' } = {}) {
  let r; try { r = await fetch(API + '/api/chat-stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal, body: JSON.stringify({ messages: messages.map(({ role, text }) => ({ role, text })), voice, lang }) }) }
  catch (e) { if (e.name === 'AbortError') throw e; throw err('server_down') }
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw err(d.error || (r.status >= 500 ? 'server_down' : 'error'), d.detail) }
  const dec = new TextDecoder(); let buf = '', full = ''
  for await (const chunk of r.body) {
    buf += dec.decode(chunk, { stream: true }); let i
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 2); if (!line.startsWith('data:')) continue
      const d = JSON.parse(line.slice(5)); if (d.error) throw err(d.error, d.detail); if (d.t) { full += d.t; onChunk?.(d.t) }
    }
  }
  if (!full.trim()) throw err('empty')
  return full
}
