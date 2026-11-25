// ─────────────────────────────────────────────────────────────
// المرحلة 4: نموذج اللغة — N-gram Language Model (bigram) مع Add-k smoothing
//   P(w_i | w_{i-1}) = (C(w_{i-1}, w_i) + k) / (C(w_{i-1}) + k·|V|)
// الاستخدامات: (1) اقتراح الكلمة التالية أثناء الكتابة  (2) Perplexity لمعرفة هل الجملة قريبة من لغة المحتوى.
//   PP(W) = exp( -1/N · Σ ln P(w_i | w_{i-1}) )
// ─────────────────────────────────────────────────────────────
const BOS = '<s>', EOS = '</s>'
export class BigramLM {
  constructor(sentences, k = 0.1) {
    this.k = k; this.uni = new Map(); this.bi = new Map(); this.next = new Map(); this.vocab = new Set([EOS])
    for (const s of sentences) {
      const w = [BOS, ...s, EOS]
      for (let i = 0; i < w.length; i++) {
        this.vocab.add(w[i]); this.uni.set(w[i], (this.uni.get(w[i]) || 0) + 1)
        if (i) { const key = `${w[i - 1]}\t${w[i]}`; this.bi.set(key, (this.bi.get(key) || 0) + 1)
          const n = this.next.get(w[i - 1]) || new Map(); n.set(w[i], (n.get(w[i]) || 0) + 1); this.next.set(w[i - 1], n) }
      }
    }
  }
  prob(prev, w) { return ((this.bi.get(`${prev}\t${w}`) || 0) + this.k) / ((this.uni.get(prev) || 0) + this.k * this.vocab.size) }
  perplexity(words) {
    if (!words.length) return null
    const w = [BOS, ...words, EOS]; let lp = 0
    for (let i = 1; i < w.length; i++) lp += Math.log(this.prob(w[i - 1], w[i]))
    return Math.exp(-lp / (w.length - 1))
  }
  /** أرجح الكلمات التالية بعد كلمة معيّنة (للإكمال التلقائي). */
  suggest(prev, n = 3) {
    const m = this.next.get(prev || BOS); if (!m) return []
    return [...m].filter(([w]) => w !== EOS).sort((a, b) => b[1] - a[1]).slice(0, n).map(([word, c]) => ({ word, p: this.prob(prev || BOS, word), count: c }))
  }
}
