import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Phone, Check } from 'lucide-react'
import Illustration from '../components/Illustrations.jsx'
import VideoEmbed from '../components/VideoEmbed.jsx'
import CaseVisual from '../components/CaseVisual.jsx'
import CprRhythm from '../components/CprRhythm.jsx'
import { TONE, BADGE } from '../components/tones.js'
import { topicVideos } from '../data/videos.js'
import { useContent, CAT_TONE } from '../i18n/content.js'
import { useLang } from '../i18n/index.jsx'

const Bullets = ({ title, emoji, items, cls = '' }) => items?.length ? (<section className={`card space-y-2 ${cls}`}><h2 className="font-display font-extrabold text-xl">{title}</h2>
  <ul className="space-y-2">{items.map((s, i) => <li key={i} className="flex gap-2.5 items-start"><span className="shrink-0 mt-0.5" aria-hidden="true">{emoji}</span><span>{s}</span></li>)}</ul></section>) : null

function Steps({ title, items, hint }) {
  const [done, setDone] = useState(() => new Set())
  const flip = i => setDone(d => { const n = new Set(d); n.has(i) ? n.delete(i) : n.add(i); return n })
  return (<section className="space-y-3"><div className="flex items-end justify-between gap-2"><h2 className="font-display font-extrabold text-xl">{title}</h2><span className="text-sm text-muted font-bold">{done.size}/{items.length}</span></div>
    <p className="text-sm text-muted -mt-1">{hint}</p>
    <ol className="space-y-2.5">{items.map((s, i) => { const on = done.has(i)
      return (<li key={i}><button onClick={() => flip(i)} aria-pressed={on} className={`card card-link w-full flex gap-3 items-start text-start !p-3.5 ${on ? '!bg-pop-mint/70' : ''}`}>
        <span className={`shrink-0 w-9 h-9 rounded-full grid place-items-center font-display font-extrabold ${on ? 'bg-ok text-canvas' : 'bg-brand text-white'}`}>{on ? <Check size={20} aria-hidden="true" /> : i + 1}</span>
        <span className={`pt-0.5 ${on ? 'opacity-60' : ''}`}>{s}</span></button></li>) })}</ol></section>)
}

export default function TopicDetail() {
  const { id } = useParams(); const { t } = useLang(); const { topics, severity, byId } = useContent()
  const x = byId[id]
  if (!x) return (<div className="max-w-md mx-auto px-4 pt-10 text-center space-y-4"><div className="text-6xl" aria-hidden="true">🤔</div><p className="font-display font-bold text-xl">{t('detail.missing')}</p><Link className="btn" to="/library">{t('detail.back')}</Link></div>)
  const related = topics.filter(r => r.catId === x.catId && r.id !== x.id)
  const tone = CAT_TONE[x.catId]
  return (<div className="max-w-3xl mx-auto px-4 pt-3 space-y-4">
    <Link to="/library" className="inline-flex items-center gap-1 font-display font-bold text-accent"><ChevronLeft size={20} className="flip-rtl" aria-hidden="true" />{t('detail.back')}</Link>
    <header className="flex items-start gap-3">
      <span className={`tile w-20 h-20 text-5xl ${TONE[tone].bg}`} aria-hidden="true">{x.icon}</span>
      <div className="min-w-0 flex-1 space-y-1"><span className={`badge ${BADGE[x.severity]}`}>{x.severity === 'critical' && '🚨'}{severity[x.severity]}</span>
        <h1 className="font-display font-extrabold text-[1.65rem] leading-tight">{x.title}</h1><p className="text-muted">{x.summary}</p></div></header>
    {x.severity === 'critical' && <a href="tel:123" className="btn btn-block pulse-call !min-h-[60px] !text-lg"><Phone size={22} aria-hidden="true" />{t('detail.call')}</a>}
    <CaseVisual t={x} />
    <Illustration id={x.id} />
    <Bullets title={t('detail.signs')} emoji="👀" items={x.signs} />
    <Bullets title={t('detail.danger')} emoji="⚠️" items={x.danger} cls="!bg-pop-butter/70" />
    <Steps title={t('detail.steps')} hint={t('detail.steps.hint')} items={x.steps} />
    <Bullets title={t('detail.avoid')} emoji="❌" items={x.avoid} cls="!bg-pop-rose/60" />
    <Bullets title={t('detail.callwhen')} emoji="📞" items={x.callWhen} />
    {x.tool === 'rhythm' && <CprRhythm />}
    {related.length > 0 && <section className="space-y-2"><h2 className="font-display font-extrabold text-xl">{t('detail.related')}</h2>
      <div className="flex gap-2 flex-wrap">{related.map(r => <Link key={r.id} to={`/library/${r.id}`} className="chip chip-wrap"><span aria-hidden="true">{r.icon}</span>{r.title}</Link>)}</div></section>}
    {(topicVideos[x.id] || []).map(v => <VideoEmbed key={v.id} src={`https://www.youtube-nocookie.com/embed/${v.id}`} title={v.title} />)}
  </div>)
}
