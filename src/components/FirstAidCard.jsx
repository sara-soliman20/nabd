import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useContent, CAT_TONE } from '../i18n/content.js'
import { useLang } from '../i18n/index.jsx'
import { TONE, BADGE } from './tones.js'

// بطاقة حالة بشكل «صف تطبيق»: بلاطة إيموجي + عنوان + ملخص + درجة الخطورة.
export default function FirstAidCard({ topic, compact = false }) {
  const { severity } = useContent(); const { t } = useLang()
  const tone = CAT_TONE[topic.catId]
  return (<Link to={`/library/${topic.id}`} className={`card card-link flex items-center gap-3 ${compact ? '!p-3 w-[15.5rem] md:w-auto shrink-0 snap-start' : ''}`}>
    <span className={`tile ${compact ? 'w-14 h-14 text-3xl' : 'w-16 h-16 text-4xl'} ${TONE[tone].bg}`} aria-hidden="true">{topic.icon}</span>
    <span className="min-w-0 flex-1 space-y-0.5">
      <span className={`badge ${BADGE[topic.severity]}`}>{topic.severity === 'critical' && '🚨'}{severity[topic.severity]}</span>
      <span className="block font-display font-bold text-[1.05rem] leading-snug">{topic.title}</span>
      {!compact && <span className="block text-sm text-muted line-clamp-2">{topic.summary}</span>}
    </span>
    {!compact && <ChevronRight className="shrink-0 text-muted flip-rtl" size={22} aria-label={t('common.open')} />}
  </Link>)
}
