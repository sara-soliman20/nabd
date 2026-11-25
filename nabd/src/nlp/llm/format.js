// تنسيق "الجواب" الذي يتعلّم النموذج توليده، وصيغة الـ Prompt. يُستخدم في بناء بيانات التدريب وفي التوليد وفي فحص الأمانة.
import { severityLabel } from '../../data/topics.js'
export const MAX_STEPS = 6
/** نص الجواب القياسي لحالة: الخطورة + الخطوات + ما يُتجنب. */
export function answerText(t) {
  return [`الخطورة: ${severityLabel[t.severity]}${t.severity === 'critical' ? ' - اتصل بالإسعاف 123 الآن' : ''}`,
    ...t.steps.slice(0, MAX_STEPS).map((s, i) => `${i + 1}) ${s}`),
    ...(t.avoid?.length ? [`تجنب: ${t.avoid.slice(0, 2).join('؛ ')}`] : [])].join('\n')
}
/** صيغ متعددة لسؤال عن الحالة (تدريب النموذج على اختلاف طريقة السؤال). */
export function questionVariants(t) {
  const ks = [...t.keywords, t.title], out = new Set([t.title, t.summary, ...t.signs])
  for (const k of ks) { out.add(k); out.add(`حد ${k}`); out.add(`اعمل ايه لو ${k}`); out.add(`ازاي اتصرف مع ${k}`); out.add(`عايز اسعاف اولي ل ${k}`) }
  return [...out]
}
