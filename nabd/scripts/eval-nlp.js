// تقييم محرك NLP على مجموعة الاختبار: node scripts/eval-nlp.js
import { evalSet, outOfScope, smallTalk } from '../src/nlp/evalset.js'
import { analyze, route } from '../src/nlp/engine.js'
import { norm } from '../src/nlp/preprocess.js'
import { topics } from '../src/data/topics.js'

// خط الأساس: الطريقة القديمة (مطابقة كلمات بالنقاط) لمقارنة التحسّن.
const stop = new Set(['في', 'من', 'على', 'عن', 'الى', 'ده', 'دي', 'هو', 'هي', 'انا', 'ال', 'و', 'ب', 'ل'])
function baseline(query) {
  const nq = norm(query), words = nq.split(' ').filter(w => w.length > 1 && !stop.has(w))
  return topics.map(t => { const title = norm(t.title), kws = t.keywords.map(norm), body = norm([t.summary, ...t.signs].join(' ')); let s = 0
    kws.forEach(k => { if (k.length > 2 && nq.includes(k)) s += 5 })
    words.forEach(w => { if (title.includes(w)) s += 3; if (kws.some(k => k.includes(w))) s += 2; if (w.length > 2 && body.includes(w)) s += 1 })
    return { id: t.id, s } }).sort((a, b) => b.s - a.s).filter(x => x.s > 0).map(x => x.id)
}
const score = fn => { let t1 = 0, t3 = 0; const miss = []
  for (const [q, id] of evalSet) { const r = fn(q); if (r[0] === id) t1++; if (r.slice(0, 3).includes(id)) t3++; else miss.push([q, id, r[0]]) }
  return { t1, t3, miss } }
const old = score(baseline), neu = score(q => analyze(q).ranking.filter(r => r.score >= 0.12).map(r => r.id))
const n = evalSet.length, pct = x => (100 * x / n).toFixed(1) + '%'
console.log(`عدد الأسئلة: ${n}`)
console.log(`الطريقة القديمة  Top-1 ${pct(old.t1)}  Top-3 ${pct(old.t3)}`)
console.log(`خط NLP الجديد   Top-1 ${pct(neu.t1)}  Top-3 ${pct(neu.t3)}`)
const oos = outOfScope.filter(q => route(q, [{ role: 'user', text: q }]).kind !== 'topic').length
const st = smallTalk.filter(([q, i]) => route(q, [{ role: 'user', text: q }]).intent === i).length
console.log(`خارج النطاق رُفضت: ${oos}/${outOfScope.length} | التحية والمجاملة صُنّفت صح: ${st}/${smallTalk.length}`)
if (process.argv.includes('-v')) neu.miss.forEach(m => console.log('  ✗', m.join(' | ')))
if (neu.t3 / n < 0.85) process.exitCode = 1
