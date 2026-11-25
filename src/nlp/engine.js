// ─────────────────────────────────────────────────────────────
// محرك NLP لنبض — يجمع كل المراحل في خط معالجة واحد (Pipeline):
//   نص المستخدم → تطبيع/تقطيع/تجذيع → تصحيح إملائي (edit distance) → توسيع العامية
//   → TF-IDF + cosine (استرجاع)  → Naive Bayes (نيّة + احتمال الحالة) → PPMI (كلمات قريبة)
//   → درجة نهائية مدمجة → توليد الرد (قوالب) أو بناء Prompt لنموذج اللغة الكبير (RAG).
// يعمل في المتصفح وفي Node بنفس الكود (لذلك يشتغل التطبيق حتى بدون إنترنت). مستقل تماماً عن Gemini..
// ─────────────────────────────────────────────────────────────
import { topics, severityLabel } from '../data/topics.js'
import { norm, tokenize, removeStopwords, stem, preprocess, features, STOPWORDS } from './preprocess.js'
import { TfidfModel } from './tfidf.js'
import { NaiveBayes } from './naiveBayes.js'
import { BigramLM } from './ngramLM.js'
import { PpmiSpace } from './ppmi.js'
import { editDistance } from './similarity.js'
import { intentExamples } from './intents.js'
import { DIALECT } from './preprocess.js'
import { textGrams } from './charngram.js'
import { memoryScores } from './memory.js'

// ───────── بناء الفهرس (يتم مرة واحدة عند التحميل) ─────────
const stemList = text => removeStopwords(tokenize(text)).map(stem)
/** للنيّة نُبقي الكلمات الشائعة لأنها تحمل المعنى («انت مين»، «شكرا جدا»). */
const intentTerms = text => features(tokenize(text).map(stem))
const repeat = (arr, n) => Array.from({ length: n }, () => arr).flat()
/** مستند الحالة = عنوانها×3 + كلماتها المفتاحية×3 + باقي الحقول مرة واحدة (تثقيل بسيط للحقول المهمة). */
function docTerms(t) {
  const once = text => features(stemList(text))
  return [
    ...repeat(once(t.title), 3),
    ...repeat(t.keywords.flatMap(once), 3),
    ...once(t.summary), ...t.signs.flatMap(once), ...(t.danger || []).flatMap(once),
    ...t.steps.flatMap(once), ...(t.avoid || []).flatMap(once), ...(t.callWhen || []).flatMap(once),
  ]
}
export const tfidf = new TfidfModel(topics.map(t => ({ id: t.id, terms: docTerms(t) })))

// مفردات المحتوى (كلمات كاملة بعد التطبيع) لاستخدامها في التصحيح الإملائي.
const vocabCount = new Map()
const allSentences = topics.flatMap(t => [t.title, t.summary, ...t.keywords, ...t.signs, ...(t.danger || []), ...t.steps, ...(t.avoid || []), ...(t.callWhen || [])])
for (const s of allSentences) for (const w of removeStopwords(tokenize(s))) vocabCount.set(w, (vocabCount.get(w) || 0) + 1)

// كلمات معروفة لا نصحّحها أبداً: مفردات المحتوى + جمل التحية/المتابعة + معجم العامية + جذوع المحتوى.
const known = new Set([...vocabCount.keys(), ...DIALECT.keys()])
for (const list of Object.values(intentExamples)) for (const p of list) for (const w of tokenize(p)) known.add(w)
const stemVocab = new Set([...known].map(stem))

// نموذج لغة bigram ومساحة PPMI من نفس النصوص.
export const lm = new BigramLM(allSentences.map(tokenize).filter(s => s.length))
export const ppmi = new PpmiSpace(allSentences.map(stemList).filter(s => s.length > 1))

// مصنّف النيّة: جمل التحية والمتابعة... + جمل first_aid المأخوذة من الكلمات المفتاحية والأعراض.
const intentSamples = []
for (const [label, list] of Object.entries(intentExamples)) for (const p of list) intentSamples.push({ label, terms: intentTerms(p) })
for (const t of topics) for (const p of [...t.keywords, ...t.signs, t.summary]) intentSamples.push({ label: 'first_aid', terms: intentTerms(p) })
export const intentNB = new NaiveBayes(0.3, { uniformPrior: true }).train(intentSamples)

