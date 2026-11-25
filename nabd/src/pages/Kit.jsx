import { useEffect, useState } from 'react'
import PageHead from '../components/PageHead.jsx'
import { useContent } from '../i18n/content.js'
import { useLang } from '../i18n/index.jsx'
const KEY = 'nabd-kit2' // المفتاح = رقم المجموعة-رقم العنصر، فلا يتأثر التقدم بتغيير اللغة
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } }
export default function Kit() {
  const { t } = useLang(); const { kit } = useContent()
  const [done, setDone] = useState(load)
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(done)) } catch { /* التخزين غير متاح */ } }, [done])
  const total = kit.reduce((a, g) => a + g.items.length, 0), n = Object.values(done).filter(Boolean).length, pct = Math.round(n / total * 100)
  const toggle = k => setDone(d => ({ ...d, [k]: !d[k] }))
  return (<div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
    <PageHead emoji="🧰" tone="mint" title={t('kit.title')} text={t('kit.sub')} />
    <div className="card space-y-2 sticky top-[4.4rem] z-10"><div className="flex justify-between font-display font-bold"><span>{t('kit.progress', { n, total })}</span><span className="text-accent">{pct}%{pct === 100 ? ' 🎉' : ''}</span></div><div className="bar"><i style={{ width: `${pct}%` }} /></div></div>
    {kit.map((g, gi) => (<section key={gi} className="card space-y-2"><h2 className="font-display font-extrabold text-xl">{g.title}</h2>
      <ul className="space-y-1.5">{g.items.map((it, ii) => { const k = `${gi}-${ii}`, on = !!done[k]
        return <li key={k}><label className={`flex items-start gap-3 cursor-pointer rounded-2xl p-2.5 border-2 transition ${on ? 'bg-pop-mint/70 border-ok/40' : 'border-transparent hover:bg-soft'}`}>
          <input type="checkbox" checked={on} onChange={() => toggle(k)} className="mt-1 h-5 w-5 shrink-0 accent-[rgb(214,51,90)]" /><span className={on ? 'line-through opacity-60' : ''}>{it}</span></label></li> })}</ul></section>))}
    <p className="rounded-2xl bg-pop-butter/70 border-2 border-line p-3.5 text-sm">{t('kit.note')}</p>
    <button className="btn btn-line btn-sm" onClick={() => setDone({})}>{t('kit.clear')}</button></div>)
}
