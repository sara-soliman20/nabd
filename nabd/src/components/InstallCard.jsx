import { useEffect, useState } from 'react'
import { Share2, Download, Check } from 'lucide-react'
import { useLang } from '../i18n/index.jsx'
import { isNative, isStandalone, isIOS, shareUrl } from '../utils/platform.js'

// «شارك مع أصدقائك» + «ثبّت التطبيق» (PWA). يُخفى التثبيت لو التطبيق مثبّت أصلاً.
export default function InstallCard() {
  const { t } = useLang()
  const [evt, setEvt] = useState(null), [done, setDone] = useState(isStandalone() || isNative), [copied, setCopied] = useState(false)
  useEffect(() => {
    const on = e => { e.preventDefault(); setEvt(e) }, ins = () => { setDone(true); setEvt(null) }
    window.addEventListener('beforeinstallprompt', on); window.addEventListener('appinstalled', ins)
    return () => { window.removeEventListener('beforeinstallprompt', on); window.removeEventListener('appinstalled', ins) }
  }, [])
  const url = shareUrl()
  const share = async () => {
    const data = { title: t('brand.name'), text: t('share.text'), ...(url ? { url } : {}) }
    try { if (navigator.share) { await navigator.share(data); return } } catch (e) { if (e?.name === 'AbortError') return }
    try { await navigator.clipboard.writeText(`${data.text} ${url}`.trim()); setCopied(true); setTimeout(() => setCopied(false), 2200) } catch { /* لا حافظة */ }
  }
  const install = async () => { if (!evt) return; evt.prompt(); try { await evt.userChoice } catch { /* أُلغي */ } setEvt(null) }
  return (<div className="space-y-2">
    <button onClick={share} className="btn btn-soft btn-block">{copied ? <Check size={20} aria-hidden="true" /> : <Share2 size={20} aria-hidden="true" />}{copied ? t('share.copied') : t('share.btn')}</button>
    {!done && evt && <button onClick={install} className="btn btn-block"><Download size={20} aria-hidden="true" />{t('install.btn')}</button>}
    {!done && !evt && isIOS() && <p className="text-sm text-muted text-center">{t('install.ios')}</p>}
  </div>)
}
