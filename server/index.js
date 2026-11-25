import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { retrieve } from '../src/utils/retrieve.js'
import { askAI, streamAI, checkAI, speakAI, transcribeAI, imageAI, geminiOn, anyAI } from './ai.js'
import { books } from '../src/data/books.js'
import { norm } from '../src/utils/arabic.js'

const app = express()
app.set('trust proxy', 1) // خلف Render/Railway يكون req.ip هو IP المستخدم الحقيقي

// CORS: يلزم لتطبيق الموبايل (Capacitor) لأنه يعمل من نطاق مختلف عن الخادم. اضبط CORS_ORIGIN لتقييده.
app.use('/api', (req, res, next) => {
  res.set({ 'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' })
  req.method === 'OPTIONS' ? res.sendStatus(204) : next()
})
const small = express.json({ limit: "40kb" }), big = express.json({ limit: '3mb' }) // /api/stt يستقبل تسجيلاً صوتياً
app.use((req, res, next) => (req.path === '/api/stt' ? big : small)(req, res, next))

// حدود الطلبات (في الذاكرة): 150/دقيقة لكل IP (المحادثة الصوتية تستهلك عدة طلبات في الدور الواحد)، والصور أغلى: 6/دقيقة.
const windowed = () => { const m = new Map(); return (k, max) => { const now = Date.now(), a = (m.get(k) || []).filter(t => now - t < 60000)
  if (a.length >= max) return false; a.push(now); m.set(k, a); if (m.size > 5000) for (const [x, v] of m) if (!v.some(t => now - t < 60000)) m.delete(x); return true } }
const allow = windowed(), allowImg = windowed()
app.use('/api', (req, res, next) => allow(req.ip, 150) ? next() : res.status(429).json({ error: 'rate_limited' }))

const IMG_RE = /(ارسم|رسمه توضيحيه|رسم توضيحي|صوره توضيحيه|وريني (صوره|رسم)|ولد (صوره|رسم)|draw|illustration)/i
const errStatus = e => (e.code === 'quota' ? 429 : 502)
const errBody = e => ({ error: e.code || 'upstream', detail: e.detail || e.message }) // detail يساعد على معرفة السبب الحقيقي
const need = res => !geminiOn() && (res.status(503).json({ error: 'no_key' }), true) // نطق/صور: Gemini فقط
const needAny = res => !anyAI() && (res.status(503).json({ error: 'no_key' }), true) // دردشة/تفريغ: أي مزوّد

