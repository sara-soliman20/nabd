import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Phone, Send, Hand, Languages } from 'lucide-react'
import { streamNabd, transcribeNabd, checkHealth } from '../services/aiService.js'
import { retrieve } from '../utils/retrieve.js'
import { VadListener, canVad } from '../utils/vad.js'
import { Speaker, takeSentences } from '../utils/speaker.js'
import { norm } from '../utils/arabic.js'
import { useLang } from '../i18n/index.jsx'
import { getContent } from '../i18n/content.js'
import { searchTopics } from '../utils/localSearch.js'
import Mascot from './Mascot.jsx'
const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
const SILENCE_MS = 850 // (وضع المتصفح) سكوت بعد آخر كلمة = انتهت جملتك
// لهجات التعرف المدمج في المتصفح (وضع الاحتياط فقط): المتصفح لا يكتشف اللهجة تلقائياً فيحتاج اختياراً. الوضع الذكي لا يحتاج هذا.
const SR_LANGS = [['ar-EG', 'مصري'], ['ar-SA', 'سعودي'], ['ar-AE', 'إماراتي'], ['ar-KW', 'كويتي'], ['ar-QA', 'قطري'], ['ar-BH', 'بحريني'], ['ar-OM', 'عماني'], ['ar-YE', 'يمني'], ['ar-IQ', 'عراقي'],
  ['ar-JO', 'أردني'], ['ar-LB', 'لبناني'], ['ar-PS', 'فلسطيني'], ['ar-MA', 'مغربي'], ['ar-DZ', 'جزائري'], ['ar-TN', 'تونسي'], ['en-US', 'English'], ['fr-FR', 'Français']]
const savedSr = () => { try { const v = localStorage.getItem('nabd-sr-lang'); return SR_LANGS.some(x => x[0] === v) ? v : 'ar-EG' } catch { return 'ar-EG' } }

// رد محلي بسيط من مكتبة نبض لو الشات الذكي غير متاح.
const local = (q, lang, t) => {
  const x = lang === 'en' ? searchTopics(q, getContent('en').topics, 1)[0] : retrieve(q, 1)[0]
  return x ? t('voice.local', { title: x.title, steps: x.steps.slice(0, 3).map((st, i) => `${t('voice.step')} ${i + 1}: ${st}`).join('. ') }) : t('voice.local.none')
}

