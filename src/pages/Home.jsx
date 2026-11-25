import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Phone, Search, ChevronRight } from 'lucide-react'
import Mascot from '../components/Mascot.jsx'
import FirstAidCard from '../components/FirstAidCard.jsx'
import Section from '../components/Section.jsx'
import InstallCard from '../components/InstallCard.jsx'
import { useContent } from '../i18n/content.js'
import { useLang } from '../i18n/index.jsx'
import { TONE } from '../components/tones.js'

const FEATURED = ['cpr', 'choking', 'severe-bleeding', 'heart-attack', 'stroke', 'burns']
const TOOLS = [
  ['/assistant', 'tool.ask', '💬', 'lav'], ['/library', 'nav.library', '📚', 'peach'], ['/voice', 'nav.voice', '🎙️', 'sky'], ['/quiz', 'nav.quiz', '🏆', 'butter'],
  ['/kit', 'nav.kit', '🧰', 'mint'], ['/emergency', 'tool.rhythm', '💓', 'rose'], ['/videos', 'nav.videos', '🎬', 'sky'], ['/emergency', 'tool.numbers', '☎️', 'peach'],
]

export default function Home() {
  const { t } = useLang(); const { topics, categories, numbers, byId } = useContent(); const nav = useNavigate()
  const [q, setQ] = useState('')
  const go = e => { e.preventDefault(); nav(q.trim() ? `/library?q=${encodeURIComponent(q.trim())}` : '/library') }
  return (<div className="max-w-6xl mx-auto px-4 pt-4 space-y-8">
    {/* البطل: نبوض يرحّب + زر الاتصال */}
    <section className="card !p-4 sm:!p-6 !border-brand/25 bg-pop-rose/60 grid md:grid-cols-[auto_1fr] gap-4 md:gap-8 items-center">
      <div className="flex items-center gap-3 md:flex-col md:gap-2">
        <Mascot size={120} mood="wave" className="shrink-0 md:!w-44 md:!h-44" />
        <div className="bubble bubble-tail ms-3 md:hidden flex-1"><p className="font-display font-bold text-[1.05rem] leading-snug">{t('home.hi')}</p></div>
      </div>
      <div className="space-y-3">
        <div className="bubble hidden md:block w-fit"><p className="font-display font-bold text-lg">{t('home.hi')}</p></div>
        <h1 className="font-display font-extrabold text-[1.9rem] md:text-4xl leading-tight">{t('home.title')}</h1>
        <p className="text-muted">{t('home.sub')}</p>
        <div>
          <a href="tel:123" className="btn btn-block pulse-call !min-h-[64px] !text-[1.25rem]"><Phone size={26} aria-hidden="true" />{t('call.btn')}</a>
        </div>
        <form onSubmit={go} className="flex gap-2" role="search">
          <div className="relative flex-1"><Search size={20} className="absolute top-1/2 -translate-y-1/2 text-muted pointer-events-none" style={{ insetInlineStart: 16 }} aria-hidden="true" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('home.search')} aria-label={t('home.search')} className="input !ps-12" /></div>
          <button className="btn btn-soft !px-4" aria-label={t('common.search')}><ChevronRight size={22} className="flip-rtl" aria-hidden="true" /></button>
        </form>
      </div>
    </section>

    {/* شبكة الأدوات (طابع التطبيقات الشاملة) */}
    <Section title={t('home.tools')} emoji="✨">
      <div className="grid grid-cols-4 gap-x-2 gap-y-4 md:grid-cols-8">
        {TOOLS.map(([to, key, emoji, tone], i) => (<Link key={i} to={to} className="flex flex-col items-center gap-1.5 text-center group">
          <span className={`tile w-[4.1rem] h-[4.1rem] text-[1.9rem] ${TONE[tone].bg} transition-transform group-active:scale-90`} aria-hidden="true">{emoji}</span>
          <span className="font-display font-bold text-[.82rem] leading-tight">{t(key)}</span></Link>))}
      </div>
    </Section>

    <Section title={t('home.must')} emoji="🚨" action={<Link to="/library" className="font-display font-bold text-accent text-sm inline-flex items-center gap-0.5">{t('common.all')}<ChevronRight size={16} className="flip-rtl" aria-hidden="true" /></Link>}>
      <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x -mx-4 px-4 pb-2 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:overflow-visible">
        {FEATURED.map(id => <FirstAidCard key={id} topic={byId[id]} compact />)}</div>
    </Section>

    <Section title={t('home.browse')} emoji="🗂️">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{categories.map(c => (<Link key={c.id} to={`/library?cat=${c.id}`} className={`card card-link flex items-center gap-3 !p-3 ${TONE[c.tone].soft}`}>
        <span className="tile w-12 h-12 text-2xl bg-surface" aria-hidden="true">{c.icon}</span>
        <span className="min-w-0"><span className="block font-display font-bold leading-tight">{c.label}</span><span className="text-sm text-muted">{t('home.cases', { n: topics.filter(x => x.catId === c.id).length })}</span></span></Link>))}</div>
    </Section>

    <Section title={t('home.numbers')} emoji="☎️">
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2 md:mx-0 md:px-0 md:grid md:grid-cols-5 md:overflow-visible">
        {numbers.map(n => (<a key={n.n} href={`tel:${n.n}`} className={`card card-link text-center shrink-0 w-36 md:w-auto !p-3 ${n.main ? '!bg-brand !border-brand-deep !text-white' : ''}`}>
          <span className="block font-display font-extrabold text-3xl">{n.n}</span><span className="block font-bold text-sm leading-tight">{n.label}</span></a>))}</div>
    </Section>

    <div className="md:max-w-md md:mx-auto"><InstallCard /></div>
  </div>)
}
