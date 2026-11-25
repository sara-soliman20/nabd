// خادم Groq وهمي للاختبار: GROQ_BASE_URL=http://localhost:9998/openai/v1 GROQ_API_KEY=test
import http from 'node:http'
http.createServer((req, res) => {
  let b = ''; req.on('data', c => b += c); req.on('end', () => {
    const send = (c, o) => { res.writeHead(c, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)) }
    if (req.headers.authorization !== 'Bearer test') return send(401, { error: 'bad key' })
    if (req.url.endsWith('/models')) return send(200, { data: [] })
    if (req.url.endsWith('/audio/transcriptions')) return send(200, { text: /whisper-large-v3/.test(b) && /name="file"/.test(b) ? 'شلونك شو الأخبار' : '' })
    if (req.url.endsWith('/chat/completions')) {
      const j = JSON.parse(b); if (j.messages[0].role !== 'system' || j.messages[1].role !== 'user') return send(400, { error: 'bad roles' })
      if (!j.stream) return send(200, { choices: [{ message: { content: 'رد Groq التجريبي' } }] })
      res.writeHead(200, { 'content-type': 'text/event-stream' })
      for (const t of ['هلا ', 'والله. ', 'شلونك؟']) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`)
      return res.end('data: [DONE]\n\n')
    }
    send(404, {})
  })
}).listen(9998, () => console.log('mock groq on :9998'))
