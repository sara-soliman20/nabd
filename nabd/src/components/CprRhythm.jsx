import { useEffect, useRef, useState } from 'react'
import { useLang } from '../i18n/index.jsx'
const BPM = 110
export default function CprRhythm() {
  const { t } = useLang()
  const [on, setOn] = useState(false); const [beat, setBeat] = useState(0); const [count, setCount] = useState(0)
  const ctx = useRef(null)
  useEffect(() => {
    if (!on) return
    const play = () => {
      try {
        if (!ctx.current) ctx.current = new (window.AudioContext || window.webkitAudioContext)()
        const c = ctx.current; if (c.state === 'suspended') c.resume()
        const o = c.createOscillator(), g = c.createGain(); o.frequency.value = 880
        g.gain.setValueAtTime(0.25, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.09)
        o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.1)
      } catch { /* الصوت غير متاح، تبقى الإشارة المرئية */ }
      if (navigator.vibrate) navigator.vibrate(30)
    }
    const tick = () => { play(); setBeat(b => b + 1); setCount(n => n + 1) }
    tick(); const id = setInterval(tick, 60000 / BPM); return () => clearInterval(id)
  }, [on])
  useEffect(() => () => { if (ctx.current && ctx.current.close) ctx.current.close() }, [])
  const toggle = () => { if (!on) setCount(0); setOn(!on) }
  return (<section className="card text-center space-y-3 !bg-pop-rose/60">
    <h2 className="font-display font-extrabold text-xl">{t('cpr.title')}</h2>
    <p className="text-sm text-muted">{t('cpr.text', { bpm: BPM })}</p>
    <div key={beat} className={`text-7xl select-none ${on ? 'animate-beat' : ''}`} aria-hidden="true">🫀</div>
    <div className="font-display font-extrabold text-3xl" aria-live="off">{on ? ((count - 1) % 30) + 1 : '—'} <span className="text-base text-muted font-bold">/ 30</span></div>
    <button className="btn btn-block sm:w-auto sm:min-w-[12rem]" onClick={toggle}>{on ? t('cpr.stop') : t('cpr.start')}</button>
  </section>)
}
