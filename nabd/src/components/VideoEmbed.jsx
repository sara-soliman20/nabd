import { useState } from 'react'
import { Play } from 'lucide-react'
import { useLang } from '../i18n/index.jsx'
// لا يحمّل YouTube إلا بعد الضغط (أسرع وأكثر خصوصية).
export default function VideoEmbed({ src, title }) {
  const { t } = useLang(); const [on, setOn] = useState(false)
  return (<div className="card !p-0 overflow-hidden aspect-video">{on
    ? <iframe className="w-full h-full" src={src + (src.includes('?') ? '&' : '?') + 'autoplay=1'} title={title} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
    : <button onClick={() => setOn(true)} className="w-full h-full flex flex-col items-center justify-center gap-3 bg-pop-sky/60" aria-label={`${t('video.play')}: ${title}`}>
      <span className="rounded-full bg-brand text-white p-5 shadow-[0_5px_0_rgb(var(--brand-deep))]"><Play size={28} aria-hidden="true" /></span><span className="font-display font-bold px-4">{title}</span></button>}</div>)
}
