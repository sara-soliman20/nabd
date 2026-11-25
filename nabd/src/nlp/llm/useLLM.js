import { useEffect, useState } from 'react'
import { loadLLM } from './llm.js'
// تحميل النموذج مرة واحدة فقط لكل الصفحة (≈ 1MB) ثم إعادة استخدامه.
let promise = null
export const getLLM = () => (promise ||= loadLLM(`${import.meta.env.BASE_URL || '/'}llm`.replace(/\/\/llm$/, '/llm')).catch(e => { promise = null; throw e }))
export function useLLM() {
  const [s, set] = useState({ llm: null, error: null })
  useEffect(() => { let ok = true; getLLM().then(llm => ok && set({ llm, error: null }), error => ok && set({ llm: null, error })); return () => { ok = false } }, [])
  return s
}
