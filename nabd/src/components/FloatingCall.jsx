import { Phone } from 'lucide-react'
import { useLang } from '../i18n/index.jsx'
export default function FloatingCall() {
  const { t } = useLang()
  return <a href="tel:123" aria-label={t('call.aria')} className="btn hidden lg:inline-flex fixed z-30 bottom-6 !rounded-full" style={{ insetInlineEnd: 24 }}><Phone size={20} aria-hidden="true" />123</a>
}
