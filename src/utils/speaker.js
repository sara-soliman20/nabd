// مُتحدّث بطابور جُمل: ينطق كل جملة فور وصولها (من الرد المتدفق) ويمكن قطعه فوراً عند مقاطعة المستخدم.
// الوضع الافتراضي: صوت المتصفح (فوري، بدون شبكة). الوضع 'gemini': صوت Gemini الطبيعي لكل جملة مع تحميل مسبق للجمل التالية (أبطأ قليلاً).
import { speakNabd } from '../services/aiService.js'
const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
export const clean = t => t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/[*#_`>~]+/g, ' ').replace(/\s+/g, ' ').trim()
const pickVoice = lang => { const v = typeof speechSynthesis !== 'undefined' ? speechSynthesis.getVoices() : [], base = lang.slice(0, 2); return v.find(x => x.lang.replace('_', '-').toLowerCase() === lang.toLowerCase()) || v.find(x => x.lang.toLowerCase().startsWith(base)) || null }

export class Speaker {
  constructor() { this.q = []; this.playing = false; this.gen = 0; this.mode = 'browser'; this.ctx = null; this.src = null; this.waiters = []; this.onSentence = null; this.lang = 'ar-EG'; this.latin = 'en-US'; this.fails = 0 }  // lang: لهجة الصوت للنص العربي (صوت المتصفح فقط)، latin: للنص اللاتيني
  unlock() { if (AC) { this.ctx ||= new AC(); this.ctx.resume?.() } } // يلزم داخل ضغطة المستخدم
  get busy() { return this.playing || this.q.length > 0 }
  say(text) {
    const t = clean(text); if (!t) return
    this.q.push({ text: t, audio: this.mode === 'gemini' && this.ctx ? speakNabd(t).then(b => this.ctx.decodeAudioData(b)).then(a => { this.fails = 0; return a }).catch(() => { if (++this.fails >= 2) this.mode = 'browser'; return null }) : null }) // فشل جملة واحدة ينطقها المتصفح، وفشلان متتاليان يحوّلان الباقي للمتصفح
    this.#pump()
  }
  async #pump() {
    if (this.playing) return; this.playing = true; const my = this.gen
    while (this.q.length && my === this.gen) { const it = this.q.shift(); this.onSentence?.(it.text); await this.#play(it, my) }
    if (my === this.gen) { this.playing = false; this.waiters.splice(0).forEach(r => r()) }
  }
  async #play(it, my) {
    if (it.audio) {
      const buf = await it.audio; if (my !== this.gen) return
      if (buf) return new Promise(res => { const s = this.ctx.createBufferSource(); s.buffer = buf; s.connect(this.ctx.destination); s.onended = res; this.src = s; s.start() })
    }
    return new Promise(res => {
      if (typeof speechSynthesis === 'undefined') return res()
      // بعض متصفحات الموبايل (Chrome أندرويد خصوصاً) أحياناً لا تُطلق onend فتعلق المحادثة على "بتكلم"؛ المؤقّت ده يفكّها.
      let wd = null, done = false; const fin = () => { if (done) return; done = true; clearTimeout(wd); res() }
      const lg = /[\u0600-\u06FF]/.test(it.text) ? this.lang : this.latin, u = new SpeechSynthesisUtterance(it.text); u.lang = lg; u.rate = 1.05; u.voice = pickVoice(lg); u.onend = u.onerror = fin
      wd = setTimeout(fin, Math.max(4000, it.text.length * 130 + 3000)); speechSynthesis.speak(u)
    })
  }
  /** يقطع الكلام فوراً ويفرّغ الطابور. */
  cancel() {
    this.gen++; this.q = []; this.playing = false
    try { this.src?.stop() } catch { /* انتهى */ } this.src = null
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
    this.waiters.splice(0).forEach(r => r())
  }
  /** يُحَلّ عندما ينتهي نطق كل ما في الطابور (أو عند cancel). */
  drain() { return this.busy ? new Promise(r => this.waiters.push(r)) : Promise.resolve() }
  dispose() { this.cancel(); this.ctx?.close?.() }
}

/** يقسّم النص المتدفق إلى جمل جاهزة للنطق: يرجع { sentences, rest }. نقطع عند علامات الترقيم، أو عند ، لو الجملة طالت، أو عند مسافة لو طالت جداً. */
export function takeSentences(buf, final = false) {
  const out = []; let rest = buf
  for (;;) {
    const m = /^([\s\S]*?[.!?؟؛\n])(\s|$)/.exec(rest) || (rest.length > 45 && /^([\s\S]{20,}?،)(\s|$)/.exec(rest)) || (rest.length > 110 && /^([\s\S]{60,}?)\s/.exec(rest))
    if (!m) break; out.push(m[1]); rest = rest.slice(m[0].length)
  }
  if (final && rest.trim()) { out.push(rest); rest = '' }
  return { sentences: out.map(s => s.trim()).filter(s => clean(s).length > 1), rest }
}
