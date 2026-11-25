import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import FirstAidCard from '../components/FirstAidCard.jsx'
import PageHead from '../components/PageHead.jsx'
import { useContent } from '../i18n/content.js'
import { useLang } from '../i18n/index.jsx'
import { norm } from '../utils/arabic.js'
import { normText, haystack as enHay } from '../utils/localSearch.js'

export default function Library() {
  const { t, isAr } = useLang(); const { topics, categories } = useContent()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const cat = categories.some(c => c.id === params.get('cat')) ? params.get('cat') : 'all'
  const setCat = c => { const p = new URLSearchParams(params); c === 'all' ? p.delete('cat') : p.set('cat', c); setParams(p, { replace: true }) }
  const words = (isAr ? norm(q) : normText(q)).split(' ').filter(Boolean)
  const hay = useMemo(() => topics.map(x => (isAr ? norm([x.title, x.summary, ...x.keywords].join(' ')) : enHay(x))), [topics, isAr])
  const list = topics.filter((x, i) => (cat === 'all' || x.catId === cat) && words.every(w => hay[i].includes(w)))
  const counts = id => topics.filter(x => id === 'all' || x.catId === id).length
  return (<div className="max-w-6xl mx-auto px-4 pt-4 space-y-4">
    <PageHead emoji="📚" tone="peach" title={t('lib.title')} text={t('lib.sub', { n: topics.length })} />
    <div className="relative"><Search size={20} className="absolute top-1/2 -translate-y-1/2 text-muted pointer-events-none" style={{ insetInlineStart: 16 }} aria-hidden="true" />
      <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('lib.search')} aria-label={t('common.search')} className="input !ps-12 !pe-12" />
      {q && <button onClick={() => setQ('')} aria-label={t('common.clear')} className="absolute top-1/2 -translate-y-1/2 p-2 text-muted" style={{ insetInlineEnd: 6 }}><X size={18} aria-hidden="true" /></button>}</div>
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1 md:flex-wrap md:mx-0 md:px-0" role="group" aria-label={t('lib.cats')}>
      {[{ id: 'all', label: t('common.all'), icon: '🌈' }, ...categories].map(c => <button key={c.id} onClick={() => setCat(c.id)} aria-pressed={cat === c.id} className="chip"><span aria-hidden="true">{c.icon}</span>{c.label}<span className="opacity-70 text-xs">{counts(c.id)}</span></button>)}</div>
    {list.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{list.map(x => <FirstAidCard key={x.id} topic={x} />)}</div>
      : <div className="card text-center py-8 space-y-2"><div className="text-5xl" aria-hidden="true">🔎</div><p className="font-display font-bold text-lg">{t('lib.none')}</p><p className="text-muted">{t('lib.none.hint')}</p></div>}
  </div>)
}
