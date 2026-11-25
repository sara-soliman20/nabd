// ─────────────────────────────────────────────────────────────
// المرحلة 2: تمثيل النص بالمتجهات — Bag-of-Words ثم TF-IDF
//   tf(t,d)  = 1 + log(count)          (sublinear)
//   idf(t)   = ln((N + 1) / (df + 1)) + 1   (smoothed)
//   w(t,d)   = tf · idf  ثم L2-normalize ليصبح الـ cosine = dot product
// ─────────────────────────────────────────────────────────────
import { cosine } from './similarity.js'

export class TfidfModel {
  /** docs: [{ id, terms: string[] }] */
  constructor(docs) {
    this.N = docs.length
    this.df = new Map()
    for (const d of docs) for (const t of new Set(d.terms)) this.df.set(t, (this.df.get(t) || 0) + 1)
    this.idf = new Map([...this.df].map(([t, df]) => [t, Math.log((this.N + 1) / (df + 1)) + 1]))
    this.vocab = new Set(this.df.keys())
    this.docs = docs.map(d => ({ id: d.id, vec: this.vectorize(d.terms) }))
  }
  /** يحوّل قائمة كلمات إلى متجه TF-IDF مُطبَّع. الكلمات غير المعروفة تُهمل. */
  vectorize(terms) {
    const tf = new Map()
    for (const t of terms) tf.set(t, (tf.get(t) || 0) + 1)
    const vec = new Map(); let norm2 = 0
    for (const [t, c] of tf) {
      const idf = this.idf.get(t); if (!idf) continue
      const w = (1 + Math.log(c)) * idf; vec.set(t, w); norm2 += w * w
    }
    const n = Math.sqrt(norm2) || 1
    for (const [t, w] of vec) vec.set(t, w / n)
    return vec
  }
  /** ترتيب المستندات حسب cosine مع الاستعلام. */
  rank(terms) {
    const q = this.vectorize(terms)
    return this.docs.map(d => ({ id: d.id, score: cosine(q, d.vec) })).sort((a, b) => b.score - a.score)
  }
}
