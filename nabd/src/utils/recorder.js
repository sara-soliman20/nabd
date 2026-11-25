// تسجيل من المايك حتى يسكت المتحدث، ثم تحويله إلى WAV أحادي 16kHz (base64). يعمل على كل المتصفحات (بديل للتعرف على الكلام المدمج).
async function toWav(blob, ac) {
  const audio = await ac.decodeAudioData(await blob.arrayBuffer())
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(audio.duration * 16000)), 16000)
  const s = off.createBufferSource(); s.buffer = audio; s.connect(off.destination); s.start()
  const pcm = (await off.startRendering()).getChannelData(0), n = pcm.length * 2
  const v = new DataView(new ArrayBuffer(44 + n)), w = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n, true)
  pcm.forEach((x, i) => v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x)) * 0x7fff, true))
  const u = new Uint8Array(v.buffer); let bin = ''; for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode(...u.subarray(i, i + 0x8000))
  return btoa(bin)
}
export const canRecord = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'
// signal: AbortSignal لإيقاف التسجيل. يرجع WAV base64 أو null لو لم يُسمع كلام.
export async function recordUntilSilence({ maxMs = 15000, silenceMs = 1300, signal } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  const ac = new (window.AudioContext || window.webkitAudioContext)(), an = ac.createAnalyser(); an.fftSize = 1024; ac.createMediaStreamSource(stream).connect(an)
  const rec = new MediaRecorder(stream), chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data)
  const stopped = new Promise(res => { rec.onstop = res }), buf = new Uint8Array(an.fftSize), t0 = Date.now(); let heard = false, quiet = t0
  rec.start(250)
  const tick = setInterval(() => {
    an.getByteTimeDomainData(buf); let s = 0; for (const b of buf) { const x = (b - 128) / 128; s += x * x }
    const now = Date.now(); if (Math.sqrt(s / buf.length) > 0.04) { heard = true; quiet = now }
    if ((signal?.aborted || now - t0 > maxMs || (heard && now - quiet > silenceMs) || (!heard && now - t0 > 8000)) && rec.state !== 'inactive') rec.stop()
  }, 100)
  await stopped; clearInterval(tick); stream.getTracks().forEach(t => t.stop())
  try { return heard && !signal?.aborted ? await toWav(new Blob(chunks, { type: rec.mimeType }), ac) : null } finally { ac.close() }
}
