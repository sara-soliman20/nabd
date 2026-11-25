// رسومات توضيحية أصلية من نبض (SVG). مبسّطة للتوضيح فقط؛ الخطوات المكتوبة هي المرجع.
import { useLang } from '../i18n/index.jsx'
const S = 'stroke-brand'
const T = props => <text textAnchor="middle" className="fill-ink" fontSize="12" fontWeight="600" fontFamily="Cairo, sans-serif" {...props} />
const L = {
  ar: { cpr: 'وضع اليدين في منتصف الصدر والضغط 5 إلى 6 سم', depth: 'عمق 5–6 سم', rate: '100–120 ضغطة/دقيقة', heel: 'كعب اليد في منتصف الصدر',
    choke: '5 ضربات على الظهر ثم 5 ضغطات على البطن', c1: '1) 5 ضربات بين لوحي الكتف', c1b: '', c2: '2) 5 ضغطات للداخل ولأعلى', c2b: 'فوق السرّة وتحت عظمة الصدر',
    rec: 'وضع الإفاقة: المصاب على جنبه، الركبة العليا مثنية، الرأس مائل للخلف قليلاً', head: 'الرأس مائل قليلاً', knee: 'الركبة العليا مثنية', hand: 'اليد تحت الخد', cap: 'رسم توضيحي مبسّط من نبض. اتبع الخطوات المكتوبة.' },
  en: { cpr: 'Hands on the centre of the chest, pressing 5 to 6 cm', depth: 'Depth 5–6 cm', rate: '100–120 per minute', heel: 'Heel of hand on centre of chest',
    choke: '5 back blows then 5 abdominal thrusts', c1: '1) 5 back blows', c1b: 'between the shoulder blades', c2: '2) 5 abdominal thrusts', c2b: 'above belly button, below ribs',
    rec: 'Recovery position: on their side, upper knee bent, head tilted back slightly', head: 'Head tilted slightly', knee: 'Upper knee bent', hand: 'Hand under cheek', cap: 'A simple Nabd illustration. Follow the written steps.' },
}
function Cpr({ l }) {
  return (<svg viewBox="0 0 320 170" role="img" aria-label={l.cpr}>
    <line x1="10" y1="142" x2="310" y2="142" className="stroke-muted" strokeWidth="2" opacity=".4" />
    <circle cx="50" cy="126" r="14" className="fill-soft stroke-brand" strokeWidth="2.5" />
    <rect x="64" y="114" width="200" height="26" rx="13" className="fill-soft stroke-brand" strokeWidth="2.5" />
    <circle cx="130" cy="114" r="5" className="fill-brand" />
    <line x1="130" y1="108" x2="130" y2="52" className={S} strokeWidth="9" strokeLinecap="round" />
    <line x1="130" y1="52" x2="215" y2="76" className={S} strokeWidth="16" strokeLinecap="round" opacity=".55" />
    <circle cx="118" cy="30" r="13" className="fill-soft stroke-brand" strokeWidth="2.5" />
    <path d="M175 70 V108 M169 100 l6 8 l6 -8" fill="none" className="stroke-ok" strokeWidth="3" strokeLinecap="round" />
    <T x="228" y="96">{l.depth}</T><T x="236" y="30">{l.rate}</T><T x="130" y="162">{l.heel}</T></svg>)
}
function Choking({ l }) {
  return (<svg viewBox="0 0 360 170" role="img" aria-label={l.choke}>
    <circle cx="70" cy="40" r="14" className="fill-soft stroke-brand" strokeWidth="2.5" />
    <line x1="72" y1="54" x2="105" y2="105" className="stroke-brand" strokeWidth="22" strokeLinecap="round" opacity=".35" />
    <circle cx="86" cy="78" r="8" className="fill-brand" /><path d="M64 62 l8 12 M58 70 l8 12" className="stroke-ok" strokeWidth="3" strokeLinecap="round" fill="none" />
    <T x="90" y="140">{l.c1}</T>{l.c1b && <T x="90" y="158">{l.c1b}</T>}
    <circle cx="275" cy="38" r="14" className="fill-soft stroke-brand" strokeWidth="2.5" />
    <rect x="258" y="54" width="34" height="62" rx="14" className="fill-soft stroke-brand" strokeWidth="2.5" />
    <circle cx="275" cy="98" r="8" className="fill-brand" /><path d="M275 124 V104 M269 110 l6 -8 l6 8" className="stroke-ok" strokeWidth="3" strokeLinecap="round" fill="none" />
    <T x="275" y="140">{l.c2}</T><T x="275" y="158">{l.c2b}</T></svg>)
}
function Recovery({ l }) {
  return (<svg viewBox="0 0 320 150" role="img" aria-label={l.rec}>
    <circle cx="52" cy="72" r="16" className="fill-soft stroke-brand" strokeWidth="2.5" />
    <rect x="66" y="56" width="170" height="34" rx="17" className="fill-soft stroke-brand" strokeWidth="2.5" />
    <path d="M45 92 q15 12 32 -4" fill="none" className={S} strokeWidth="5" strokeLinecap="round" />
    <path d="M200 90 L232 122 L252 100" fill="none" className={S} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="236" y1="68" x2="300" y2="68" className={S} strokeWidth="9" strokeLinecap="round" />
    <T x="62" y="38">{l.head}</T><T x="232" y="142">{l.knee}</T><T x="80" y="115">{l.hand}</T></svg>)
}
const map = { cpr: Cpr, choking: Choking, fainting: Recovery, seizure: Recovery }
export default function Illustration({ id }) {
  const { lang } = useLang(); const C = map[id]; if (!C) return null; const l = L[lang]
  return (<figure className="card"><div className="max-w-md mx-auto"><C l={l} /></div>
    <figcaption className="text-xs text-muted text-center mt-2">{l.cap}</figcaption></figure>)
}
export const hasIllustration = id => id in map
