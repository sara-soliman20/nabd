import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { LangProvider } from './i18n/index.jsx'
import { isNative } from './utils/platform.js'
import '@fontsource/cairo/arabic-400.css'
import '@fontsource/cairo/arabic-600.css'
import '@fontsource/cairo/arabic-700.css'
import '@fontsource/cairo/latin-400.css'
import '@fontsource/cairo/latin-600.css'
import '@fontsource/cairo/latin-700.css'
import '@fontsource/baloo-bhaijaan-2/arabic-700.css'
import '@fontsource/baloo-bhaijaan-2/arabic-800.css'
import '@fontsource/baloo-bhaijaan-2/latin-700.css'
import '@fontsource/baloo-bhaijaan-2/latin-800.css'
import './index.css'

const Router = isNative ? HashRouter : BrowserRouter // داخل تطبيق الموبايل نستخدم # لتفادي مشاكل المسارات
createRoot(document.getElementById('root')).render(<ErrorBoundary><LangProvider><Router><App /></Router></LangProvider></ErrorBoundary>)

if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
