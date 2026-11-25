// خادم Gemini وهمي للاختبار المحلي بدون مفتاح/إنترنت: GEMINI_BASE_URL=http://localhost:9999 GEMINI_API_KEY=test
// يتحقق أيضاً من شكل الطلب (أول رسالة user، وجود systemInstruction...) ويحاكي أعطال: ضع "FAIL429" أو "FAIL500" في السؤال.
import http from 'node:http'
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
http.createServer((req, res) => {
  let b = ''; req.on('data', c => b += c); req.on('end', () => {
    const send = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)) }
    if (req.headers['x-goog-api-key'] !== 'test') return send(400, { error: { message: 'API key not valid' } })
    if (req.url.startsWith('/models?')) return send(200, { models: ['gemini-3-flash', 'gemini-3-flash-preview-tts', 'gemini-3-flash-image'].map(n => ({ name: 'models/' + n, supportedGenerationMethods: ['generateContent'] })) })
    const sm = /models\/([^:]+):streamGenerateContent/.exec(req.url)
    if (sm) { // يحاكي البث المتدفق (SSE): أجزاء تصل تباعاً
      if (/^gemini-(flash-latest|2\.5-flash-preview-tts|2\.5-flash-image)$/.test(sm[1])) return send(404, { error: { message: 'model not found' } })
      const parts = ['تمام، ', 'أنا معاكي. ', 'اتصلي بالإسعاف 123 لو الحالة خطيرة. ', 'احكيلي إيه اللي حصل بالظبط؟'], ev = x => res.write(`data: ${JSON.stringify({ candidates: [{ content: { parts: [x] } }] })}\r\n\r\n`)
      res.writeHead(200, { 'content-type': 'text/event-stream' }); ev({ thought: true, text: 'thinking' })
      let i = 0; const t = setInterval(() => { if (i < parts.length) ev({ text: parts[i++] }); else { clearInterval(t); res.end() } }, 150); return
    }
    const m = /models\/([^:]+):generateContent/.exec(req.url); if (!m) return send(404, {})
    if (/^gemini-(flash-latest|2\.5-flash-preview-tts|2\.5-flash-image)$/.test(m[1])) return send(404, { error: { message: 'model not found' } })   // يحاكي اسماً قديماً
    const j = JSON.parse(b || '{}'), txt = JSON.stringify(j.contents)
    if (j.contents?.[0]?.role && j.contents[0].role !== 'user') return send(400, { error: { message: 'first content must be user' } })
    if (/FAIL429/.test(txt)) return send(429, { error: { message: 'quota' } })
    if (/FAIL500/.test(txt)) return send(500, { error: { message: 'boom' } })
    if (j.generationConfig?.responseModalities?.includes('AUDIO')) return send(200, { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: Buffer.alloc(4800).toString('base64') } }] } }] })
    if (j.generationConfig?.responseModalities?.includes('IMAGE')) return send(200, { candidates: [{ content: { parts: [{ text: 'ok' }, { inlineData: { mimeType: 'image/png', data: PNG } }] } }] })
    if (/فرّغ الكلام/.test(txt)) return send(200, { candidates: [{ content: { parts: [{ text: 'طفل بيتخنق' }] } }] })
    const ctx = /## ([^\n(]+)/.exec(txt)?.[1]?.trim() || 'لا يوجد'
    // يحاكي نموذج "يفكر": جزء thought أولاً ثم الرد
    send(200, { candidates: [{ content: { parts: [{ thought: true, text: 'thinking…' }, { text: `🚨 مستوى الخطورة: (رد Gemini التجريبي)\n✅ ماذا أفعل؟ اعتماداً على: ${ctx}\n📚 المصادر: ${ctx}` }] }, finishReason: 'STOP' }] })
  })
}).listen(9999, () => console.log('mock gemini on :9999'))