// مصنّف الحالة: كل جملة من الحالة عيّنة تدريب لوسمها.
const topicSamples = []
for (const t of topics) {
  for (const p of [t.title, t.summary, ...t.keywords, ...t.keywords, ...t.signs, ...(t.danger || [])]) topicSamples.push({ label: t.id, terms: features(stemList(p)) })
}
export const topicNB = new NaiveBayes(0.1).train(topicSamples)

// قناة n-gram حروف: تمسك الكلمات التي لا تعرفها القواميس (عامية جديدة/تهجئة غريبة) من تشابه أجزاء الحروف مع كلمات الحالة.
const charDoc = t => [t.title, ...t.keywords, ...t.keywords, ...t.signs].flatMap(textGrams)
export const charTfidf = new TfidfModel(topics.map(t => ({ id: t.id, terms: charDoc(t) })))

/** n-gram الكلمات «الغريبة» فقط (غير الموجودة في المحتوى ولا القاموس): الكلمات المعروفة يفهمها المسار الأساسي. */
const oovGrams = nq => textGrams(nq.split(' ').filter(w => w.length > 2 && !known.has(w) && !stemVocab.has(stem(w)) && !STOPWORDS.has(w)).join(' '))
const byId = Object.fromEntries(topics.map(t => [t.id, t]))
export const getTopic = id => byId[id]

// ───────── التصحيح الإملائي بمسافة التحرير ─────────
/** يصحّح كلمة غير موجودة في المفردات لو يوجد مرشّح واحد واضح على مسافة ≤ 1 (≤ 2 للكلمات الطويلة). */
export function correctWord(w) {
  if (w.length < 5 || /[0-9a-z]/.test(w) || known.has(w) || stemVocab.has(stem(w)) || STOPWORDS.has(w)) return null
  const limit = w.length >= 8 ? 2 : 1; let best = null, bestD = limit + 1, tie = false
  for (const [v, c] of vocabCount) {
    if (Math.abs(v.length - w.length) > limit) continue
    const d = editDistance(w, v)
    if (d < bestD || (d === bestD && best && c > vocabCount.get(best))) { best = v; bestD = d; tie = false } else if (d === bestD && c === vocabCount.get(best)) tie = true
  }
  return best && bestD <= limit && !tie ? best : null
}

// ───────── التحليل الكامل لرسالة ─────────
const kwScore = (nq, t) => {
  let n = 0
  for (const k of t.keywords) { const nk = norm(k); if (nk.length > 2 && (` ${nq} `).includes(` ${nk} `)) n += nk.split(' ').length }
  return 1 - Math.exp(-0.7 * n)
}
export const THRESH = { strong: 0.28, weak: 0.12 }

