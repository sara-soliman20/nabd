// ─────────────────────────────────────────────────────────────
// مرحلة LLM (1): Tokenizer من نوع Byte-Pair Encoding (BPE) — مكتوب من الصفر.
// الفكرة: نبدأ بحروف مفردة، ثم نكرر: نعدّ أكثر زوج متجاور تكراراً في النص ونضمّه كرمز جديد (merge)، حتى نبلغ حجم المفردات المطلوب.
// فتصبح الكلمات الشائعة رمزاً واحداً والنادرة تتفكك لأجزاء (لا توجد كلمة "غير معروفة" أبداً).
// ─────────────────────────────────────────────────────────────
export const SPECIAL = ['<pad>', '<bos>', '<eos>', '<q>', '<t>', '<a>'] // ids 0..5
const SP = '▁' // علامة بداية الكلمة بعد مسافة

/** يقسم النص إلى "كلمات": كل كلمة بعد مسافة تبدأ بـ ▁، والسطر الجديد رمز مستقل. */
export function pretokenize(text) {
  const out = []
  for (const line of String(text).split('\n')) {
    line.split(/ +/).filter(Boolean).forEach((w, i) => out.push([...(i ? SP + w : w)]))
    out.push(['\n'])
  }
  out.pop() // آخر سطر جديد زائد
  return out
}

/** تدريب BPE على نصوص. يرجع { vocab, merges } حيث vocab[id] = الرمز. */
export function trainBPE(texts, vocabSize = 800) {
  const freq = new Map() // كلمة (كأحرف) -> عدد مرات ظهورها
  for (const t of texts) for (const w of pretokenize(t)) { const k = w.join('\u0001'); freq.set(k, (freq.get(k) || 0) + 1) }
  let words = [...freq].map(([k, c]) => ({ s: k.split('\u0001'), c }))
  const base = new Set(); for (const { s } of words) for (const ch of s) base.add(ch)
  const vocab = [...SPECIAL, ...[...base].sort()], merges = []
  while (vocab.length < vocabSize) {
    const pairs = new Map()
    for (const { s, c } of words) for (let i = 0; i < s.length - 1; i++) { const k = s[i] + '\u0001' + s[i + 1]; pairs.set(k, (pairs.get(k) || 0) + c) }
    let best = null, bc = 1; for (const [k, c] of pairs) if (c > bc) { best = k; bc = c }
    if (!best) break
    const [a, b] = best.split('\u0001'), ab = a + b
    merges.push([a, b]); vocab.push(ab)
    for (const w of words) { const s = w.s, n = []; for (let i = 0; i < s.length; i++) { if (i < s.length - 1 && s[i] === a && s[i + 1] === b) { n.push(ab); i++ } else n.push(s[i]) } w.s = n }
  }
  return { vocab, merges }
}

export class BPE {
  constructor({ vocab, merges }) {
    this.vocab = vocab; this.id = new Map(vocab.map((t, i) => [t, i]))
    this.rank = new Map(merges.map(([a, b], i) => [a + '\u0001' + b, i])); this.cache = new Map()
  }
  get size() { return this.vocab.length }
  #word(chars) {
    const key = chars.join(''); if (this.cache.has(key)) return this.cache.get(key)
    let s = chars
    for (;;) { // نطبّق أقدم merge متاح (أقل رتبة) حتى لا يبقى شيء
      let bi = -1, br = Infinity
      for (let i = 0; i < s.length - 1; i++) { const r = this.rank.get(s[i] + '\u0001' + s[i + 1]); if (r !== undefined && r < br) { br = r; bi = i } }
      if (bi < 0) break
      s = [...s.slice(0, bi), s[bi] + s[bi + 1], ...s.slice(bi + 2)]
    }
    const ids = s.map(t => this.id.get(t) ?? this.id.get(' ') ?? 0); this.cache.set(key, ids); return ids
  }
  /** نص -> قائمة ids (بدون رموز خاصة). الحروف غير الموجودة في المفردات تُهمل. */
  encode(text) { return pretokenize(text).flatMap(w => this.#word(w.filter(ch => this.id.has(ch)))) }
  /** ids -> نص. */
  decode(ids) { return ids.filter(i => i >= SPECIAL.length).map(i => this.vocab[i]).join('').replaceAll(SP, ' ') }
  pieces(text) { return this.encode(text).map(i => this.vocab[i]) }
}
