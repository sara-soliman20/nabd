import { Phone, CheckCircle2, XCircle } from 'lucide-react'
import { useLang } from '../i18n/index.jsx'
// «الخلاصة المصورة»: ملخص بصري لكل حالة مبني من بيانات الحالة نفسها (لا محتوى مضاف).
export default function CaseVisual({ t: topic }) {
  const { t } = useLang()
  const tiles = [
    { Icon: Phone, label: t('detail.sum.call'), text: topic.callWhen?.[0] || t('detail.sum.call.default'), cls: 'bg-brand text-white border-brand-deep' },
    { Icon: CheckCircle2, label: t('detail.sum.first'), text: topic.steps?.[0], cls: 'bg-pop-mint text-ink' },
    { Icon: XCircle, label: t('detail.sum.warn'), text: topic.avoid?.[0], cls: 'bg-pop-butter text-ink' }].filter(x => x.text)
  return (<section aria-label={t('detail.sum.title')} className="grid sm:grid-cols-3 gap-3">
    {tiles.map(({ Icon, label, text, cls }) => <div key={label} className={`rounded-3xl border-2 border-ink/10 p-4 ${cls}`}>
      <div className="flex items-center gap-2 font-display font-bold mb-1"><Icon size={22} aria-hidden="true" />{label}</div><p className="text-sm leading-relaxed">{text}</p></div>)}
  </section>)
}
