// استرجاع المحتوى المراجَع من المكتبة (RAG بسيط). يُستخدم في الخادم لبناء سياق Gemini.
import { topics } from '../data/topics.js'
import { norm } from './arabic.js'
const stop = new Set(['في', 'من', 'على', 'عن', 'الى', 'ده', 'دي', 'هو', 'هي', 'انا', 'ال', 'و', 'ب', 'ل'])
export function retrieve(query, n = 3) {
  const nq = norm(query); if (!nq) return []
  const words = nq.split(' ').filter(w => w.length > 1 && !stop.has(w))
  return topics.map(t => {
    const title = norm(t.title), kws = t.keywords.map(norm), body = norm([t.summary, ...t.signs].join(' '))
    let s = 0
    kws.forEach(k => { if (k.length > 2 && nq.includes(k)) s += 5 })
    words.forEach(w => { if (title.includes(w)) s += 3; if (kws.some(k => k.includes(w))) s += 2; if (w.length > 2 && body.includes(w)) s += 1 })
    return { t, s }
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, n).map(x => x.t)
}
