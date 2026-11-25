// يبني بيانات تدريب الـ LLM: node scripts/llm-build-data.js
// 1) يدرّب BPE على نصوص المكتبة  2) يحوّل كل حالة إلى (أسئلة متنوعة + عنوان + جواب) كـ token ids  → llm/dataset.json
// 3) يحفظ الـ tokenizer في public/llm/tokenizer.json (يستخدمه المتصفح).
import fs from 'node:fs'
import { topics } from '../src/data/topics.js'
import { trainBPE, BPE, SPECIAL } from '../src/nlp/llm/bpe.js'
import { answerText, questionVariants } from '../src/nlp/llm/format.js'
const VOCAB = +(process.argv[2] || 700)
const texts = topics.flatMap(t => [t.title, answerText(t), ...questionVariants(t)])
const tok = trainBPE(texts, VOCAB), bpe = new BPE(tok)
const data = topics.map(t => ({
  id: t.id, title: bpe.encode(t.title), answer: bpe.encode(answerText(t)),
  questions: questionVariants(t).map(q => bpe.encode(q).slice(0, 28)),
}))
const lens = data.map(d => d.title.length + d.answer.length)
fs.mkdirSync('llm', { recursive: true }); fs.mkdirSync('public/llm', { recursive: true })
fs.writeFileSync('public/llm/tokenizer.json', JSON.stringify(tok))
fs.writeFileSync('llm/dataset.json', JSON.stringify({ vocab: bpe.size, special: SPECIAL.length, topics: data }))
const chars = topics.map(t => answerText(t).length)
console.log(`vocab=${bpe.size} merges=${tok.merges.length} | topics=${data.length} | answer tokens: max=${Math.max(...lens)} avg=${(lens.reduce((a, b) => a + b, 0) / lens.length).toFixed(0)} | chars/token=${(chars.reduce((a, b) => a + b, 0) / data.reduce((a, d) => a + d.answer.length, 0)).toFixed(2)} | questions/topic avg=${(data.reduce((a, d) => a + d.questions.length, 0) / data.length).toFixed(0)}`)
