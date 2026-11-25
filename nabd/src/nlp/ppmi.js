// ─────────────────────────────────────────────────────────────
// المرحلة 5: الدلالة التوزيعية (Distributional semantics) — مصفوفة التواجد المشترك + PPMI
//   "الكلمات التي تظهر في سياقات متشابهة معانيها متقاربة".
//   PPMI(w,c) = max(0, log2( P(w,c) / (P(w)·P(c)) ))   ثم cosine بين متجهات الكلمات.
// نستخدمها لاقتراح كلمات قريبة دلالياً وتوسيع الاستعلام الضعيف (Query expansion).
// ─────────────────────────────────────────────────────────────
import { cosine } from './similarity.js'

export class PpmiSpace {
  /** sentences: مصفوفة جمل، كل جملة مصفوفة كلمات (مجذّعة). window = حجم النافذة على كل جانب. */
  constructor(sentences, window = 3) {
    const co = new Map(), wc = new Map(); let total = 0
    for (const s of sentences) for (let i = 0; i < s.length; i++) for (let j = Math.max(0, i - window); j <= Math.min(s.length - 1, i + window); j++) {
      if (i === j || s[i] === s[j]) continue
      const row = co.get(s[i]) || co.set(s[i], new Map()).get(s[i]); row.set(s[j], (row.get(s[j]) || 0) + 1)
      wc.set(s[i], (wc.get(s[i]) || 0) + 1); total++
    }
    this.vec = new Map()
    for (const [w, row] of co) {
      const v = new Map()
      for (const [c, n] of row) { const pmi = Math.log2((n / total) / ((wc.get(w) / total) * (wc.get(c) / total))); if (pmi > 0) v.set(c, pmi) }
      this.vec.set(w, v)
    }
  }
  has(w) { return this.vec.has(w) }
  /** أقرب k كلمات دلالياً لكلمة معيّنة. */
  neighbors(w, k = 4) {
    const v = this.vec.get(w); if (!v) return []
    const out = []
    for (const [u, vu] of this.vec) if (u !== w) { const s = cosine(v, vu); if (s > 0.15) out.push({ word: u, sim: s }) }
    return out.sort((a, b) => b.sim - a.sim).slice(0, k)
  }
}
