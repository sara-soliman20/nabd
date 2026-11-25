import Mascot from './Mascot.jsx'
import { useLang } from '../i18n/index.jsx'
// الشعار: نبوض + اسم التطبيق بخط مدوّر.
export default function Logo({ size = 40, text = true, animate = false }) {
  const { t } = useLang()
  return (<span className="inline-flex items-center gap-2">
    <Mascot size={size} animate={animate} />
    {text && <span className="font-display font-extrabold text-accent leading-none" style={{ fontSize: size * 0.6 }}>{t('brand.name')}</span>}
  </span>)
}
