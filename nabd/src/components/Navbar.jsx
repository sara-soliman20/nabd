import { NavLink, Link } from 'react-router-dom'
import { Siren } from 'lucide-react'
import Logo from './Logo.jsx'
import LangToggle from './LangToggle.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { mainLinks } from './navItems.js'
import { useLang } from '../i18n/index.jsx'

export default function Navbar() {
  const { t } = useLang()
  return (<header className="appbar"><div className="max-w-6xl mx-auto flex items-center justify-between gap-2 px-4 py-2.5">
    <Link to="/" aria-label={t('nav.home')}><Logo size={40} /></Link>
    <nav aria-label={t('nav.main')} className="hidden lg:flex items-center gap-1 rounded-full bg-surface border-2 border-line p-1">
      {mainLinks.map(([to, key]) => <NavLink key={to} to={to} end={to === '/'}
        className={({ isActive }) => `rounded-full px-2.5 py-1 font-display font-bold text-[.9rem] whitespace-nowrap transition ${isActive ? 'bg-brand text-white' : 'text-muted hover:text-accent'}`}>{t(key)}</NavLink>)}
    </nav>
    <div className="flex items-center gap-2">
      <LangToggle /><ThemeToggle />
      <Link to="/emergency" className="btn btn-sm hidden xl:inline-flex whitespace-nowrap"><Siren size={16} aria-hidden="true" />{t('nav.sos')} 123</Link>
    </div></div></header>)
}
