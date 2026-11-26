import VideoEmbed from '../components/VideoEmbed.jsx'
import PageHead from '../components/PageHead.jsx'
import { PLAYLIST_ID, PLAYLIST_URL } from '../data/videos.js'
import { useLang } from '../i18n/index.jsx'
export default function Videos() {
  const { t } = useLang()
  return (<div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
    <PageHead emoji="🎬" tone="sky" title={t('vid.title')} text={t('vid.sub')} />
    <VideoEmbed src={`https://www.youtube-nocookie.com/embed/videoseries?list=${PLAYLIST_ID}`} title={t('vid.play')} />
    <a href={PLAYLIST_URL} target="_blank" rel="noreferrer" className="btn btn-block">{t('vid.open')}</a>
    <p className="text-sm text-muted">{t('vid.note')}</p><p className="text-sm text-muted">{t('vid.soon')}</p></div>)
}
