// موجّه المزوّدين: Gemini و/أو Groq. الأساسي = AI_PROVIDER (gemini|groq) وإلا Gemini لو له مفتاح وإلا Groq.
// لو الأساسي فشل (حصة/شبكة/مفتاح) والآخر متاح نجرّب الآخر تلقائياً. النطق والصور من Gemini فقط (غيابهما يرجع لصوت المتصفح).
import * as G from './gemini.js'
import * as Q from './groq.js'
export const geminiOn = () => !!(process.env.GEMINI_API_KEY || '').trim()
export const anyAI = () => geminiOn() || Q.groqOn()
const order = () => {
  const all = { gemini: geminiOn(), groq: Q.groqOn() }, first = (process.env.AI_PROVIDER || '').toLowerCase() === 'groq' || !all.gemini ? 'groq' : 'gemini'
  return [first, first === 'groq' ? 'gemini' : 'groq'].filter(p => all[p])
}
const SOFT = new Set(['quota', 'upstream', 'bad_key', 'bad_model', 'empty', 'bad_request'])
async function route(fn) {
  let last; for (const p of order()) { try { return await fn(p) } catch (e) { last = e; if (e.name === 'AbortError' || !SOFT.has(e.code)) throw e; console.error(`[ai] ${p} فشل (${e.code})${order().length > 1 ? '، أجرّب المزوّد الآخر' : ''}`) } }
  throw last
}
export const askAI = (m, t, v, l) => route(p => (p === 'groq' ? Q.askGroq : G.askGemini)(m, t, v, l))
export async function streamAI(m, t, v, onText, signal, l) {
  let sent = false, err = null; const on = x => { sent = true; onText(x) }
  return route(async p => { if (sent) throw err // بدأ الرد بالفعل: لا نكرره من مزوّد آخر
    try { return await (p === 'groq' ? Q.streamGroq : G.streamGemini)(m, t, v, on, signal, l) } catch (e) { err = e; throw e } })
}
export const transcribeAI = (b64) => route(p => (p === 'groq' ? Q.transcribeGroq(b64) : G.transcribeGemini(b64, 'audio/wav')))
export const speakAI = text => G.speakGemini(text)
export const imageAI = s => G.imageGemini(s)
// فحص الحالة: tts=false لو لا يوجد Gemini (الواجهة تستخدم صوت المتصفح للنطق).
export async function checkAI() {
  let gem = null, gErr = null
  if (geminiOn()) { try { gem = await G.checkGemini() } catch (e) { gErr = e } }
  if (gem && order()[0] === 'gemini') return { ...gem, provider: 'gemini', tts: true, groq: Q.groqOn() }
  if (Q.groqOn()) { try { const q = await Q.checkGroq(); return { ...q, provider: 'groq', tts: !!gem, groq: true } } catch (e) { if (!gem) throw e } }
  if (gem) return { ...gem, provider: 'gemini', tts: true, groq: false }
  throw gErr
}
