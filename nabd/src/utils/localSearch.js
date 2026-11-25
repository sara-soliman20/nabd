// بحث نصي بسيط داخل مصفوفة حالات (يُستخدم بالإنجليزية، وكبديل بسيط). لا يحتاج أي نموذج.
const STOP = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'my', 'me', 'i', 'he', 'she', 'it', 'his', 'her', 'to', 'of', 'in', 'on', 'and', 'or', 'with', 'for', 'what', 'how', 'do', 'does', 'can', 'should', 'have', 'has', 'had', 'got', 'get', 'been', 'be', 'at', 'by', 'from', 'this', 'that', 'help'])
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06FF\s]/g, ' ').replace(/\s+/g, ' ').trim()
const stem = w => w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w

/** يرجع أفضل n حالات مطابقة لـ query (مرتبة)، أو [] لو لا شيء. */
export function searchTopics(query, list, n = 3) {
  const q = norm(query); if (!q) return []
  const words = q.split(' ').filter(w => w.length > 1 && !STOP.has(w)).map(stem)
  if (!words.length) return []
  return list.map(t => {
    const title = norm(t.title), kws = (t.keywords || []).map(norm), body = norm([t.summary, ...(t.signs || [])].join(' '))
    let s = 0
    kws.forEach(k => { if (k.length > 2 && q.includes(k)) s += 5 })
    words.forEach(w => { if (title.includes(w)) s += 3; if (kws.some(k => k.includes(w))) s += 2; if (w.length > 2 && body.includes(w)) s += 1 })
    return { t, s }
  }).filter(x => x.s > 1).sort((a, b) => b.s - a.s).slice(0, n).map(x => x.t)
}
export const haystack = t => norm([t.title, t.summary, ...(t.keywords || [])].join(' '))
export { norm as normText }
