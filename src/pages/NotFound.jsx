import { Link } from 'react-router-dom'
import Mascot from '../components/Mascot.jsx'
import { useLang } from '../i18n/index.jsx'
export default function NotFound() {
  const { t } = useLang()
  return (<div className="max-w-md mx-auto px-4 pt-10 text-center space-y-4"><Mascot size={130} mood="worry" className="mx-auto" /><h1 className="font-display font-extrabold text-2xl">{t('nf.title')}</h1><Link to="/" className="btn">{t('nf.home')}</Link></div>)
}
