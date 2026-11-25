import { useEffect, useRef, useState } from 'react'
import { Send, Trash2, WifiOff } from 'lucide-react'
import ChatMessage from './ChatMessage.jsx'
import Mascot from './Mascot.jsx'
import { askNabd, imageNabd, checkHealth } from '../services/aiService.js'
import { offlineAnswer, teach } from '../utils/offline.js'
import { useLang } from '../i18n/index.jsx'
import { getContent } from '../i18n/content.js'

const load = () => { try { return JSON.parse(localStorage.getItem('nabd-chat') || '[]') } catch { return [] } }
const SUG = { ar: ['طفل بيتخنق وعمل إيه؟', 'اتحرقت بمية سخنة', 'ارسملي طريقة ضغطات القلب', 'نزيف من الأنف', 'لدغة عقرب', 'ايه أعراض السكر وازاي أتعامل معاه؟', 'شو سبب الصداع النصفي؟', 'اقترح لي خطة مذاكرة'], en: ['A child is choking, what do I do?', 'I burned myself with hot water', 'Draw me how CPR compressions work', 'Nosebleed', 'Scorpion sting', 'What are the symptoms of diabetes?', 'Suggest a study plan'] }

export default function ChatInterface() {
  const { t, lang } = useLang()
  const [health, setHealth] = useState(null), [msgs, setMsgs] = useState(load), [text, setText] = useState(''), [busy, setBusy] = useState(false), [live, setLive] = useState(''), [err, setErr] = useState(''), [imgBusy, setImgBusy] = useState(-1)
  const box = useRef(null)
  useEffect(() => { checkHealth().then(setHealth) }, [])
  useEffect(() => { try { localStorage.setItem('nabd-chat', JSON.stringify(msgs.slice(-20).map(({ image, ...m }) => m))) } catch { /* ممتلئ */ } }, [msgs])
  useEffect(() => {
    const el = box.current, kids = el?.querySelectorAll('[data-msg]'); if (!el || !kids?.length) return
    const last = kids[kids.length - 1]; el.scrollTo({ top: busy ? el.scrollHeight : Math.max(0, last.offsetTop - el.offsetTop - 4), behavior: 'smooth' })
  }, [msgs, busy])
  const online = health?.gemini === true

  const send = async v => {
    const q = (v ?? text).trim(); if (!q || busy) return
    const next = [...msgs, { role: 'user', text: q }]; setMsgs(next); setText(''); setErr(''); setBusy(true); setLive('')
    try {
      if (online) {
        try { const d = await askNabd(next, { lang }); setMsgs([...next, { role: 'model', ...d, text: d.answer }]); setBusy(false); return }
        catch (e) { if (e.code === 'bad_request' || e.code === 'blocked') throw e } // أي عطل آخر ← الوضع المحلي
      }
      const d = await offlineAnswer(next, lang, { onToken: s => setLive(s) })
      if (d.intent === 'about_bot') d.answer = t('chat.about')
      setMsgs([...next, { role: 'model', ...d, text: d.answer, question: q }])
    } catch (e) { setErr(t(`err.${e.code}`) !== `err.${e.code}` ? t(`err.${e.code}`) : t('err.error')) }
    setLive(''); setBusy(false)
  }
  const draw = async i => {
    setImgBusy(i); setErr('')
    try { const image = await imageNabd(`${msgs[i].sources?.[0]?.title || ''} ${msgs[i - 1]?.text || ''}`.trim()); setMsgs(ms => ms.map((m, j) => (j === i ? { ...m, image } : m))) }
    catch (e) { setErr(t(`img.${e.code}`) !== `img.${e.code}` ? t(`img.${e.code}`) : t('img.error')) }
    setImgBusy(-1)
  }
  const learn = async (m, id) => { await teach(m.question, id); await send(m.question) }
  const titleOf = id => getContent(lang).byId[id]?.title

  return (<div className="card space-y-3 !p-3 sm:!p-4">
    {health && !online && <p role="status" className="rounded-2xl bg-pop-butter/70 border-2 border-line p-2.5 text-sm flex gap-2 items-start"><WifiOff size={18} className="shrink-0 mt-0.5" aria-hidden="true" />{t('chat.offline.banner')}</p>}
    <div ref={box} className="chat-box space-y-3" aria-live="polite">
      {!msgs.length && <div className="text-center space-y-3 py-2"><Mascot size={96} mood="wave" className="mx-auto" /><p className="font-display font-bold text-lg">{t('chat.empty')}</p>
        <div className="flex gap-2 flex-wrap justify-center">{SUG[lang].map(s => <button key={s} onClick={() => send(s)} className="chip chip-wrap">{s}</button>)}</div></div>}
      {msgs.map((m, i) => (<div key={i} className="space-y-2"><ChatMessage m={m} imgBusy={imgBusy === i} onImage={() => draw(i)} />
        {i === msgs.length - 1 && m.suggestions?.length > 0 && m.question && <div className="flex gap-2 flex-wrap ps-10"><span className="text-sm text-muted w-full">{t('chat.didyoumean')}</span>
          {m.suggestions.map(s => <button key={s.id} disabled={busy} className="chip chip-wrap" onClick={() => learn(m, s.id)}>{titleOf(s.id) || s.title}</button>)}</div>}</div>))}
      {busy && <div className="flex gap-2 items-end row-bot"><Mascot size={34} animate={false} className="shrink-0 mb-1" /><div className="msg msg-bot whitespace-pre-wrap">{live || <span className="animate-pulse text-muted">{t('chat.typing')}</span>}</div></div>}
      {err && <div role="alert" className="rounded-2xl bg-pop-rose border-2 border-line p-3 text-sm space-y-1"><p>{err}</p><p>{t('chat.danger')}</p></div>}
    </div>
    <form onSubmit={e => { e.preventDefault(); send() }} className="flex gap-2">
      <input value={text} maxLength={1000} dir="auto" onChange={e => setText(e.target.value)} placeholder={t('chat.placeholder')} aria-label={t('chat.placeholder')} className="input flex-1" />
      <button className="btn !px-4" disabled={busy || !text.trim()} aria-label={t('common.send')}><Send size={20} className="flip-rtl" aria-hidden="true" /></button></form>
    <div className="flex items-center justify-between gap-2 text-sm"><p className="text-muted">{t('chat.danger')} <a href="tel:123" className="font-bold underline text-accent">123</a></p>
      {msgs.length > 0 && !busy && <button onClick={() => { setMsgs([]); setErr('') }} className="inline-flex items-center gap-1 text-muted underline shrink-0"><Trash2 size={14} aria-hidden="true" />{t('chat.new')}</button>}</div>
  </div>)
}