app.get('/api/books', (_, res) => res.json(books))
app.post('/api/image', async (req, res) => {
  const prompt = String(req.body?.prompt || '').slice(0, 300).trim()
  if (!prompt) return res.status(400).json({ error: 'bad_request' }); if (need(res)) return
  if (!allowImg(req.ip, 6)) return res.status(429).json({ error: 'rate_limited' })
  try { const image = await imageAI(prompt); image ? res.json({ image }) : res.status(422).json({ error: 'no_image' }) }
  catch (e) { console.error(e.message); res.status(errStatus(e)).json(errBody(e)) }
})
app.post('/api/tts', async (req, res) => {
  const text = String(req.body?.text || '').slice(0, 700).trim()
  if (!text) return res.status(400).json({ error: 'bad_request' }); if (need(res)) return
  try { const wav = await speakAI(text); if (!wav) return res.status(502).json({ error: 'empty' }); res.type('audio/wav').send(wav) }
  catch (e) { console.error(e.message); res.status(errStatus(e)).json(errBody(e)) }
})
app.post('/api/stt', async (req, res) => {
  const audio = String(req.body?.audio || ''); if (!audio || audio.length > 2.5e6) return res.status(400).json({ error: 'bad_request' }); if (needAny(res)) return
  try { res.json({ text: (await transcribeAI(audio)).replace(/[«»"]/g, '').trim() }) }
  catch (e) { console.error(e.message); res.status(errStatus(e)).json(errBody(e)) }
})

let healthCache = { at: 0, body: null } // نتيجة الفحص تُحفظ دقيقة كي لا نستهلك الحصة عند كل فتح للصفحة
app.get('/api/health', async (_, res) => {
  if (!anyAI()) return res.json({ gemini: false, reason: 'no_key' })
  if (healthCache.body && Date.now() - healthCache.at < 60000) return res.json(healthCache.body)
  let body
  try { body = { gemini: true, ...(await checkAI()) } } catch (e) { console.error(e.message); body = { gemini: false, reason: e.code || 'upstream', detail: e.detail || e.message } }
  healthCache = { at: Date.now(), body }; res.json(body)
})

// الشات العام: Gemini يجيب عن أي موضوع. للأسئلة الإسعافية نرفق له حالات مكتبة نبض كمرجع اختياري (بحث كلمات بسيط).
// ملاحظة: شات الـ NLP/LLM الذي بنيناه يعمل بالكامل في المتصفح ولا يمر بهذا المسار.
app.post('/api/chat', async (req, res) => {
  const msgs = (Array.isArray(req.body?.messages) ? req.body.messages : []).slice(-10)
    .map(m => ({ role: m?.role === 'user' ? 'user' : 'model', text: String(m?.text || '').slice(0, 1500) })).filter(m => m.text)
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return res.status(400).json({ error: 'bad_request' })
  if (!anyAI()) return res.status(503).json({ error: 'no_key' })
  const lastUser = msgs[msgs.length - 1].text, found = retrieve(msgs.filter(m => m.role === 'user').slice(-2).map(m => m.text).join(' '), 2)
  try {
    const answer = await askAI(msgs, found, !!req.body?.voice, req.body?.lang === 'en' ? 'en' : 'ar')
    if (!answer) return res.status(502).json({ error: 'empty' })
    let image = null // رسم توضيحي لو طُلب صراحةً (لا يُولَّد في الوضع الصوتي)
    if (!req.body?.voice && (req.body?.image || IMG_RE.test(norm(lastUser))) && allowImg(req.ip, 6)) {
      try { image = await imageAI(`${found[0]?.title || ''} ${lastUser}`.trim()) } catch (e) { console.error('image:', e.message) }
    }
    res.json({ answer, mode: 'gemini', image, emergency: found.some(t => t.severity === 'critical'), sources: found.map(t => ({ id: t.id, title: t.title })) })
  } catch (e) { console.error(e.message); res.status(errStatus(e)).json(errBody(e)) }
})

// رد متدفق (SSE) للمحادثة الصوتية: يبدأ النطق قبل اكتمال الرد.
app.post('/api/chat-stream', async (req, res) => {
  const msgs = (Array.isArray(req.body?.messages) ? req.body.messages : []).slice(-10)
    .map(m => ({ role: m?.role === 'user' ? 'user' : 'model', text: String(m?.text || '').slice(0, 1500) })).filter(m => m.text)
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return res.status(400).json({ error: 'bad_request' })
  if (!anyAI()) return res.status(503).json({ error: 'no_key' })
  const found = retrieve(msgs.filter(m => m.role === 'user').slice(-2).map(m => m.text).join(' '), 2)
  const ac = new AbortController(); res.on('close', () => ac.abort()) // المستخدم قاطع أو أغلق: نلغي الطلب لـ Gemini
  res.set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' }); res.flushHeaders?.()
  const send = o => !res.writableEnded && res.write(`data: ${JSON.stringify(o)}\n\n`)
  try { await streamAI(msgs, found, !!req.body?.voice, t => send({ t }), ac.signal, req.body?.lang === 'en' ? 'en' : 'ar'); send({ done: true }) }
  catch (e) { if (!ac.signal.aborted) { console.error(e.message); send({ error: e.code || 'upstream', detail: e.detail || e.message }) } }
  res.end()
})

app.use('/api', (_, res) => res.status(404).json({ error: 'not_found' }))
app.use((err, _req, res, _next) => { // أخطاء الـ JSON الكبير أو غير الصالح بدل صفحة HTML
  res.status(err.status === 413 ? 413 : 400).json({ error: 'bad_request' })
})

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist') // في الإنتاج يخدم الخادم الموقع المبني
if (fs.existsSync(dist)) { app.use(express.static(dist)); app.get('*', (_, res) => res.sendFile(path.join(dist, 'index.html'))) }
const port = process.env.PORT || 8787
app.listen(port, () => console.log(`Nabd API on :${port} | AI: ${[geminiOn() && 'Gemini', process.env.GROQ_API_KEY && 'Groq'].filter(Boolean).join('+') || 'OFF (محرك NLP المحلي فقط)'}`))
