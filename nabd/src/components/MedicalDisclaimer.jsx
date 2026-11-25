import { useLang } from '../i18n/index.jsx'
export default function MedicalDisclaimer() {
  const { t } = useLang()
  return <p className="rounded-2xl bg-pop-butter/70 border-2 border-line p-3.5 text-[.92rem] leading-relaxed">⚠️ {t('disclaimer')} <b>123</b></p>
}