/** يحلّل نصاً ويُرجع كل مراحل المعالجة والنتائج (تُعرض كما هي في صفحة مختبر NLP). */
export function analyze(text, { topN = 3, chars = true } = {}) {
  const base = preprocess(text)
  // 1) تصحيح إملائي على الكلمات الأصلية، ثم إعادة المعالجة لو حدث تغيير
  const corrections = []
  const fixed = base.tokens.map(w => { const c = correctWord(w); if (c) corrections.push({ from: w, to: c }); return c || w })
  const pre = corrections.length ? preprocess(fixed.join(' ')) : base
  const nq = pre.normalized
  const terms = features(pre.stems)

  // 2) نيّة الرسالة
  const intents = intentNB.predict(features(pre.tokens.map(stem)), { smooth: true }).slice(0, 4)
  // 3) الاسترجاع: TF-IDF cosine + مطابقة الكلمات المفتاحية + احتمال Naive Bayes
  const cos = new Map(tfidf.rank(terms).map(r => [r.id, r.score]))
  const nb = new Map(topicNB.predict(terms, { smooth: true }).map(r => [r.label, r.prob]))
  const chr = new Map(chars ? charTfidf.rank(oovGrams(nq)).map(r => [r.id, r.score]) : [])
  const mem = chars ? memoryScores(base.normalized) : new Map()
  const ranking = topics.map(t => {
    const c = cos.get(t.id) || 0, k = kwScore(nq, t), p = terms.length ? nb.get(t.id) || 0 : 0, g = chr.get(t.id) || 0, m = mem.get(t.id) || 0
    // قناة الحروف تُعتمد فقط حين يضعف الفهم بالكلمات (لا تُضعف النتائج الواضحة)، والذاكرة تتغلب لو التشابه عالٍ.
    const word = 0.5 * c + 0.3 * k + 0.2 * p
    const score = Math.max(word + (word < THRESH.strong ? 0.35 * g : 0.1 * g), m >= 0.6 ? 0.3 + 0.4 * m : 0)
    return { id: t.id, title: t.title, severity: t.severity, cosine: c, keyword: k, nb: p, chars: g, memory: m, score }
  }).sort((a, b) => b.score - a.score)
  const confidence = (!terms.length && ranking[0].memory < 0.6 && ranking[0].chars < 0.3) ? 'none' : ranking[0].score >= THRESH.strong ? 'high' : ranking[0].score >= THRESH.weak ? 'low' : 'none'

  // 4) أهم كلمات الاستعلام وزناً + جيرانها الدلالية (PPMI) + Perplexity
  const qv = tfidf.vectorize(terms)
  const topTerms = [...qv].filter(([t]) => !t.includes('_')).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([term, w]) => ({ term, weight: w, idf: tfidf.idf.get(term) }))
  const neighbors = topTerms.slice(0, 3).map(({ term }) => ({ term, near: ppmi.neighbors(term, 3) })).filter(x => x.near.length)
  const perplexity = pre.tokens.length ? lm.perplexity(pre.tokens) : null

  return { text, ...pre, corrections, terms, intents, ranking: ranking.slice(0, Math.max(topN, 5)), confidence, topTerms, neighbors, perplexity }
}

/** بحث مبسط: أفضل الحالات (للبحث النصي في المساعد). */
export function search(text, n = 3) {
  const a = analyze(text)
  return a.ranking.filter(r => r.score >= THRESH.weak).slice(0, n).map(r => byId[r.id])
}

// ───────── توليد الرد بدون نموذج لغة كبير (قوالب) ─────────
const lines = (arr, n) => arr.slice(0, n).map((s, i) => `${i + 1}) ${s}`).join('\n')
const smalltalk = {
  greeting: 'أهلاً بيك، أنا نبض 💗 مساعد الإسعافات الأولية. اوصفلي اللي حصل بكلماتك (مثلاً: «طفل بيتخنق» أو «اتحرقت بمية سخنة»). ولو الحالة خطيرة اتصل بالإسعاف 123 فوراً.',
  thanks: 'العفو! لو حصل أي تطور أو عندك حالة تانية أنا معاك. وفي الخطر الحقيقي: 123.',
  bye: 'مع السلامة، ربنا يحفظكم. اتذكّر دايماً: في الطوارئ اتصل بـ 123.',
  about_bot: 'أنا نبض، مساعد تعليمي للإسعافات الأولية بالعربي. بفهم كلامك بخط معالجة لغة طبيعية مبني من الصفر (تجذيع + TF-IDF + Naive Bayes) وبسترجع الحالة من مكتبة نبض، وبكتب الرد نموذج لغة صغير (GPT) اتبنى واتدرّب من الصفر. مش بديل للإسعاف: 123.',
  out_of_scope: 'أنا متخصص في الإسعافات الأولية بس، فمقدرش أساعد في السؤال ده. لو في حالة صحية أو إصابة احكيلي اللي حصل، ولو خطيرة اتصل بالإسعاف 123 الآن.',
  none: 'مش قادر أحدد الحالة من الوصف ده. ممكن توصفها بكلمات تانية (مين المصاب؟ إيه اللي حصل؟ بيتنفس؟ فيه نزيف؟). ولو الموقف خطير أو مش متأكد: اتصل بالإسعاف 123 الآن.',
}
const header = t => t.severity === 'critical' ? `🚨 مستوى الخطورة: ${severityLabel.critical} — اتصل بالإسعاف 123 الآن` : `🚨 مستوى الخطورة: ${severityLabel[t.severity]}`
export function formatTopicAnswer(t, { second } = {}) {
  return [`**${t.icon} ${t.title}**`, header(t), `✅ ماذا أفعل؟\n${lines(t.steps, 5)}`,
    t.avoid?.length ? `❌ ماذا أتجنب؟\n${t.avoid.slice(0, 3).map(s => `• ${s}`).join('\n')}` : '',
    second ? `قد تكون الحالة أيضاً: ${second.title}.` : '', `📚 المصدر: مكتبة نبض — ${t.title}`].filter(Boolean).join('\n\n')
}

