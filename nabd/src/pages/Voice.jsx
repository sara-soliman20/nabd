import VoiceChat from '../components/VoiceChat.jsx'
import PageHead from '../components/PageHead.jsx'
import { useLang } from '../i18n/index.jsx'
export default function Voice() {
  const { t } = useLang()
  return <div><div className="max-w-xl mx-auto px-4 pt-4"><PageHead emoji="🎙️" tone="sky" title={t('voice.title')} text={t('voice.sub')} /></div><VoiceChat /></div>
}
