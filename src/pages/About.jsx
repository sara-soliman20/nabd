import { Link } from 'react-router-dom'
import Mascot from '../components/Mascot.jsx'
import InstallCard from '../components/InstallCard.jsx'
import { useLang } from '../i18n/index.jsx'
export default function About() {
  const { t } = useLang()
  return (<div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
    <div className="text-center space-y-1"><Mascot size={140} mood="wave" className="mx-auto" /><h1 className="font-display font-extrabold text-3xl">{t('about.title')}</h1></div>
    <section className="card space-y-1"><h2 className="font-display font-extrabold text-xl">💗 {t('about.mission.h')}</h2><p>{t('about.mission')}</p></section>
    <section className="card space-y-2"><h2 className="font-display font-extrabold text-xl">✨ {t('about.offer.h')}</h2><ul className="space-y-1.5">{[1, 2, 3, 4, 5].map(i => <li key={i} className="flex gap-2"><span aria-hidden="true">•</span><span>{t(`about.offer.${i}`)}</span></li>)}</ul></section>
    <section className="card space-y-1 !bg-pop-butter/70"><h2 className="font-display font-extrabold text-xl">⚠️ {t('about.warn.h')}</h2><p>{t('about.warn')}</p></section>
    <InstallCard /><div className="text-center"><Link to="/library" className="btn">{t('about.cta')}</Link></div></div>)
}
