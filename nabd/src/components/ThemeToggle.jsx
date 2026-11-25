import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useLang } from '../i18n/index.jsx'
export default function ThemeToggle({ full = false }) {
  const { t } = useLang()
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const toggle = () => { const d = !dark; setDark(d); document.documentElement.classList.toggle('dark', d); try { localStorage.setItem('nabd-theme', d ? 'dark' : 'light') } catch { /* التخزين غير متاح */ } }
  const Icon = dark ? Sun : Moon
  return full
    ? <button onClick={toggle} aria-pressed={dark} className="btn btn-line btn-block"><Icon size={20} aria-hidden="true" />{dark ? t('theme.light') : t('theme.dark')}</button>
    : <button onClick={toggle} aria-pressed={dark} aria-label={t('theme.toggle')} className="icon-btn"><Icon size={20} aria-hidden="true" /></button>
}
