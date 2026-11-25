import { Home, BookOpen, Bot, Mic, ClipboardList, ShieldPlus, Video, GraduationCap, Info } from 'lucide-react'
// [مسار، مفتاح الترجمة، أيقونة، لون البلاطة]
export const mainLinks = [
  ['/', 'nav.home', Home, 'rose'], ['/library', 'nav.library', BookOpen, 'peach'], ['/assistant', 'nav.assistant', Bot, 'lav'],
  ['/quiz', 'nav.quiz', ClipboardList, 'butter'], ['/kit', 'nav.kit', ShieldPlus, 'mint'], ['/voice', 'nav.voice', Mic, 'sky'],
  ['/videos', 'nav.videos', Video, 'rose'], ['/books', 'nav.books', GraduationCap, 'lav'], ['/about', 'nav.about', Info, 'peach'],
]
export const moreLinks = mainLinks.filter(([to]) => ['/voice', '/quiz', '/kit', '/videos', '/books', '/about'].includes(to))
