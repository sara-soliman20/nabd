import { TONE } from './tones.js'
// عنوان الصفحة: بلاطة إيموجي + عنوان + وصف قصير.
export default function PageHead({ emoji, title, text, tone = 'rose', children }) {
  return (<header className="flex items-start gap-3">
    <span className={`tile w-14 h-14 text-3xl ${TONE[tone].bg}`} aria-hidden="true">{emoji}</span>
    <div className="min-w-0 flex-1"><h1 className="font-display font-extrabold text-[1.7rem] leading-tight">{title}</h1>{text && <p className="text-muted mt-1">{text}</p>}{children}</div>
  </header>)
}
