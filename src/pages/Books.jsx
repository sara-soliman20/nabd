import { ExternalLink, AlertTriangle } from 'lucide-react'
import PageHead from '../components/PageHead.jsx'
import { useContent } from '../i18n/content.js'
import { useLang } from '../i18n/index.jsx'
export default function Books() {
  const { t } = useLang(); const { books } = useContent()
  return (<div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
    <PageHead emoji="📖" tone="lav" title={t('books.title')} text={t('books.sub')} />
    <div className="grid gap-3">{books.map(b => (<article key={b.id} className="card space-y-2"><h2 className="font-display font-bold text-lg leading-snug">{b.title}</h2>
      <p className="text-sm text-muted">{b.publisher}{b.pages ? ` • ${b.pages} ${t('books.pages')}` : ''}</p><p className="text-sm">{b.note}</p>
      {b.caution && <p className="flex gap-2 rounded-2xl bg-pop-butter/70 border-2 border-line p-3 text-sm"><AlertTriangle size={18} className="shrink-0 mt-0.5" aria-hidden="true" /><span>{b.caution}</span></p>}
      <a href={b.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm"><ExternalLink size={16} aria-hidden="true" />{t('books.open')}</a></article>))}</div></div>)
}
