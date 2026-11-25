import { useState } from 'react'
import { Link } from 'react-router-dom'
import Mascot from '../components/Mascot.jsx'
import PageHead from '../components/PageHead.jsx'
import { useContent } from '../i18n/content.js'
import { useLang } from '../i18n/index.jsx'
const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
// نخزّن أرقام الأسئلة وترتيب الخيارات فقط، فيتغير النص فوراً لو بدّل المستخدم اللغة أثناء الاختبار.
const build = (bank, n) => shuffle(bank.map((_, i) => i)).slice(0, n).map(idx => ({ idx, order: shuffle(bank[idx].options.map((_, i) => i)) }))
const LETTERS = ['A', 'B', 'C', 'D', 'E']

export default function Quiz() {
  const { t } = useLang(); const { quiz: bank } = useContent()
  const [qs, setQs] = useState(null), [i, setI] = useState(0), [sel, setSel] = useState(null), [score, setScore] = useState(0), [wrong, setWrong] = useState([])
  const start = n => { setQs(build(bank, n)); setI(0); setSel(null); setScore(0); setWrong([]) }
  if (!qs) return (<div className="max-w-xl mx-auto px-4 pt-4 space-y-5 text-center">
    <Mascot size={130} mood="cheer" className="mx-auto" /><PageHead emoji="🏆" tone="butter" title={t('quiz.title')} text={t('quiz.sub')} />
    <div className="grid grid-cols-3 gap-3">{[5, 10, 20].map(n => <button key={n} className="btn !flex-col !gap-0 !py-3" onClick={() => start(n)}><span className="text-3xl font-extrabold">{n}</span><span className="text-sm font-semibold">{t('quiz.questions')}</span></button>)}</div>
    <p className="text-sm text-muted">{t('quiz.bank', { n: bank.length })}</p></div>)
  if (i >= qs.length) { const pct = Math.round(score / qs.length * 100), stars = pct >= 80 ? 3 : pct >= 50 ? 2 : 1
    return (<div className="max-w-xl mx-auto px-4 pt-4 space-y-4"><div className="card text-center space-y-2 pop-in"><Mascot size={120} mood={pct >= 50 ? 'cheer' : 'worry'} className="mx-auto" />
      <div className="text-4xl" aria-label={`${stars}/3`}>{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
      <h1 className="font-display font-extrabold text-3xl">{t('quiz.score', { s: score, n: qs.length })}</h1>
      <p className="text-lg">{pct >= 80 ? t('quiz.great') : pct >= 50 ? t('quiz.good') : t('quiz.retry')}</p></div>
      {wrong.length > 0 && <div className="card space-y-3"><h2 className="font-display font-extrabold text-lg">{t('quiz.review')}</h2>{wrong.map(w => { const q = bank[w]; return (<div key={w} className="border-b-2 border-line pb-3 last:border-0 last:pb-0"><p className="font-bold">{q.q}</p><p className="text-sm text-muted">{q.explain}</p><Link className="text-accent font-bold text-sm" to={`/library/${q.topic}`}>{t('quiz.read')}</Link></div>) })}</div>}
      <div className="flex gap-3"><button className="btn flex-1" onClick={() => start(qs.length)}>{t('quiz.again')}</button><button className="btn btn-line flex-1" onClick={() => setQs(null)}>{t('quiz.change')}</button></div></div>) }
  const cur = qs[i], q = bank[cur.idx], opts = cur.order.map(oi => ({ t: q.options[oi], ok: oi === q.answer }))
  const choose = o => { if (sel) return; setSel(o); if (o.ok) setScore(s => s + 1); else setWrong(w => [...w, cur.idx]) }
  return (<div className="max-w-xl mx-auto px-4 pt-4 space-y-4">
    <div className="flex justify-between text-sm font-bold text-muted"><span>{t('quiz.qof', { i: i + 1, n: qs.length })}</span><span>⭐ {score}</span></div>
    <div className="bar"><i style={{ width: `${(i / qs.length) * 100}%` }} /></div>
    <div className="card space-y-4"><h2 className="font-display font-extrabold text-xl leading-snug">{q.q}</h2>
      <div className="grid gap-2.5">{opts.map((o, k) => { const show = !!sel
        const cls = !show ? 'btn-line' : o.ok ? '!bg-pop-mint !border-ok !text-ink' : sel === o ? '!bg-pop-rose !border-brand !text-ink' : 'btn-line opacity-60'
        return <button key={o.t} disabled={show} onClick={() => choose(o)} className={`btn btn-block !justify-start !text-start !font-sans !font-semibold !text-base disabled:!opacity-100 ${cls}`} style={show && !o.ok && sel !== o ? { opacity: .55 } : undefined}>
          <span className="shrink-0 w-8 h-8 rounded-full grid place-items-center bg-soft text-accent font-display font-extrabold">{show && o.ok ? '✓' : show && sel === o ? '✕' : LETTERS[k]}</span><span>{o.t}</span></button> })}</div>
      {sel && <div className="rounded-2xl bg-soft border-2 border-line p-4 space-y-2 pop-in"><div className="flex items-center gap-2"><Mascot size={44} mood={sel.ok ? 'cheer' : 'worry'} animate={false} /><p className="font-display font-extrabold text-lg">{sel.ok ? t('quiz.right') : t('quiz.wrong')}</p></div><p className="text-sm">{q.explain}</p>
        <button className="btn btn-block" onClick={() => { setI(i + 1); setSel(null) }}>{i + 1 === qs.length ? t('quiz.result') : t('quiz.next')}</button></div>}</div></div>)
}
