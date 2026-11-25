// ─────────────────────────────────────────────────────────────
// المرحلة 3: التصنيف — Multinomial Naive Bayes مع Laplace smoothing
//   P(c|d) ∝ P(c) · Π P(w|c)      ← نعمل بالـ log لتجنب underflow
//   P(w|c) = (count(w,c) + α) / (total(c) + α·|V|)
// يُستخدم لتصنيف "نية" الرسالة (تحية/شكر/سؤال إسعاف...) ولتقدير احتمال كل حالة إسعاف.
// ─────────────────────────────────────────────────────────────
export class NaiveBayes {
  constructor(alpha = 0.5, { uniformPrior = false } = {}) { this.alpha = alpha; this.uniformPrior = uniformPrior; this.labels = []; this.prior = {}; this.counts = {}; this.total = {}; this.vocab = new Set() }
  /** samples: [{ label, terms: string[] }] */
  train(samples) {
    const docCount = {}
    for (const { label, terms } of samples) {
      docCount[label] = (docCount[label] || 0) + 1
      const c = (this.counts[label] ||= new Map())
      for (const t of terms) { c.set(t, (c.get(t) || 0) + 1); this.total[label] = (this.total[label] || 0) + 1; this.vocab.add(t) }
    }
    this.labels = Object.keys(docCount)
    for (const l of this.labels) this.prior[l] = this.uniformPrior ? -Math.log(this.labels.length) : Math.log(docCount[l] / samples.length)
    return this
  }
  /** يرجع كل التصنيفات مرتبة مع الاحتمال (softmax على log-probabilities).
   *  temperature: قسمة الـ log-likelihood على sqrt(عدد الكلمات) لتخفيف تطرّف NB في الجمل الطويلة. */
  predict(terms, { smooth = false } = {}) {
    const V = this.vocab.size, known = terms.filter(t => this.vocab.has(t))   // الكلمات خارج المفردات تُتجاهل
    const logp = this.labels.map(l => {
      let s = this.prior[l]
      for (const t of known) s += Math.log(((this.counts[l].get(t) || 0) + this.alpha) / ((this.total[l] || 0) + this.alpha * V))
      return s
    })
    if (smooth && known.length > 1) { const T = Math.sqrt(known.length); for (let i = 0; i < logp.length; i++) logp[i] = this.prior[this.labels[i]] + (logp[i] - this.prior[this.labels[i]]) / T }
    const max = Math.max(...logp), exp = logp.map(x => Math.exp(x - max)), z = exp.reduce((a, b) => a + b, 0)
    return this.labels.map((label, i) => ({ label, prob: exp[i] / z, logp: logp[i] })).sort((a, b) => b.prob - a.prob)
  }
}
