import { analyze } from '../src/nlp/engine.js'
import { unseenSet } from '../src/nlp/unseen.js'
const run = chars => { let t1 = 0, t3 = 0, miss = []
  for (const [q, id] of unseenSet) { const r = analyze(q, { chars }).ranking.map(x => x.id); if (r[0] === id) t1++; else miss.push(`${q} → ${r[0]} (المتوقع ${id})`); if (r.slice(0, 3).includes(id)) t3++ }
  return { t1, t3, miss } }
const a = run(false), b = run(true), n = unseenSet.length
console.log(`جمل لم يرها النظام: ${n}`)
console.log(`بدون n-gram حروف  Top-1 ${(100 * a.t1 / n).toFixed(1)}%  Top-3 ${(100 * a.t3 / n).toFixed(1)}%`)
console.log(`مع n-gram حروف    Top-1 ${(100 * b.t1 / n).toFixed(1)}%  Top-3 ${(100 * b.t3 / n).toFixed(1)}%`)
if (process.argv.includes('-v')) console.log('أخطاء:\n' + b.miss.join('\n'))
