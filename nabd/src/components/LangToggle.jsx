import { Languages } from 'lucide-react'
import { useLang } from '../i18n/index.jsx'
export default function LangToggle({ className = '', full = false }) {
  const { toggle, isAr, t } = useLang()
  return (<button onClick={toggle} aria-label={t('lang.switch')} className={`${full ? 'btn btn-line btn-block' : 'chip'} ${className}`}>
    <Languages size={18} aria-hidden="true" /><span className="font-display font-bold">{isAr ? 'English' : 'عربي'}</span></button>)
}
