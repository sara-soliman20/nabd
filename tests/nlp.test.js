// اختبارات وحدة NLP: node --test tests/
import test from 'node:test'
import assert from 'node:assert/strict'
import { norm, tokenize, stem, preprocess } from '../src/nlp/preprocess.js'
import { editDistance, cosine } from '../src/nlp/similarity.js'
import { TfidfModel } from '../src/nlp/tfidf.js'
import { NaiveBayes } from '../src/nlp/naiveBayes.js'
import { BigramLM } from '../src/nlp/ngramLM.js'
import { PpmiSpace } from '../src/nlp/ppmi.js'
import { analyze, respond, route, search, correctWord } from '../src/nlp/engine.js'
import { evalSet } from '../src/nlp/evalset.js'

test('التطبيع: همزات وتاء مربوطة وتشكيل وتكرار وأرقام عربية', () => {
  assert.equal(norm('أَنْقِذْ المَصَابَ'), 'انقذ المصاب')
  assert.equal(norm('مدرسة'), 'مدرسه')
  assert.equal(norm('بيتنفسسسس!!'), 'بيتنفس')
  assert.equal(norm('اتصل ١٢٣'), 'اتصل 123')
})
test('التجذيع الخفيف', () => {
  assert.equal(stem('الحروق'), 'حروق')
  assert.equal(stem('حالات'), stem('حاله'))
  assert.equal(stem('بيتنفس'), 'تنفس')
  assert.equal(stem('cpr'), 'cpr')
})
test('كلمات النفي لا تُحذف مع الكلمات الشائعة', () => {
  assert.ok(preprocess('مش بيتنفس').filtered.includes('مش'))
})
test('Edit distance', () => {
  assert.equal(editDistance('kitten', 'sitting'), 3)
  assert.equal(editDistance('اختناق', 'اختناق'), 0)
  assert.equal(editDistance('', 'abc'), 3)
})
test('TF-IDF و cosine: تطابق تام = 1 والمختلف = 0', () => {
  const m = new TfidfModel([{ id: 'a', terms: ['حرق', 'ماء', 'بارد'] }, { id: 'b', terms: ['كسر', 'عظم', 'جبيره'] }])
  assert.ok(Math.abs(cosine(m.vectorize(['حرق', 'ماء', 'بارد']), m.docs[0].vec) - 1) < 1e-9)
  assert.equal(m.rank(['حرق'])[0].id, 'a'); assert.equal(m.rank(['حرق'])[1].score, 0)
})
test('Naive Bayes: احتمالات مجموعها 1 والتصنيف سليم', () => {
  const nb = new NaiveBayes(1).train([{ label: 'x', terms: ['a', 'a', 'b'] }, { label: 'y', terms: ['c', 'd'] }])
  const r = nb.predict(['a', 'b']); assert.equal(r[0].label, 'x'); assert.ok(Math.abs(r.reduce((s, x) => s + x.prob, 0) - 1) < 1e-9)
})
test('Bigram LM: التوزيع الشرطي مجموعه 1 و perplexity أقل للجملة المألوفة', () => {
  const lm = new BigramLM([['اضغط', 'على', 'الصدر'], ['اضغط', 'بقوه']], 0.1)
  const sum = [...lm.vocab].reduce((s, w) => s + lm.prob('اضغط', w), 0); assert.ok(Math.abs(sum - 1) < 1e-9)
  assert.ok(lm.perplexity(['اضغط', 'على', 'الصدر']) < lm.perplexity(['الصدر', 'على', 'اضغط']))
})
test('PPMI: كلمتان في نفس السياق تتقاربان', () => {
  const sp = new PpmiSpace([['x', 'a', 'y'], ['x', 'b', 'y'], ['p', 'c', 'q']], 1)
  assert.ok(sp.neighbors('a', 3).some(n => n.word === 'b'))
})
test('التصحيح الإملائي', () => {
  assert.equal(correctWord('اختناك'), 'اختناق'); assert.equal(correctWord('xyz'), null)
})
test('المحرك: استرجاع الحالات الشائعة', () => {
  assert.equal(search('اتحرقت بمية سخنة', 1)[0].id, 'burns')
  assert.equal(search('عقرب لدغني', 1)[0].id, 'venomous-bite')
  assert.equal(search('نزيف من الانف', 1)[0].id, 'nosebleed')
})
test('المحرك: نيّة التحية والخروج عن النطاق', () => {
  assert.equal(route('ازيك', [{ role: 'user', text: 'ازيك' }]).kind, 'smalltalk')
  assert.equal(route('مين كسب الماتش', [{ role: 'user', text: 'مين كسب الماتش' }]).kind, 'out_of_scope')
})
test('المحرك: سؤال متابعة يرجع لآخر حالة', () => {
  const h = [{ role: 'user', text: 'اتحرقت بمية سخنة' }, { role: 'model', text: '...' }, { role: 'user', text: 'اتجنب ايه' }]
  const r = respond(h); assert.equal(r.sources[0].id, 'burns'); assert.match(r.answer, /ماذا أتجنب/)
})
test('الرد المحلي دائماً يحتوي تنبيه الإسعاف للحالات الحرجة', () => {
  const r = respond([{ role: 'user', text: 'حد وقع ومش بيتنفس' }]); assert.ok(r.emergency); assert.match(r.answer, /123/)
})
test('دقة الاسترجاع على مجموعة التقييم ≥ 85% (Top-3) و ≥ 85% (Top-1)', () => {
  let t1 = 0, t3 = 0
  for (const [q, id] of evalSet) { const r = analyze(q).ranking.filter(x => x.score >= 0.12).map(x => x.id); if (r[0] === id) t1++; if (r.slice(0, 3).includes(id)) t3++ }
  assert.ok(t3 / evalSet.length >= 0.85, `top3=${t3}/${evalSet.length}`); assert.ok(t1 / evalSet.length >= 0.85, `top1=${t1}/${evalSet.length}`)
})

test('الذاكرة: جملة غير مفهومة تُتعلَّم من اختيار المستخدمة ثم تُفهم بصيغة أخرى', async () => {
  const { analyze } = await import('../src/nlp/engine.js'), { learn, forget } = await import('../src/nlp/memory.js')
  forget()
  const before = analyze('الواد بتاعي اتزغلل وبقى يتكركر').ranking[0]
  learn('الواد بتاعي اتزغلل وبقى يتكركر', 'seizure')
  const after = analyze('الواد اتزغلل وبيتكركر').ranking[0]
  assert.equal(after.id, 'seizure'); assert.ok(after.score > before.score)
  forget()
})
test('قناة الحروف تحسّن الجمل الجديدة ولا تكسر الاختبار الأصلي', async () => {
  const { analyze } = await import('../src/nlp/engine.js'), { unseenSet } = await import('../src/nlp/unseen.js')
  const hit = c => unseenSet.filter(([q, id]) => analyze(q, { chars: c }).ranking[0].id === id).length
  assert.ok(hit(true) > hit(false))
})
