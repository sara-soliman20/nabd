// ─────────────────────────────────────────────────────────────
// مقاييس التشابه والمسافة (Similarity & Edit distance)
// ─────────────────────────────────────────────────────────────

/** Minimum Edit Distance (Levenshtein) بالبرمجة الديناميكية: إدراج/حذف/استبدال تكلفة كل منها 1. */
export function editDistance(a, b) {
  const m = a.length, n = b.length
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[n]
}

/** Cosine similarity بين متجهين متفرقين (Map: كلمة → وزن). */
export function cosine(a, b) {
  let dot = 0, na = 0, nb = 0
  for (const [, v] of a) na += v * v
  for (const [, v] of b) nb += v * v
  const [small, big] = a.size < b.size ? [a, b] : [b, a]
  for (const [k, v] of small) { const w = big.get(k); if (w) dot += v * w }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

/** char n-grams لمقارنة الكلمات المكتوبة بأخطاء إملائية. */
export const charNgrams = (w, n = 3) => { const s = `#${w}#`, out = new Set(); for (let i = 0; i <= s.length - n; i++) out.add(s.slice(i, i + n)); return out }
export function jaccard(A, B) { let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i || 1) }
