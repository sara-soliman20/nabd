// اختبارات الـ LLM الذي بنيناه (Tokenizer + Transformer + التوليد + الشات). شغّلها بعد التدريب: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { topics } from '../src/data/topics.js'
import { loadLLMFromFs } from '../src/nlp/llm/node.js'
import { answerText } from '../src/nlp/llm/format.js'
import { faithfulness, llmRespond } from '../src/nlp/llm/chat.js'
import { trainBPE, BPE } from '../src/nlp/llm/bpe.js'

const llm = loadLLMFromFs()
test('BPE: الترميز وفكّه يعيدان النص بالضبط، وبدون رموز مجهولة', () => {
  for (const t of topics) { const a = answerText(t); assert.equal(llm.bpe.decode(llm.bpe.encode(a)), a, t.id) }
  const b = new BPE(trainBPE(['اضغط على الصدر بقوة', 'اضغط بقوة'], 40)); assert.equal(b.decode(b.encode('اضغط بقوة')), 'اضغط بقوة')
})
test('Transformer (JS) يطابق تنفيذ numpy المرجعي رقمياً', () => {
  const ref = JSON.parse(fs.readFileSync(new URL('./llm-ref.json', import.meta.url))), cache = llm.gpt.newCache(); let logits; const am = []
  for (const t of ref.ids) { logits = llm.gpt.step(t, cache); let b = 0; for (let i = 1; i < logits.length; i++) if (logits[i] > logits[b]) b = i; am.push(b) }
  let maxErr = 0; for (let i = 0; i < ref.last.length; i++) maxErr = Math.max(maxErr, Math.abs(logits[i] - ref.last[i]))
  assert.ok(maxErr < 2e-2, `max logit error ${maxErr}`)
  assert.deepEqual(am, ref.argmax)
})
test('التوليد الجشع (temperature=0) يعيد جواب كل حالة من المكتبة حرفياً', async () => {
  let bad = []
  for (const t of topics) { const g = await llm.generate(t.title, t.title, { temperature: 0 }); if (g.text !== answerText(t)) bad.push(t.id) }
  assert.deepEqual(bad, [])
})
test('يصل لنفس الجواب بصيغ أسئلة متنوعة (عامية/أخطاء)', async () => {
  const cases = [['الطفل بيتخنق ومش عارف يتنفس', 'infant-choking'], ['اتحرقت بميه سخنه', 'burns'], ['حد وقع ومش بيتنفس', 'cpr']]
  for (const [q] of cases) { const r = await llmRespond(llm, [{ role: 'user', text: q }]); assert.equal(r.mode, 'llm', q); assert.ok(r.llm.faithfulness.precision >= 0.98) }
})
test('فحص الأمانة يكتشف سطراً مؤلَّفاً', () => {
  const t = topics[0], ok = faithfulness(answerText(t), t), bad = faithfulness(answerText(t) + '\nخذ مضاداً حيوياً كل ست ساعات', t)
  assert.equal(ok.precision, 1); assert.ok(bad.precision < 1)
})
test('الرسائل الاجتماعية وخارج النطاق تُجاب بالقالب لا بالـ LLM', async () => {
  for (const q of ['شكرا', 'مين كسب الماتش']) { const r = await llmRespond(llm, [{ role: 'user', text: q }]); assert.equal(r.mode, 'nlp'); assert.ok(r.answer.length > 5) }
})
test('درجة حرارة عالية: لا ينهار ويعطي نصاً، وبنفس seed تتكرر النتيجة', async () => {
  const a = await llm.generate('حرق', topics.find(t => t.id === 'burns').title, { temperature: 1.4, seed: 7 }), b = await llm.generate('حرق', topics.find(t => t.id === 'burns').title, { temperature: 1.4, seed: 7 })
  assert.ok(a.text.length > 20); assert.equal(a.text, b.text)
})
