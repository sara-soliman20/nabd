// يختار نسخة المحتوى (عربي/إنجليزي). العربي هو الأصل (topics.js يستخدمه محرك NLP والخادم)، والإنجليزي ملفات موازية بنفس المعرّفات.
import { useMemo } from 'react'
import { useLang } from './index.jsx'
import { topics as arTopics, categories as arCats, severityLabel as arSev, categoryIcons } from '../data/topics.js'
import { topicsEn, categoriesEn, severityEn } from '../data/en/topics.en.js'
import { quiz as arQuiz } from '../data/quiz.js'
import { quizEn } from '../data/en/quiz.en.js'
import { nodes as arNodes } from '../data/triage.js'
import { nodesEn } from '../data/en/triage.en.js'
import { kitGroups as arKit } from '../data/kit.js'
import { numbers as arNumbers, callScript as arCall, sceneSafety as arScene } from '../data/numbers.js'
import { kitGroupsEn, numbersEn, callScriptEn, sceneSafetyEn, booksEn } from '../data/en/misc.en.js'
import { books as arBooks } from '../data/books.js'

export const CAT_IDS = ['heart', 'allergy', 'bleeding', 'burns', 'bones', 'poison'] // نفس ترتيب categories في topics.js
const catIdOf = ar => CAT_IDS[arCats.indexOf(ar)]
export const CAT_TONE = { heart: 'rose', allergy: 'lav', bleeding: 'peach', burns: 'butter', bones: 'sky', poison: 'mint' }

const build = lang => {
  const en = lang === 'en'
  const topics = arTopics.map(t => {
    const catId = catIdOf(t.category)
    return en ? { ...t, ...topicsEn[t.id], keywords: topicsEn[t.id].kw, catId, category: categoriesEn[catId] } : { ...t, catId }
  })
  const categories = CAT_IDS.map((id, i) => ({ id, label: en ? categoriesEn[id] : arCats[i], icon: categoryIcons[arCats[i]], tone: CAT_TONE[id] }))
  const severity = en ? severityEn : arSev
  const quiz = en ? arQuiz.map((q, i) => ({ ...q, ...quizEn[i] })) : arQuiz
  const nodes = en ? nodesEn : arNodes
  const kit = en ? kitGroupsEn : arKit
  const numbers = en ? numbersEn : arNumbers
  const callScript = en ? callScriptEn : arCall
  const sceneSafety = en ? sceneSafetyEn : arScene
  const books = arBooks.filter(b => b.kind !== 'course').map(b => (en ? { ...b, ...booksEn[b.id] } : b)) // مرجع مقرر NLP لا يظهر في التطبيق
  return { topics, categories, severity, quiz, nodes, kit, numbers, callScript, sceneSafety, books, byId: Object.fromEntries(topics.map(t => [t.id, t])) }
}
const cache = {}
export const getContent = lang => (cache[lang] ||= build(lang))
export const useContent = () => { const { lang } = useLang(); return useMemo(() => getContent(lang), [lang]) }
