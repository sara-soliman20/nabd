import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import FloatingCall from './components/FloatingCall.jsx'
import BottomNav from './components/BottomNav.jsx'
import Home from './pages/Home.jsx'
import Library from './pages/Library.jsx'
import TopicDetail from './pages/TopicDetail.jsx'
import Assistant from './pages/Assistant.jsx'
import Quiz from './pages/Quiz.jsx'
import Kit from './pages/Kit.jsx'
import Emergency from './pages/Emergency.jsx'
import Videos from './pages/Videos.jsx'
import Voice from './pages/Voice.jsx'
import Books from './pages/Books.jsx'
import About from './pages/About.jsx'
import NotFound from './pages/NotFound.jsx'
import { useLang } from './i18n/index.jsx'

function ScrollToTop() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo(0, 0); document.getElementById('main')?.focus({ preventScroll: true }) }, [pathname]); return null }
export default function App() {
  const { pathname } = useLocation(); const { t } = useLang()
  return (<div className="min-h-screen flex flex-col"><a href="#main" className="skip-link">{t('a11y.skip')}</a><ScrollToTop /><Navbar />
    <main id="main" tabIndex={-1} className="flex-1 pb-36 lg:pb-10 outline-none"><div key={pathname} className="page"><Routes>
      <Route path="/" element={<Home />} />
      <Route path="/library" element={<Library />} />
      <Route path="/library/:id" element={<TopicDetail />} />
      <Route path="/assistant" element={<Assistant />} />
      <Route path="/quiz" element={<Quiz />} />
      <Route path="/kit" element={<Kit />} />
      <Route path="/emergency" element={<Emergency />} />
      <Route path="/videos" element={<Videos />} />
      <Route path="/voice" element={<Voice />} />
      <Route path="/books" element={<Books />} />
      <Route path="/nlp" element={<Navigate to="/assistant?tab=chat" replace />} />
      <Route path="/about" element={<About />} />
      <Route path="*" element={<NotFound />} />
    </Routes></div></main><Footer />{pathname !== '/emergency' && <FloatingCall />}<BottomNav /></div>)
}
