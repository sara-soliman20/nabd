import MedicalDisclaimer from './MedicalDisclaimer.jsx'
import Logo from './Logo.jsx'
import { useLang } from '../i18n/index.jsx'
export default function Footer() {
  const { t } = useLang()
 eturn (<footer className="max-w-6xl mx-auto px-4 mt-10 pb-32 lg:pb-6 space-y-3 no-print">
    <MedicalDisclaimer />
    <div className="flex items-center justify-center gap-2 text-sm text-muted pb-2"><Logo size={26} text={false} /><span>{t('footer.line', { year: new Date().getFullYear() })}</span></div>
  </footer>)
}
