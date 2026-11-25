import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ui } from './ui.js'

const KEY = 'nabd-lang'
const Ctx = createContext(null)
const initial = () => { try { const s = localStorage.getItem(KEY); if (s === 'ar' || s === 'en') return s } catch { /* التخزين غير متاح */ } return 'ar' }

export function LangProvider({ children }) {
  const [lang, setLang] = useState(initial)
  useEffect(() => {
    const el = document.documentElement
    el.lang = lang; el.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.title = ui[lang]['meta.title']
    document.querySelector('meta[name="description"]')?.setAttribute('content', ui[lang]['meta.desc'])
    try { localStorage.setItem(KEY, lang) } catch { /* التخزين غير متاح */ }
  }, [lang])
  const t = useCallback((k, vars) => {
    let s = ui[lang][k] ?? ui.ar[k] ?? k
    if (vars) for (const [a, b] of Object.entries(vars)) s = s.replaceAll(`{${a}}`, String(b))
    return s
  }, [lang])
  const value = useMemo(() => ({ lang, setLang, t, isAr: lang === 'ar', dir: lang === 'ar' ? 'rtl' : 'ltr', toggle: () => setLang(l => (l === 'ar' ? 'en' : 'ar')) }), [lang, t])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useLang = () => useContext(Ctx)
