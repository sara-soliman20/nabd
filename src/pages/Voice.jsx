import PageHead from '../components/PageHead.jsx'
import { useLang } from '../i18n/index.jsx'
export default function Voice() {
  const { t } = useLang()
  return (<div className="max-w-xl mx-auto px-4 pt-4 space-y-4">
    <PageHead emoji="🎙️" tone="sky" title={t('voice.title')} text={t('voice.sub')} />
    <div className="card p-6 text-center font-bold">{t('voice.soon')} 🚧</div></div>)
}
