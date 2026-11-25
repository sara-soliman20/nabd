import { Link } from 'react-router-dom'
import { ImagePlus, Sparkles, WifiOff } from 'lucide-react'
import Illustration, { hasIllustration } from './Illustrations.jsx'
import Mascot from './Mascot.jsx'
import { useLang } from '../i18n/index.jsx'
const rich = t => String(t).split(/\*\*(.+?)\*\*/g).map((p, i) => (i % 2 ? <strong key={i}>{p}</strong> : p))
export default function ChatMessage({ m, onImage, imgBusy }) {
  const { t } = useLang(); const mine = m.role === 'user'
  return (<div data-msg className={`flex items-end gap-2 ${mine ? 'row-me' : 'row-bot'}`}>
    {!mine && <Mascot size={34} animate={false} className="shrink-0 mb-1" />}
    <div className={`msg ${mine ? 'msg-me' : 'msg-bot'}`}>
      {m.emergency && <a href="tel:123" className="block mb-2 rounded-2xl bg-brand text-white text-center font-display font-bold p-2.5">🚨 {t('chat.emergency')}</a>}
      <p className="whitespace-pre-wrap">{rich(m.text)}</p>
      {m.image && <figure className="mt-3"><img src={`data:${m.image.mime};base64,${m.image.data}`} alt={t('chat.img.alt')} className="rounded-2xl w-full max-w-sm mx-auto" /><figcaption className="text-xs text-muted mt-1">{t('chat.img.cap')}</figcaption></figure>}
      {!mine && !m.image && m.sources?.filter(s => hasIllustration(s.id)).slice(0, 1).map(s => <div key={s.id} className="mt-3"><Illustration id={s.id} /></div>)}
      {!mine && m.mode === 'gemini' && !m.image && onImage && <button onClick={onImage} disabled={imgBusy} className="btn btn-soft btn-sm mt-3 disabled:opacity-50"><ImagePlus size={16} aria-hidden="true" />{imgBusy ? t('chat.drawing') : t('chat.draw')}</button>}
      {m.sources?.length > 0 && <div className="mt-3 pt-2.5 border-t-2 border-line text-sm flex gap-x-3 gap-y-1 flex-wrap"><span className="text-muted">{t('chat.sources')}</span>{m.sources.map(s => <Link key={s.id} to={`/library/${s.id}`} className="underline font-semibold text-accent">{s.title}</Link>)}</div>}
      {!mine && m.mode === 'gemini' && <p className="text-xs text-muted mt-2 flex items-center gap-1"><Sparkles size={13} aria-hidden="true" />{t('chat.gemini.note')}</p>}
      {!mine && m.mode === 'offline' && <p className="text-xs text-muted mt-2 flex items-center gap-1"><WifiOff size={13} aria-hidden="true" />{t('chat.offline.note')}</p>}
    </div></div>)
}
