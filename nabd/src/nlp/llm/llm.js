// ─────────────────────────────────────────────────────────────
// مرحلة LLM (3): ربط الـ Tokenizer بالنموذج: بناء الـ Prompt، التوليد رمزاً برمز (Autoregressive)، وحساب Perplexity.
// صيغة الـ Prompt (نفس صيغة التدريب):  <bos> <q> السؤال <t> عنوان الحالة (من الاسترجاع) <a>  ← والنموذج يكمل الجواب حتى <eos>
// ─────────────────────────────────────────────────────────────
import { BPE } from './bpe.js'
import { GPT, sample, softmax, rng } from './gpt.js'
export const ID = { PAD: 0, BOS: 1, EOS: 2, Q: 3, T: 4, A: 5 }
const tick = () => new Promise(r => setTimeout(r, 0)) // نترك للواجهة فرصة للرسم أثناء التوليد

export class NabdLLM {
  constructor(tokenizerJson, meta, buf) { this.bpe = new BPE(tokenizerJson); this.gpt = new GPT(meta, buf); this.meta = meta; this.cfg = meta.config }
  /** الـ Prompt كـ ids. title = الحالة التي استرجعها محرك NLP (هنا يحدث الـ Retrieval-Augmented Generation). */
  promptIds(question, title) { return [ID.BOS, ID.Q, ...this.bpe.encode(question).slice(0, 28), ID.T, ...this.bpe.encode(title), ID.A] }
  /** توليد متدفق: يرسل كل رمز جديد عبر onToken ويرجع { text, ids, steps:[{id,piece,prob,top:[...]}], logprob, promptLen }. */
  async generate(question, title, { temperature = 0, topK = 20, seed, maxNew = 400, onToken, trace = false } = {}) {
    const ids = this.promptIds(question, title), cache = this.gpt.newCache(), rand = seed === undefined ? Math.random : rng(seed)
    let logits, attention = trace ? [] : null
    for (const t of ids) logits = this.gpt.step(t, cache, trace ? (attention.length < ids.length ? [] : null) : null) // prefill
    const out = [], steps = []; let lp = 0
    const room = Math.min(maxNew, this.cfg.ctx - ids.length - 1)
    for (let i = 0; i < room; i++) {
      const id = sample(logits, { temperature, topK, rand }), p = softmax(logits, temperature || 1)
      if (id === ID.EOS) break
      lp += Math.log(p[id] + 1e-12); out.push(id)
      steps.push({ id, piece: this.bpe.vocab[id], prob: p[id] })
      if (onToken) onToken(this.bpe.decode(out))
      if (i % 6 === 5) await tick()
      logits = this.gpt.step(id, cache)
    }
    return { text: this.bpe.decode(out), ids: out, steps, logprob: lp, perplexity: out.length ? Math.exp(-lp / out.length) : null, promptLen: ids.length, truncated: out.length >= room }
  }
  /** Perplexity لنص كامل حسب النموذج (كلما قلّ كان النص أقرب لما تعلّمه). */
  perplexity(text, { question = '', title = '' } = {}) {
    const body = this.bpe.encode(text), cache = this.gpt.newCache(); let logits, lp = 0
    for (const t of this.promptIds(question, title)) logits = this.gpt.step(t, cache)
    for (const t of body) { lp += Math.log(softmax(logits)[t] + 1e-12); logits = this.gpt.step(t, cache) }
    return Math.exp(-lp / Math.max(1, body.length))
  }
  /** attention لآخر طبقة لجملة قصيرة (للعرض في المختبر): مصفوفة [heads][t] لآخر رمز. */
  attentionOf(question, title) {
    const ids = this.promptIds(question, title), cache = this.gpt.newCache(); let last
    for (let i = 0; i < ids.length; i++) { const tr = []; this.gpt.step(ids[i], cache, tr); last = tr }
    return { tokens: ids.map(i => this.bpe.vocab[i]), layers: last }
  }
}

/** تحميل في المتصفح من /llm/. */
export async function loadLLM(base = '/llm') {
  const [tok, meta, bin] = await Promise.all([fetch(`${base}/tokenizer.json`).then(r => r.json()), fetch(`${base}/model.json`).then(r => r.json()), fetch(`${base}/model.bin`).then(r => r.arrayBuffer())])
  return new NabdLLM(tok, meta, bin)
}
