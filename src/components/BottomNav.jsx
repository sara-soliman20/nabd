import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Home, BookOpen, Bot, LayoutGrid, Siren } from 'lucide-react'
import MoreSheet from './MoreSheet.jsx'
import { useLang } from '../i18n/index.jsx'

const Tab = ({ to, icon: Icon, label, end }) => (<li><NavLink to={to} end={end} className="tab">
  <span className="ico"><Icon size={22} strokeWidth={2.2} aria-hidden="true" /></span>{label}</NavLink></li>)

export default function BottomNav() {
  const { t } = useLang(); const [more, setMore] = useState(false)
  return (<>
    <nav aria-label={t('nav.quick')} className="tabbar lg:hidden">
      <ul className="grid grid-cols-5 items-end">
        <Tab to="/" end icon={Home} label={t('nav.home')} />
        <Tab to="/library" icon={BookOpen} label={t('nav.library')} />
        <li className="flex justify-center"><Link to="/emergency" aria-label={t('nav.sos')} className="sos"><Siren size={28} aria-hidden="true" /></Link></li>
        <Tab to="/assistant" icon={Bot} label={t('nav.ask')} />
        <li><button className="tab w-full" onClick={() => setMore(true)} aria-haspopup="dialog"><span className="ico"><LayoutGrid size={22} strokeWidth={2.1} aria-hidden="true" /></span>{t('nav.more')}</button></li>
      </ul></nav>
    {more && <MoreSheet onClose={() => setMore(false)} />}</>)
}
