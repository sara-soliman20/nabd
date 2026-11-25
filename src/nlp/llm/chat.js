// ─────────────────────────────────────────────────────────────
// مرحلة LLM (4): شات نبض المستقل = (محرك NLP: فهم النيّة + استرجاع الحالة)  →  (LLM الذي بنيناه: يكتب الجواب)  →  (فحص الأمانة).
// لا يستخدم Gemini ولا أي خدمة خارجية، ويعمل بالكامل في المتصفح.
// ─────────────────────────────────────────────────────────────
import { route, respond, getTopic } from '../engine.js'
import { editDistance } from '../similarity.js'
import { answerText } from './format.js'
import { severityLabel } from '../../data/topics.js'

const sim = (a, b) => 1 - editDistance(a, b) / Math.max(a.length, b.length, 1)
/** فحص الأمانة (Faithfulness): كل سطر ولّده النموذج يجب أن يطابق سطراً من المكتبة (تشابه ≥ 0.9). يكشف "الهلوسة". */
export function faithfulness(generated, topic) {
  const src = answerText(topic).split('\n'), gen = generated.split('\n').filter(l => l.trim())
  const best = l => Math.max(...src.map(s => sim(l, s)))
  const per = gen.map(l => ({ line: l, score: best(l) }))
  const supported = per.filter(x => x.score >= LINE_OK).length
  const covered = src.filter(s => gen.some(l => sim(l, s) >= LINE_OK)).length
  return { precision: gen.length ? supported / gen.length : 0, coverage: src.length ? covered / src.length : 0, lines: per }
}
export const LINE_OK = 0.98 // السطر مقبول لو تشابهه مع المكتبة ≥ 98٪ (خطأ حرفين في دواء/رقم مرفوض)
export const FAITHFUL_MIN = 0.98

/** رد كامل. onToken(textSoFar) لعرض الكتابة التدريجية. */
export async function llmRespond(llm, history, { temperature = 0, onToken, seed } = {}) {
  const text = history[history.length - 1]?.text || '', r = route(text, history)
  const useLLM = r.kind === 'topic' || (r.kind === 'followup' && r.intent === 'followup_more')
  if (!useLLM) return { ...respond(history), mode: 'nlp', via: 'template' } // تحية/خارج النطاق/أسئلة "أتجنب إيه؟" ... تُجاب بقوالب المحرك
  const t = r.topic, q = r.kind === 'followup' ? `${text} ${t.title}` : text
  const gen = await llm.generate(q, t.title, { temperature, seed, onToken })
  const f = faithfulness(gen.text, t), ok = f.precision >= FAITHFUL_MIN && f.coverage >= 0.5
  const base = { intent: r.intent, analysis: r.analysis, sources: [{ id: t.id, title: t.title }], emergency: t.severity === 'critical', llm: { ...gen, faithfulness: f, topic: t.title, temperature } }
  if (!ok) return { ...respond(history), ...base, mode: 'nlp', via: 'fallback', answer: respond(history).answer, note: 'فحص الأمانة رفض ناتج النموذج (لا يطابق المكتبة) فاستُخدم القالب بدلاً منه.' }
  return { ...base, mode: 'llm', via: 'llm', answer: `**${t.icon} ${t.title}**\n\n${gen.text}\n\n📚 المصدر: مكتبة نبض — ${t.title}` }
}
export { severityLabel, getTopic }
