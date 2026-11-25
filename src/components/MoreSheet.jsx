import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { moreLinks } from './navItems.js'
import LangToggle from './LangToggle.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import InstallCard from './InstallCard.jsx'
import Mascot from './Mascot.jsx'
import { useLang } from '../i18n/index.jsx'
import { TONE } from './tones.js'

export default function MoreSheet({ onClose }) {
  const { t } = useLang()
  useEffect(() => {
    const k = e => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k)
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev }
  }, [onClose])
  return (<>
    <div className="sheet-back" onClick={onClose} aria-hidden="true" />
    <div className="sheet" role="dialog" aria-modal="true" aria-label={t('nav.more')}>
      <div className="grab" />
      <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Mascot size={44} animate={false} /><h2 className="font-display font-extrabold text-xl">{t('more.title')}</h2></div>
        <button onClick={onClose} className="icon-btn" aria-label={t('common.close')}><X size={20} aria-hidden="true" /></button></div>
      <div className="grid grid-cols-3 gap-3">
        {moreLinks.map(([to, key, Icon, tone]) => <Link key={to} to={to} onClick={onClose} className="card card-link !p-3 flex flex-col items-center gap-2 text-center">
          <span className={`tile w-14 h-14 ${TONE[tone].bg}`}><Icon size={26} aria-hidden="true" /></span><span className="font-display font-bold text-sm leading-tight">{t(key)}</span></Link>)}
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4"><LangToggle full /><ThemeToggle full /></div>
      <div className="mt-3"><InstallCard /></div>
    </div></>)
}
