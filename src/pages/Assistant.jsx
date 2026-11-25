import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Phone, ChevronLeft, RotateCcw } from 'lucide-react'
import ChatInterface from '../components/ChatInterface.jsx'
import PageHead from '../components/PageHead.jsx'
import Mascot from '../components/Mascot.jsx'
import { TONE, BADGE } from '../components/tones.js'
import { useContent, CAT_TONE } from '../i18n/content.js'
import { useLang } from '../i18n/index.jsx'
import { describeSearch } from '../utils/offline.js'

const EXAMPLES = { ar: ['طفل بيتخنق', 'حد وقع ومش بيتنفس', 'اتحرقت بمية سخنة', 'عقرب لدغني', 'نزيف من الأنف', 'مريض سكر بيرتعش'], en: ['child choking', 'collapsed and not breathing', 'burned with hot water', 'scorpion sting', 'nosebleed', 'diabetic shaking'] }

function TopicResult({ x }) {
  const { t } = useLang(); const { severity } = useContent()
  return (<div className="card space-y-2"><div className="flex items-center gap-3"><span className={`tile w-12 h-12 text-2xl ${TONE[CAT_TONE[x.catId]].bg}`} aria-hidden="true">{x.icon}</span>
    <div className="min-w-0 flex-1"><span className={`badge ${BADGE[x.severity]}`}>{severity[x.severity]}</span><h3 className="font-display font-bold text-lg leading-snug">{x.title}</h3></div></div>
    <p className="text-sm text-muted">{x.summary}</p>
    <ol className="space-y-1 text-sm">{x.steps.slice(0, 3).map((s, i) => <li key={i} className="flex gap-2"><b className="text-accent">{i + 1}.</b><span>{s}</span></li>)}</ol>
    <Link to={`/library/${x.id}`} className="btn btn-sm">{t('assist.allsteps')}</Link></div>)
}

function Wizard() {
  const { t } = useLang(); const { nodes, byId } = useContent()
  const [path, setPath] = useState(['start']); const [result, setResult] = useState(null)
  const node = nodes[path[path.length - 1]]
  const pick = o => (o.result ? setResult(o.result) : setPath([...path, o.next]))
  const back = () => { if (result) setResult(null); else if (path.length > 1) setPath(path.slice(0, -1)) }
  const reset = () => { setPath(['start']); setResult(null) }
  if (result) return (<div className="space-y-3 pop-in">
    <div className={`card space-y-3 ${result.call ? '!bg-brand !border-brand-deep !text-white' : '!bg-pop-mint/70'}`}>
      <div className="flex items-center gap-3"><Mascot size={56} mood={result.call ? 'worry' : 'happy'} animate={false} /><h2 className="font-display font-extrabold text-xl leading-snug">{result.title}</h2></div><p>{result.text}</p>
      {result.call && <a href="tel:123" className="btn btn-white btn-block pulse-call"><Phone size={20} aria-hidden="true" />{t('call.btn')}</a>}</div>
    <div className="grid gap-3">{result.topics.map(id => <TopicResult key={id} x={byId[id]} />)}</div>
    <div className="flex gap-3"><button className="btn btn-line flex-1" onClick={back}>{t('common.back')}</button><button className="btn flex-1" onClick={reset}><RotateCcw size={18} aria-hidden="true" />{t('assist.again')}</button></div></div>)
  return (<div className="card space-y-4"><div className="flex items-center gap-1.5" aria-label={t('assist.step', { n: path.length })}>{path.map((_, i) => <span key={i} className="h-2.5 flex-1 rounded-full bg-brand" />)}<span className="h-2.5 flex-1 rounded-full bg-soft border border-line" /></div>
    <div className="flex items-start gap-3"><Mascot size={56} animate={false} /><div><h2 className="font-display font-extrabold text-xl leading-snug">{node.q}</h2>{node.hint && <p className="text-sm text-muted mt-1">{node.hint}</p>}</div></div>
    <div className="grid gap-2.5">{node.options.map(o => <button key={o.label} onClick={() => pick(o)} className="btn btn-line btn-block !justify-start !text-start !font-sans !font-semibold !text-base">{o.label}</button>)}</div>
    {path.length > 1 && <button className="inline-flex items-center gap-1 font-display font-bold text-accent" onClick={back}><ChevronLeft size={18} className="flip-rtl" aria-hidden="true" />{t('common.back')}</button>}</div>)
}

function Describe() {
  const { t, lang } = useLang()
  const [q, setQ] = useState(''), [res, setRes] = useState(null), [busy, setBusy] = useState(false)
  const go = async text => { const v = text ?? q; setQ(v); if (!v.trim()) return setRes([]); setBusy(true); try { setRes(await describeSearch(v, lang)) } catch { setRes([]) } setBusy(false) }
  return (<div className="space-y-4"><form onSubmit={e => { e.preventDefault(); go() }} className="flex gap-2" role="search">
    <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('assist.describe.ph')} aria-label={t('assist.describe.ph')} className="input flex-1" />
    <button className="btn !px-4" type="submit" aria-label={t('common.search')} disabled={busy}><Search size={20} aria-hidden="true" /></button></form>
    <div className="flex gap-2 flex-wrap">{EXAMPLES[lang].map(e => <button key={e} onClick={() => go(e)} className="chip">{e}</button>)}</div>
    {res && (res.length ? <div className="grid gap-3">{res.map(x => <TopicResult key={x.id} x={x} />)}</div>
      : <div className="card text-center space-y-2"><div className="text-4xl" aria-hidden="true">🤔</div><p>{t('assist.none')}</p><p className="font-display font-bold text-accent">{t('assist.none.call')}</p></div>)}</div>)
}

export default function Assistant() {
  const { t } = useLang(); const [params, setParams] = useSearchParams()
  const tab = ['wizard', 'describe', 'chat'].includes(params.get('tab')) ? params.get('tab') : 'wizard'
  const tabs = [['wizard', t('assist.tab.wizard')], ['describe', t('assist.tab.describe')], ['chat', t('assist.tab.chat')]]
  return (<div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
    <PageHead emoji="💬" tone="lav" title={t('assist.title')} text={t('assist.sub')} />
    <div role="tablist" className="seg">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setParams({ tab: k }, { replace: true })}>{l}</button>)}</div>
    {tab === 'wizard' ? <Wizard /> : tab === 'describe' ? <Describe /> : <ChatInterface />}
  </div>)
}
