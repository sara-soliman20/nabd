import { Capacitor } from '@capacitor/core'
export const isNative = (() => { try { return Capacitor.isNativePlatform() } catch { return false } })()
export const isStandalone = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true)
export const isIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
// الرابط الذي يُشارَك مع الأصدقاء. في تطبيق الموبايل ضع VITE_PUBLIC_URL (رابط الموقع المنشور).
export const shareUrl = () => import.meta.env.VITE_PUBLIC_URL || (isNative ? '' : window.location.origin)
