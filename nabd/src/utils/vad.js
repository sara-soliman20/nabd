// مستمع صوتي مستمر بكشف تلقائي للكلام (VAD): يبقى المايك مفتوحاً طوال المحادثة، ويقتطع كل جملة تلقائياً
// (مع نحو نصف ثانية قبل بداية الكلام كي لا تضيع أول حروفها)، ثم يسلّمها WAV 16kHz (base64) للتفريغ على الخادم.
// يعمل على كل المتصفحات ولا يعتمد على لغة أو لهجة معيّنة (التعرف على اللهجة يتم في الخادم).
// يسمح بالمقاطعة: onStart() يُستدعى فور بدء كلام المستخدم، وأثناء كلام نبض نفسه نشترط صوتاً أعلى وأطول (strict) لتجنب الصدى.
const WORKLET = `class P extends AudioWorkletProcessor{process(i){const c=i[0]&&i[0][0];if(c)this.port.postMessage(c.slice(0));return true}}registerProcessor('vad-cap',P)`

function toWavB64(frames, rate) {
  let n = 0; for (const f of frames) n += f.length
  const all = new Float32Array(n); let o = 0; for (const f of frames) { all.set(f, o); o += f.length }
  const outN = Math.max(1, Math.floor(all.length * 16000 / rate)), v = new DataView(new ArrayBuffer(44 + outN * 2)), w = (p, t) => [...t].forEach((c, i) => v.setUint8(p + i, c.charCodeAt(0)))
  w(0, 'RIFF'); v.setUint32(4, 36 + outN * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, outN * 2, true)
  const k = rate / 16000
  for (let i = 0; i < outN; i++) { // تصغير العينات بمتوسط (يكفي للكلام)
    const a = i * k, b = Math.min(all.length, (i + 1) * k); let s = 0, c = 0
    for (let j = Math.floor(a); j < Math.ceil(b); j++) { s += all[j]; c++ }
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, c ? s / c : 0)) * 0x7fff, true)
  }
  const u = new Uint8Array(v.buffer); let bin = ''; for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode(...u.subarray(i, i + 0x8000))
  return btoa(bin)
}

export const canVad = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext)

export class VadListener {
  /** o: { onStart(), onUtterance(wavB64), onLevel(0..1), strict(): bool, silenceSec = 0.9, maxSec = 20 } */
  constructor(o) { this.o = o; this.muted = false; this.ctx = null; this.stream = null; this.node = null; this.alive = false; this.floor = 0.006; this.reset() }
  reset() { this.pre = []; this.preLen = 0; this.utt = []; this.state = 'idle'; this.voicedRun = 0; this.silRun = 0; this.voicedTotal = 0; this.uttLen = 0 }
  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } })
    const AC = window.AudioContext || window.webkitAudioContext; this.ctx = new AC(); await this.ctx.resume?.()
    const src = this.ctx.createMediaStreamSource(this.stream); this.alive = true
    const feed = f => this.#frame(f), sink = () => { const g = this.ctx.createGain(); g.gain.value = 0; g.connect(this.ctx.destination); return g } // المسار يلزم أن يصل للمخرج كي يعمل، لكن بدون صوت
    if (this.ctx.audioWorklet && typeof Blob !== 'undefined') {
      try {
        const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' })); await this.ctx.audioWorklet.addModule(url); URL.revokeObjectURL(url)
        this.node = new AudioWorkletNode(this.ctx, 'vad-cap'); this.node.port.onmessage = e => feed(e.data); src.connect(this.node); this.node.connect(sink()); return
      } catch { /* نرجع إلى ScriptProcessor */ }
    }
    this.node = this.ctx.createScriptProcessor(2048, 1, 1); this.node.onaudioprocess = e => feed(new Float32Array(e.inputBuffer.getChannelData(0)))
    src.connect(this.node); this.node.connect(sink())
  }
  stop() {
    this.alive = false; try { this.node?.disconnect() } catch { /* */ }
    this.stream?.getTracks().forEach(t => t.stop()); try { this.ctx?.close() } catch { /* */ }
    this.node = this.stream = this.ctx = null; this.reset()
  }
  /** يتجاهل أي كلام ويمسح الجملة الجارية (مثلاً أثناء التفكير لو المقاطعة مقفولة). */
  setMuted(m) { this.muted = m; if (m) this.reset() }
  #frame(f) {
    if (!this.alive || !this.ctx) return
    const rate = this.ctx.sampleRate, dur = f.length / rate; let s = 0; for (let i = 0; i < f.length; i++) s += f[i] * f[i]
    const rms = Math.sqrt(s / f.length); this.o.onLevel?.(Math.min(1, rms * 8))
    if (this.muted) return
    const strict = !!this.o.strict?.(), thr = strict ? Math.max(0.07, this.floor * 6) : Math.max(0.018, this.floor * 3.5), voiced = rms > thr
    if (this.state === 'idle') {
      if (!voiced) this.floor = Math.min(0.05, Math.max(0.003, this.floor * 0.97 + rms * 0.03))
      this.pre.push(f); this.preLen += dur
      while (this.preLen > 0.5 && this.pre.length > 1) this.preLen -= this.pre.shift().length / rate
      this.voicedRun = voiced ? this.voicedRun + dur : 0
      if (this.voicedRun >= (strict ? 0.35 : 0.12)) { this.state = 'speech'; this.utt = this.pre; this.uttLen = this.preLen; this.pre = []; this.preLen = 0; this.silRun = 0; this.voicedTotal = this.voicedRun; this.o.onStart?.() }
      return
    }
    this.utt.push(f); this.uttLen += dur
    if (voiced) { this.silRun = 0; this.voicedTotal += dur } else this.silRun += dur
    if (this.silRun >= (this.o.silenceSec || 0.9) || this.uttLen >= (this.o.maxSec || 20)) {
      const frames = this.utt, ok = this.voicedTotal >= 0.3; this.reset()
      if (ok) this.o.onUtterance?.(toWavB64(frames, rate))
    }
  }
}
