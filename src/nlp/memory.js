// ─────────────────────────────────────────────────────────────
// ذاكرة التعلّم: لما المحرك لا يفهم جملة وتختار المستخدمة الحالة الصحيحة، يحفظ (الجملة → الحالة).
//  • أقرب جار (kNN) على n-gram حروف: جملة مشابهة لاحقاً تُوجَّه لنفس الحالة حتى مع اختلاف الكتابة.
//  • أصوات الكلمات: كل كلمة غير معروفة في الجملة تُنسب للحالة، فتُفهم لاحقاً حتى لو جاءت في جملة مختلفة.
// تُحفظ في localStorage (المتصفح فقط). في Node (الاختبارات) تعمل في الذاكرة.
// ─────────────────────────────────────────────────────────────
import { norm } from './preprocess.js'
import { textGrams } from './charngram.js'

const KEY = 'nabd-learned'
let items = [] // [{ text, id }]
const store = typeof localStorage !== 'undefined' ? localStorage : null
try { items = JSON.parse(store?.getItem(KEY) || '[]').filter(x => x?.text && x?.id) } catch { items = [] }
const save = () => { try { store?.setItem(KEY, JSON.stringify(items.slice(-300))) } catch { /* ممتلئ/محظور */ } }

const bag = text => { const m = new Map(); for (const g of textGrams(text)) m.set(g, (m.get(g) || 0) + 1); return m }
const cos = (a, b) => { let d = 0, x = 0, y = 0; for (const [k, v] of a) { x += v * v; const w = b.get(k); if (w) d += v * w } for (const v of b.values()) y += v * v; return d ? d / Math.sqrt(x * y) : 0 }
let vecs = []
const rebuild = () => { vecs = items.map(i => ({ id: i.id, v: bag(i.text), words: new Set(norm(i.text).split(' ')) })) }
rebuild()

export const learnedCount = () => items.length
export const learnedItems = () => items.slice()
export function learn(text, id) {
  const t = norm(text); if (!t || !id || items.some(i => norm(i.text) === t && i.id === id)) return
  items.push({ text, id }); save(); rebuild()
}
export function forget() { items = []; save(); rebuild() }

/** درجة كل حالة من الذاكرة: أعلى تشابه n-gram مع جملة محفوظة، وصوت الكلمات المشتركة غير الشائعة. */
export function memoryScores(text) {
  const out = new Map(); if (!vecs.length) return out
  const q = bag(text), words = norm(text).split(' ').filter(w => w.length > 2)
  for (const e of vecs) {
    const s = cos(q, e.v), shared = words.filter(w => e.words.has(w)).length
    const v = Math.max(s, shared ? Math.min(1, 0.45 + 0.2 * shared) : 0)
    if (v > (out.get(e.id) || 0)) out.set(e.id, v)
  }
  return out
}
