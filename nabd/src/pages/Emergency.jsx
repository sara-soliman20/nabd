import { Link } from 'react-router-dom'
import { Phone } from 'lucide-react'
import PageHead from '../components/PageHead.jsx'
import CprRhythm from '../components/CprRhythm.jsx'
import { useContent } from '../i18n/content.js'
import { useLang } from '../i18n/index.jsx'
export default function Emergency() {
  const { t } = useLang(); const { numbers, callScript, sceneSafety } = useContent()
  return (<div className="max-w-3xl mx-auto px-4 pt-4 space-y-5">
    <PageHead emoji="🚨" tone="rose" title={t('emg.title')} text={t('emg.sub')} />
    <a href="tel:123" className="btn btn-block pulse-call !min-h-[78px] !text-2xl"><Phone size={30} aria-hidden="true" />{t('call.btn')}</a>
    <section className="space-y-3"><h2 className="font-display font-extrabold text-xl">{t('emg.numbers')}</h2>
      <div className="grid sm:grid-cols-2 gap-3">{numbers.map(n => <a key={n.n} href={`tel:${n.n}`} className="card card-link flex items-center gap-4 !p-3.5"><span className={`tile w-16 h-16 font-display font-extrabold text-2xl ${n.main ? '!bg-brand text-white' : 'bg-pop-rose'}`}>{n.n}</span><span><b className="font-display text-lg">{n.label}</b><br /><span className="text-sm text-muted">{n.note}</span></span></a>)}</div></section>
    <section className="card space-y-2"><h2 className="font-display font-extrabold text-xl">{t('emg.script')}</h2><ol className="space-y-2">{callScript.map((s, i) => <li key={i} className="flex gap-3"><b className="shrink-0 w-7 h-7 rounded-full bg-brand text-white grid place-items-center text-sm">{i + 1}</b><span>{s}</span></li>)}</ol></section>
    <section className="card space-y-2"><h2 className="font-display font-extrabold text-xl">{t('emg.scene')}</h2><ol className="space-y-2">{sceneSafety.map(([h, d], i) => <li key={h} className="flex gap-3"><b className="shrink-0 w-7 h-7 rounded-full bg-pop-butter grid place-items-center text-sm">{i + 1}</b><span><b>{h}:</b> {d}</span></li>)}</ol>
      <Link to="/assistant" className="btn btn-sm mt-2">{t('emg.quick')}</Link></section>
    <CprRhythm /></div>)
}
