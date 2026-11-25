import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/components/VoiceChat.jsx', import.meta.url), 'utf8')
test('voice VAD drops delayed captures while assistant playback is active', () => {
  assert.match(source, /if \(echoRisk && !cfg\.current\.barge\)/)
  assert.match(source, /if \(busy\.current \|\| say\.current\.busy\) return/)
})
test('voice VAD explicitly mutes on playback if barge-in is disabled', () => {
  assert.match(source, /vad\.current\?\.setMuted\(true\)/)
})
test('browser speech recognition ignores captured speech while assistant is speaking if barge-in is off', () => {
  assert.match(source, /if \(!cfg\.current\.barge\) \{ clearTimeout\(timer\.current\); heard\.current = ''; setLive\(''\); return \}/)
})

const speaker = await readFile(new URL('../src/utils/speaker.js', import.meta.url), 'utf8')
const flow = await readFile(new URL('../.github/workflows/' + (await import('node:fs')).readdirSync(new URL('../.github/workflows/', import.meta.url))[0], import.meta.url), 'utf8')
test('echo-discard does not reset busy/status while Nabd is still talking', () => {
  assert.doesNotMatch(source, /if \(echoRisk && !cfg\.current\.barge\) \{ busy\.current = false/)
})
test('browser TTS has a watchdog so a missing onend cannot hang the conversation', () => {
  assert.match(speaker, /wd = setTimeout\(fin/)
})
test('voice retries the health check while the server is waking up', () => {
  assert.match(source, /reason === 'server_down' && \+\+n < 10/)
  assert.match(source, /voice\.wake/)
})
test('Android build declares microphone permission', () => {
  assert.match(flow, /RECORD_AUDIO/)
})
