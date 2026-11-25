// تحميل النموذج في Node (للاختبارات والسكربتات فقط — لا يُستورد من الواجهة).
import fs from 'node:fs'
import { NabdLLM } from './llm.js'
export function loadLLMFromFs(dir = new URL('../../../public/llm/', import.meta.url).pathname) {
  const b = fs.readFileSync(dir + 'model.bin')
  return new NabdLLM(JSON.parse(fs.readFileSync(dir + 'tokenizer.json', 'utf8')), JSON.parse(fs.readFileSync(dir + 'model.json', 'utf8')), b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))
}