/** يحدد آخر حالة تناولتها المحادثة (لفهم الأسئلة المتابِعة مثل «وبعدين؟»). */
export function lastTopicOf(history = []) {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== 'user') continue
    const a = analyze(history[i].text); if (a.confidence === 'high' && a.intents[0].label === 'first_aid') return byId[a.ranking[0].id]
  }
  return null
}

/** يقرّر مسار الرد: smalltalk | followup | topic | none | out_of_scope. */
export function route(text, history = []) {
  const a = analyze(text), top = a.intents[0], intent = top.label
  const prev = history.slice(0, -1)                      // الرسائل قبل الحالية
  const social = ['greeting', 'thanks', 'bye', 'about_bot'].includes(intent)
  if (social && top.prob > 0.4 && a.confidence !== 'high') return { kind: 'smalltalk', intent, analysis: a }
  if (intent === 'out_of_scope' && top.prob > 0.5 && a.confidence !== 'high') return { kind: 'out_of_scope', intent, analysis: a }
  if (intent.startsWith('followup') && a.confidence !== 'high') {
    const t = lastTopicOf(prev); if (t) return { kind: 'followup', intent, topic: t, analysis: a }
  }
  if (a.confidence === 'none') {                          // قد يكون سؤال متابعة غير واضح: نعتمد آخر حالة
    const t = lastTopicOf(prev); if (t && a.terms.length <= 3) return { kind: 'followup', intent: 'followup_more', topic: t, analysis: a }
    return { kind: 'none', intent, analysis: a }
  }
  return { kind: 'topic', intent, topic: byId[a.ranking[0].id], second: a.ranking[1].score >= THRESH.strong && a.ranking[1].score > a.ranking[0].score * 0.8 ? byId[a.ranking[1].id] : null, analysis: a }
}

/** رد محلي كامل بدون LLM. يرجع نفس شكل رد الخادم. */
export function respond(history) {
  const text = history[history.length - 1]?.text || ''
  const r = route(text, history)
  const base = { mode: 'nlp', intent: r.intent, analysis: r.analysis, sources: [], emergency: false }
  if (r.kind === 'smalltalk') return { ...base, answer: smalltalk[r.intent] }
  if (r.kind === 'out_of_scope') return { ...base, answer: smalltalk.out_of_scope }
  if (r.kind === 'none') { // لا نكتفي برسالة عامة: نقترح أقرب الحالات لما كُتب ليختار منها
    const near = r.analysis.ranking.filter(x => x.score > 0.015).slice(0, 3).map(x => getTopic(x.id)).filter(Boolean)
    return { ...base, answer: smalltalk.none + (near.length ? `\n\nأقرب حالات لكلامك: ${near.map(t => `«${t.title}»`).join('، ')}. اكتب اسم الحالة اللي تقصدها وأديك خطواتها.` : ''), suggestions: near.map(t => ({ id: t.id, title: t.title })) }
  }
  const t = r.topic, src = [{ id: t.id, title: t.title }]
  if (r.kind === 'followup') {
    const body = r.intent === 'followup_avoid' ? `❌ ماذا أتجنب؟\n${(t.avoid || []).map(s => `• ${s}`).join('\n') || 'اتبع الخطوات المكتوبة فقط.'}`
      : r.intent === 'followup_call' ? `📞 متى أطلب المساعدة؟\n${[...(t.callWhen || []), ...(t.danger || [])].map(s => `• ${s}`).join('\n')}\nولو مش متأكد: 123.`
      : `✅ الخطوات كاملة:\n${lines(t.steps, 8)}`
    return { ...base, answer: `بخصوص «${t.title}»:\n\n${body}`, sources: src, emergency: t.severity === 'critical' }
  }
  return { ...base, answer: formatTopicAnswer(t, { second: r.second }), sources: [t, r.second].filter(Boolean).map(x => ({ id: x.id, title: x.title })), emergency: t.severity === 'critical' }
}