export default function VoiceChat() {
  const { t, lang } = useLang()
  const labels = { idle: t('voice.idle'), listening: t('voice.listening'), thinking: t('voice.thinking'), speaking: t('voice.speaking') }
  const GREETING = t('voice.greeting')
  const [status, setStatus] = useState('idle'), [live, setLive] = useState(''), [log, setLog] = useState([]), [err, setErr] = useState(''), [text, setText] = useState('')
  const [barge, setBarge] = useState(false), [geminiVoice, setGeminiVoice] = useState(false), [health, setHealth] = useState(null), [srLang, setSrLang] = useState(savedSr), [browserMode, setBrowserMode] = useState(false)
  const active = useRef(false), rec = useRef(null), heard = useRef(''), timer = useRef(null), hist = useRef([]), turn = useRef(0), ctrl = useRef(null), say = useRef(null), spoken = useRef(''), cfg = useRef({})
  const busy = useRef(false), vad = useRef(null), lvl = useRef(null), stat = useRef('idle'), talkStart = useRef(false), mode = useRef('smart')
  say.current ||= new Speaker()
  cfg.current = { barge, geminiVoice, srLang }
  const smart = health?.gemini === true && canVad()
  const canListen = health === null ? (canVad() || !!SR) : (smart || !!SR)

  // نقرأ حالة الخادم مرة: لو Gemini شغال نفعّل الصوت الطبيعي افتراضياً (ينطق بنفس لهجة الرد) والاستماع الذكي لأي لهجة.
  useEffect(() => { let on = true, n = 0, tm = null // السيرفر المجاني بينام: نعيد المحاولة لحد ما يصحى بدل ما نفضل في وضع الاحتياط
    const go = () => { if (!on) return; checkHealth().then(h => { if (!on) return; setHealth(h); if (h.gemini && h.tts !== false) setGeminiVoice(true); if (h.reason === 'server_down' && ++n < 10) tm = setTimeout(go, 4000) }) }
    go(); return () => { on = false; clearTimeout(tm) } }, [])
  useEffect(() => { say.current.mode = geminiVoice ? 'gemini' : 'browser' }, [geminiVoice])
  useEffect(() => { // صوت المتصفح الاحتياطي: لهجة التعرف المختارة لو بالوضع الاحتياطي، وإلا العربية المصرية للنص العربي
    say.current.lang = browserMode && srLang.startsWith('ar') ? srLang : 'ar-EG'; say.current.latin = srLang === 'fr-FR' && browserMode ? 'fr-FR' : 'en-US'
  }, [browserMode, srLang])
  useEffect(() => { vad.current?.setMuted(!barge && (status === 'speaking' || status === 'thinking')) }, [status, barge]) // بدون مقاطعة: نتجاهل المايك أثناء كلام نبض
  const setStat = s => { stat.current = s; setStatus(s); if (s !== 'listening' && lvl.current) lvl.current.style.transform = 'scale(1)' }
  const sync = () => setLog(hist.current.map(m => ({ ...m })))
  const push = m => { hist.current = [...hist.current, m]; sync() }

  // مقاطعة: نوقف الكلام والطلب الجاري فوراً، ونقصّ رد نبض إلى ما نُطق فعلاً.
  const interrupt = () => {
    turn.current++; ctrl.current?.abort(); say.current.cancel(); busy.current = false
    const last = hist.current[hist.current.length - 1]
    if (last?.role === 'model') { last.text = spoken.current.trim() ? spoken.current.trim() + '…' : ''; if (!last.text) hist.current = hist.current.slice(0, -1); sync() }
  }

  async function handle(q) {
    const me = ++turn.current; say.current.unlock(); say.current.cancel(); ctrl.current?.abort(); ctrl.current = new AbortController(); busy.current = true
    setErr(''); setLive(''); push({ role: 'user', text: q }); setStat('thinking'); spoken.current = ''
    say.current.onSentence = s => { spoken.current += s + ' ' }
    let buf = '', first = true, m = 'gemini'
    const reply = { role: 'model', text: '', mode: m }; hist.current = [...hist.current, reply]
    const feed = (chunk, final = false) => {
      if (me !== turn.current) return
      if (first && chunk) { first = false; setStat('speaking') }
      buf += chunk; reply.text += chunk; sync()
      const { sentences, rest } = takeSentences(buf, final); buf = rest; sentences.forEach(s => say.current.say(s))
    }
    try { await streamNabd(hist.current.filter(x => x.text).slice(-9), { voice: true, lang, signal: ctrl.current.signal, onChunk: c => feed(c) }); feed('', true) }
    catch (e) {
      if (e.name === 'AbortError' || me !== turn.current) return
      m = 'local'; reply.mode = m; reply.text = local(q, lang, t); sync(); setStat('speaking'); say.current.say(reply.text)
      if (e.code && e.code !== 'server_down' && e.code !== 'no_key') setErr(t('voice.err.gemini', { code: e.code }))
    }
    if (me !== turn.current) return
    await say.current.drain(); if (me !== turn.current) return
    busy.current = false
    setStat(active.current ? 'listening' : 'idle')
  }

  // ───── الوضع الذكي: المايك مفتوح طوال المحادثة، وكل جملة تُفرَّغ على الخادم (Gemini) فيفهم أي لهجة أو لغة، ويسمح بالمقاطعة ─────
  const isEcho = h => { const mine = norm(spoken.current), w = norm(h).split(' ').filter(x => x.length > 1); return w.length > 0 && w.every(x => mine.includes(x)) } // نتجاهل صدى صوت نبض نفسه
  async function onWav(wav) {
    // Guard against delayed VAD chunks from Nabd's own playback or a stale capture.
    if (!active.current) return
    const echoRisk = talkStart.current; talkStart.current = false
    if (echoRisk && !cfg.current.barge) return // التقاط بدأ أثناء كلام نبض: نتجاهله بدون ما نغيّر الحالة
    if (busy.current || say.current.busy) return
    const me = ++turn.current; busy.current = true; setStat('thinking')
    try {
      const q = (await transcribeNabd(wav)).trim()
      if (me !== turn.current || !active.current) return
      if (q.length < 2 || (echoRisk && isEcho(q))) { busy.current = false; setStat('listening'); return } // صمت/ضجيج/صدى
      setLive(''); handle(q)
    } catch (e) {
      if (me !== turn.current || !active.current) return
      busy.current = false; setStat('listening')
      if (SR && e.code !== 'blocked') toBrowserMode(); else setErr(e.code === 'quota' ? t('voice.err.quota') : t('voice.err.stt'))
    }
  }
  async function startSmart() {
    const v = new VadListener({
      silenceSec: 0.9,
      strict: () => busy.current || say.current.busy, // أثناء كلام نبض نطلب صوتاً أعلى وأطول لتجنب الصدى
      onLevel: l => { if (lvl.current && stat.current === 'listening') lvl.current.style.transform = `scale(${1 + Math.min(1, l) * 0.4})` },
      onStart: () => {
        const talking = busy.current || say.current.busy; talkStart.current = talking
        // While Nabd speaks, discard captured frames unless user explicitly enabled interruption.
        if (talking) { if (!cfg.current.barge) { vad.current?.setMuted(true); return } interrupt() }
        setStat('listening')
      },
      onUtterance: onWav,
    })
    vad.current = v
    try { await v.start() } catch (e) { vad.current = null; active.current = false; setStat('idle'); setErr(e?.name === 'NotAllowedError' || e?.name === 'SecurityError' ? t('voice.err.mic') : t('voice.err.stt')); return false }
    return true
  }
  function toBrowserMode() { // لو التفريغ على الخادم تعطل نكمل بالتعرف المدمج في المتصفح بدل ما تقف المحادثة
    vad.current?.stop(); vad.current = null; mode.current = 'browser'; setBrowserMode(true); setErr(t('voice.err.fallback')); startSR()
  }

  // ───── وضع المتصفح (احتياطي): جلسة تعرف مدمجة بلهجة يختارها المستخدم (Chrome/Edge) ─────
  const commit = () => { const q = heard.current.trim(); heard.current = ''; clearTimeout(timer.current); setLive(''); if (q.length > 1) { rec.current?.abort(); handle(q) } }
  function startSR() {
    if (!active.current || !SR) return
    const r = new SR(); rec.current = r; r.lang = cfg.current.srLang; r.continuous = true; r.interimResults = true; heard.current = ''
    r.onresult = e => {
      let tx = ''; for (const x of e.results) tx += x[0].transcript + ' '; tx = tx.trim(); if (!tx) return
      const talking = busy.current || say.current.busy
      if (talking) { if (!cfg.current.barge) { clearTimeout(timer.current); heard.current = ''; setLive(''); return } if (isEcho(tx)) return; interrupt(); setStat('listening') } // تجاهل صدى نبض إذا المقاطعة مقفولة
      heard.current = tx; setLive(tx); clearTimeout(timer.current)
      timer.current = setTimeout(commit, e.results[e.results.length - 1].isFinal ? 150 : SILENCE_MS)
    }
    r.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { active.current = false; setErr(t('voice.err.mic')) }
      else if (e.error === 'network') setErr(t('voice.err.net'))
    }
    r.onend = () => { if (rec.current === r && active.current) setTimeout(startSR, 150); else if (!active.current) setStat('idle') } // يعيد التشغيل تلقائياً (Chrome يوقفه بعد فترة)
    try { r.start() } catch { /* يعمل بالفعل */ }
  }
  const changeSr = v => { setSrLang(v); try { localStorage.setItem('nabd-sr-lang', v) } catch { /* */ } if (rec.current && active.current) { const r = rec.current; cfg.current.srLang = v; r.abort() } }

  async function start() {
    say.current.unlock(); setErr('')
    const h = health && health.reason !== 'server_down' ? health : await checkHealth(); setHealth(h)
    if (h.gemini && h.tts !== false && !cfg.current.geminiVoice) setGeminiVoice(true)
    const useSmart = h.gemini && canVad(); mode.current = useSmart ? 'smart' : 'browser'; setBrowserMode(!useSmart)
    if (!useSmart && !SR) return setErr(t('voice.nomic'))
    active.current = true; setStat('speaking'); spoken.current = GREETING + ' '; busy.current = true
    say.current.onSentence = () => {}; say.current.say(GREETING)
    if (useSmart) { if (!(await startSmart())) { busy.current = false; say.current.cancel(); return } } else startSR()
    say.current.drain().then(() => { busy.current = false; if (active.current && stat.current === 'speaking') setStat('listening') })
  }
  function stop() { active.current = false; turn.current++; busy.current = false; clearTimeout(timer.current); ctrl.current?.abort(); vad.current?.stop(); vad.current = null; rec.current?.abort(); say.current.cancel(); setStat('idle'); setLive('') }
  useEffect(() => () => { active.current = false; clearTimeout(timer.current); ctrl.current?.abort(); vad.current?.stop(); rec.current?.abort(); say.current.dispose() }, [])

  const on = status !== 'idle'
  return (<div className="max-w-xl mx-auto px-4 pt-4 space-y-4 text-center">
    <a href="tel:123" className="btn btn-block gap-2"><Phone size={22} aria-hidden="true" />{t('call.btn')}</a>
    <div className="card !bg-pop-sky/60 space-y-4 !py-6"><div className="relative mx-auto w-44 h-44 flex items-center justify-center">
      {on && status !== 'thinking' && <><span className="ring-wave" aria-hidden="true" /><span className="ring-wave d2" aria-hidden="true" /></>}
      <span ref={lvl} className="absolute w-36 h-36 rounded-full bg-brand/25 transition-transform duration-75" aria-hidden="true" />
      <button onClick={on ? stop : start} disabled={!canListen && !on} aria-label={on ? t('voice.end') : t('voice.start')}
        className={`relative w-36 h-36 rounded-full text-white flex items-center justify-center transition border-4 border-ink/10 ${on ? 'bg-ink !text-canvas shadow-[0_6px_0_rgb(0_0_0/.25)]' : 'bg-brand shadow-[0_6px_0_rgb(var(--brand-deep))]'} ${status === 'listening' ? 'scale-105' : ''} active:translate-y-1`}>{on ? <Square size={44} aria-hidden="true" /> : <Mic size={58} aria-hidden="true" />}</button></div>
      <p className="font-display font-extrabold text-xl" role="status" aria-live="polite">{labels[status]}</p>
      {status === 'speaking' && barge && (smart || SR) && <p className="text-sm text-muted inline-flex items-center gap-1"><Hand size={15} aria-hidden="true" />{t('voice.interrupt')}</p>}
      {live && <p className="text-muted" dir="auto">«{live}»</p>}
      {smart && !browserMode && <p className="text-sm text-muted inline-flex items-center gap-1.5 justify-center"><Languages size={15} aria-hidden="true" />{t('voice.smart')}</p>}
      {health && !canListen && <p className="rounded-2xl bg-pop-butter/70 border-2 border-line p-3 text-sm">{health.reason === 'server_down' ? t('voice.wake') : health.reason === 'offline_build' ? t('voice.offline') : t('voice.nomic')}</p>}
      {err && <p role="alert" className="rounded-2xl bg-pop-rose border-2 border-line p-3 text-sm">{err}</p>}
      {browserMode && SR && <label className="inline-flex items-center gap-2 text-sm text-muted"><Languages size={15} aria-hidden="true" />{t('voice.dialect')}
        <select value={srLang} onChange={e => changeSr(e.target.value)} className="input !py-1 !px-2 !w-auto" aria-label={t('voice.dialect')}>{SR_LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></label>}
      {on && <div className="flex gap-4 justify-center flex-wrap text-sm text-muted">
        {(smart || SR) && <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={barge} onChange={e => setBarge(e.target.checked)} />{t('voice.barge')}</label>}
        <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={geminiVoice} onChange={e => setGeminiVoice(e.target.checked)} />{t('voice.gemini')}</label></div>}</div>
    <div className="space-y-2.5" aria-live="polite">{log.slice(-6).map((m, i) => <div key={i} className={`flex items-end gap-2 ${m.role === 'user' ? 'row-me' : 'row-bot'}`}>{m.role !== 'user' && <Mascot size={32} animate={false} className="shrink-0 mb-1" />}<div className={`msg text-start ${m.role === 'user' ? 'msg-me' : 'msg-bot'}`} dir="auto">{m.text || '...'}
      {m.mode === 'local' && <p className="text-xs text-muted mt-1">{t('voice.local.note')}</p>}</div></div>)}</div>
    <form onSubmit={e => { e.preventDefault(); const q = text.trim(); if (q) { setText(''); say.current.unlock(); handle(q) } }} className="flex gap-2">
      <input value={text} onChange={e => setText(e.target.value)} placeholder={t('voice.type')} aria-label={t('voice.type')} className="input flex-1" dir="auto" />
      <button className="btn !px-4" aria-label={t('common.send')}><Send size={20} className="flip-rtl" aria-hidden="true" /></button></form>
    <p className="text-xs text-muted">{t('voice.footer')}</p></div>)
}
