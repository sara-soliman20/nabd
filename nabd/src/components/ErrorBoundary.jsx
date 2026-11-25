import { Component } from 'react'
import Mascot from './Mascot.jsx'
// يمنع الشاشة البيضاء: لو حدث خطأ غير متوقع تظهر رسالة ورقم الطوارئ بدل صفحة فارغة. (خارج LangProvider فنقرأ اللغة مباشرة)
const TXT = { ar: ['حدث خطأ غير متوقع', 'أعد تحميل الصفحة. ولو كنت في موقف طارئ فاتصل بالإسعاف الآن.', 'اتصل بالإسعاف 123', 'إعادة التحميل'], en: ['Something went wrong', 'Reload the page. If this is an emergency, call the ambulance now.', 'Call ambulance 123', 'Reload'] }
export default class ErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(e) { console.error(e) }
  render() {
    if (!this.state.failed) return this.props.children
    let l = 'ar'; try { l = localStorage.getItem('nabd-lang') === 'en' ? 'en' : 'ar' } catch { /* لا تخزين */ }
    const [h, p, c, r] = TXT[l]
    return (<div className="min-h-screen flex items-center justify-center p-6 text-center" dir={l === 'ar' ? 'rtl' : 'ltr'}><div className="card max-w-md space-y-4"><Mascot size={110} mood="worry" className="mx-auto" />
      <h1 className="font-display font-extrabold text-2xl text-accent">{h}</h1><p>{p}</p>
      <a href="tel:123" className="btn btn-block">{c}</a><button className="btn btn-line btn-block" onClick={() => location.reload()}>{r}</button></div></div>)
  }
}
