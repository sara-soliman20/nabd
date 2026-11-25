// الوضع المحلي (بدون إنترنت/خادم). العربية: محرك الفهم + نموذج اللغة الصغير (يُحمَّل عند الحاجة فقط). الإنجليزية: بحث نصي بالمكتبة.
import { getContent } from '../i18n/content.js'
import { searchTopics } from './localSearch.js'

const EN_HELLO = /^(hi|hello|hey|thanks|thank you|bye)\b/i
const lines = (a, n) => a.slice(0, n).map((s, i) => `${i + 1}) ${s}`).join('\n')

function answerEn(history) {
  const { topics, severity } = getContent('en')
  const q = history[history.length - 1]?.text || ''
  if (EN_HELLO.test(q.trim()) && q.trim().split(/\s+/).length < 4) return { mode: 'offline', answer: 'Hi, I’m Nabd 💗 Tell me what happened (for example “a child is choking” or “I burned my hand”). If it looks serious, call 123 now.', sources: [] }
  const found = searchTopics(q, topics, 2), t = found[0]
  if (!t) return { mode: 'offline', answer: 'I could not work out the case from that. Try describing it differently: who is hurt, what happened, are they breathing, is there bleeding? If it looks serious or you are unsure, call 123 now.', sources: [] }
  const head = t.severity === 'critical' ? `🚨 ${severity.critical}: call 123 now` : `🚨 ${severity[t.severity]}`
  const answer = [`**${t.icon} ${t.title}**`, head, `✅ What to do\n${lines(t.steps, 5)}`, t.avoid?.length ? `❌ What to avoid\n${t.avoid.slice(0, 3).map(s => `• ${s}`).join('\n')}` : ''].filter(Boolean).join('\n\n')
  return { mode: 'offline', answer, sources: found.map(x => ({ id: x.id, title: x.title })), emergency: t.severity === 'critical' }
}

export async function offlineAnswer(history, lang, { onToken } = {}) {
  if (lang === 'en') return answerEn(history)
  const [{ respond }, chat, { getLLM }] = await Promise.all([import('../nlp/engine.js'), import('../nlp/llm/chat.js'), import('../nlp/llm/useLLM.js')])
  let d
  try { d = await chat.llmRespond(await getLLM(), history, { temperature: 0, onToken }) } catch { d = respond(history) }
  return { ...d, mode: 'offline', llm: undefined, analysis: undefined }
}

/** وصف الحالة → أفضل الحالات. */
export async function describeSearch(text, lang) {
  if (lang === 'en') return searchTopics(text, getContent('en').topics, 3)
  const { search } = await import('../nlp/engine.js')
  const ids = search(text, 3).map(x => x.id), { byId } = getContent('ar')
  return ids.map(id => byId[id]).filter(Boolean)
}
export async function teach(text, id) { const { learn } = await import('../nlp/memory.js'); learn(text, id) }
