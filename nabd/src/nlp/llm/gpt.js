// ─────────────────────────────────────────────────────────────
// مرحلة LLM (2): نموذج GPT صغير (Decoder-only Transformer) — الاستدلال (Inference) مكتوب من الصفر بدون أي مكتبة.
// الأوزان تدرّبت في llm/train.py ثم حُفظت في public/llm/model.bin (float32). هنا نقرأها ونشغّل النموذج.
//
// لكل رمز جديد في الموضع pos:
//   x = Embedding[token] + PositionEmbedding[pos]
//   لكل طبقة:  x += SelfAttention(LayerNorm(x))      ← الـ Attention يرى الرموز السابقة فقط (Causal)
//              x += MLP(LayerNorm(x))                 ← MLP مع GELU
//   logits = LayerNorm(x) · Embedding^T               ← Softmax(logits/temperature) = توزيع الرمز التالي
// نخزّن K,V لكل موضع (KV-cache) فلا نعيد حساب الرموز السابقة.
// ─────────────────────────────────────────────────────────────
const half = h => { // float16 -> float32
  const s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 31, f = h & 1023
  return e === 0 ? s * 2 ** -14 * (f / 1024) : e === 31 ? (f ? NaN : s * Infinity) : s * 2 ** (e - 15) * (1 + f / 1024)
}
const HALF_LUT = new Float32Array(65536); for (let i = 0; i < 65536; i++) HALF_LUT[i] = half(i)

export class GPT {
  /** meta: محتوى model.json، buf: ArrayBuffer لـ model.bin */
  constructor(meta, buf) {
    this.meta = meta; this.cfg = meta.config
    const f32 = meta.dtype === 'float32', src = f32 ? new Float32Array(buf) : new Uint16Array(buf); this.W = {}
    for (const t of meta.tensors) { // float32: نسخ مباشر، float16: فك الضغط
      const n = t.shape.reduce((a, b) => a * b, 1)
      if (f32) this.W[t.name] = src.slice(t.offset, t.offset + n)
      else { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = HALF_LUT[src[t.offset + i]]; this.W[t.name] = a } }
  }
  newCache() {
    const { L, d, ctx } = this.cfg
    return { len: 0, k: Array.from({ length: L }, () => new Float32Array(ctx * d)), v: Array.from({ length: L }, () => new Float32Array(ctx * d)) }
  }
  static #ln(x, g, b) {
    const n = x.length; let mu = 0; for (let i = 0; i < n; i++) mu += x[i]; mu /= n
    let va = 0; for (let i = 0; i < n; i++) { const c = x[i] - mu; va += c * c }
    const r = 1 / Math.sqrt(va / n + 1e-5), o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = (x[i] - mu) * r * g[i] + b[i]; return o
  }
  static #lin(x, W, b, nin, nout) { // x[nin] · W[nin,nout] + b
    const o = Float32Array.from(b)
    for (let i = 0; i < nin; i++) { const xi = x[i]; if (xi === 0) continue; const row = i * nout; for (let j = 0; j < nout; j++) o[j] += xi * W[row + j] }
    return o
  }
  /** يعالج رمزاً واحداً في الموضع cache.len ويرجع logits للرمز التالي. trace: يلتقط أوزان الـ attention (للعرض فقط). */
  step(token, cache, trace) {
    const { L, d, H, ff, V, ctx } = this.cfg, W = this.W, hd = d / H, pos = cache.len
    if (pos >= ctx) throw new Error('تجاوز طول السياق')
    const x = new Float32Array(d); for (let i = 0; i < d; i++) x[i] = W.emb[token * d + i] + W.pos[pos * d + i]
    for (let l = 0; l < L; l++) {
      const p = n => W[`l${l}.${n}`]
      const qkv = GPT.#lin(GPT.#ln(x, p('ln1g'), p('ln1b')), p('wqkv'), p('bqkv'), d, 3 * d)
      cache.k[l].set(qkv.subarray(d, 2 * d), pos * d); cache.v[l].set(qkv.subarray(2 * d, 3 * d), pos * d)
      const o = new Float32Array(d), sc = new Float32Array(pos + 1), heads = trace ? [] : null
      for (let h = 0; h < H; h++) {
        const ho = h * hd; let mx = -Infinity
        for (let t = 0; t <= pos; t++) { let s = 0; for (let i = 0; i < hd; i++) s += qkv[ho + i] * cache.k[l][t * d + ho + i]; sc[t] = s / Math.sqrt(hd); if (sc[t] > mx) mx = sc[t] }
        let z = 0; for (let t = 0; t <= pos; t++) { sc[t] = Math.exp(sc[t] - mx); z += sc[t] }
        for (let t = 0; t <= pos; t++) { sc[t] /= z; const vt = t * d + ho; for (let i = 0; i < hd; i++) o[ho + i] += sc[t] * cache.v[l][vt + i] }
        if (heads) heads.push(Array.from(sc))
      }
      if (trace) trace.push(heads)
      const pr = GPT.#lin(o, p('wo'), p('bo'), d, d); for (let i = 0; i < d; i++) x[i] += pr[i]
      const h1 = GPT.#lin(GPT.#ln(x, p('ln2g'), p('ln2b')), p('w1'), p('b1'), d, ff)
      for (let i = 0; i < ff; i++) { const v = h1[i]; h1[i] = 0.5 * v * (1 + Math.tanh(0.7978845608 * (v + 0.044715 * v * v * v))) } // GELU
      const m = GPT.#lin(h1, p('w2'), p('b2'), ff, d); for (let i = 0; i < d; i++) x[i] += m[i]
    }
    cache.len++
    const xf = GPT.#ln(x, W.lnfg, W.lnfb), logits = new Float32Array(V)
    for (let t = 0; t < V; t++) { let s = 0; const r = t * d; for (let i = 0; i < d; i++) s += xf[i] * W.emb[r + i]; logits[t] = s }
    return logits
  }
}

// ───── أدوات العينة (Sampling) ─────
export const softmax = (logits, temp = 1) => {
  const n = logits.length, p = new Float32Array(n); let mx = -Infinity; for (let i = 0; i < n; i++) if (logits[i] > mx) mx = logits[i]
  let z = 0; for (let i = 0; i < n; i++) { p[i] = Math.exp((logits[i] - mx) / temp); z += p[i] } for (let i = 0; i < n; i++) p[i] /= z; return p
}
export const rng = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
/** يختار رمزاً: temperature=0 → الأرجح دائماً (greedy). وإلا نأخذ عينة من أعلى topK. */
export function sample(logits, { temperature = 0, topK = 20, rand = Math.random } = {}) {
  if (temperature <= 0) { let b = 0; for (let i = 1; i < logits.length; i++) if (logits[i] > logits[b]) b = i; return b }
  const idx = Array.from(logits.keys()).sort((a, b) => logits[b] - logits[a]).slice(0, topK)
  const p = softmax(Float32Array.from(idx, i => logits[i]), temperature); let r = rand(), acc = 0
  for (let j = 0; j < idx.length; j++) { acc += p[j]; if (r <= acc) return idx[j] } return idx[0]
}
