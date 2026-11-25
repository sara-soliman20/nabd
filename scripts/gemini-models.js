// تشخيص Gemini: node scripts/gemini-models.js   (أو: npm run gemini:models)
// يقرأ المفتاح من .env، ويعرض النماذج المتاحة لمفتاحك، ويجرّب كل نموذج بطلب صغير، ويقترح سطر GEMINI_MODEL الصحيح.
import 'dotenv/config'
const key = (process.env.GEMINI_API_KEY || '').trim()
const BASE = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '')
if (!key) { console.log('✗ لا يوجد GEMINI_API_KEY في ملف .env (يجب أن يكون الملف باسم .env بجانب package.json)'); process.exit(1) }
console.log(`المفتاح: ${key.slice(0, 6)}…${key.slice(-3)} (${key.length} حرف)  |  GEMINI_MODEL الحالي: ${process.env.GEMINI_MODEL || '(غير مضبوط → gemini-2.5-flash)'}`)
const hdr = { 'Content-Type': 'application/json', 'x-goog-api-key': key }
let r
try { r = await fetch(`${BASE}/models?pageSize=200`, { headers: hdr, signal: AbortSignal.timeout(15000) }) }
catch (e) { console.log('✗ تعذر الاتصال بـ Google (إنترنت/Firewall/VPN):', e.cause?.code || e.message); process.exit(1) }
const txt = await r.text()
if (!r.ok) { console.log(`✗ رفض Google المفتاح (HTTP ${r.status}):\n${txt.slice(0, 500)}`); process.exit(1) }
const all = (JSON.parse(txt).models || []).filter(m => m.supportedGenerationMethods?.includes('generateContent')).map(m => m.name.replace('models/', ''))
const text = all.filter(n => /^gemini/.test(n) && !/image|tts|live|audio|embed|robotics|computer|native/.test(n))
console.log(`\nنماذج التوليد المتاحة (${all.length}). النصية منها:\n  ` + text.join('\n  '))
let first = null
console.log('\nتجربة النماذج النصية (أول 6):')
for (const m of text.slice(0, 6)) {
  const t = Date.now()
  try {
    const x = await fetch(`${BASE}/models/${m}:generateContent`, { method: 'POST', headers: hdr, signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'قل: تمام' }] }], generationConfig: { maxOutputTokens: 40 } }) })
    const j = await x.json().catch(() => ({}))
    if (x.ok) { console.log(`  ✓ ${m}  (${Date.now() - t}ms)  → ${(j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim().slice(0, 40) || '(رد فارغ)'}`); first ||= m }
    else console.log(`  ✗ ${m}  HTTP ${x.status}: ${(j.error?.message || '').slice(0, 140)}`)
  } catch (e) { console.log(`  ✗ ${m}  ${e.message}`) }
}
console.log(first ? `\n✓ ضع في ملف .env:\nGEMINI_MODEL=${first}` : '\n✗ لا يوجد نموذج نجح. غالباً: الحصة المجانية انتهت، أو المنطقة غير مدعومة، أو المفتاح مقيّد. انسخ الرسائل أعلاه وابعتها.')
