// يتأكد أن كل مفتاح ترجمة موجود في اللغتين وأن كل مفتاح مستخدم في الكود معرَّف. شغّل: npm run check:i18n
import fs from 'node:fs'
import path from 'node:path'
import { ui } from '../src/i18n/ui.js'
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
const files = walk('src').filter(f => /\.(jsx?|js)$/.test(f) && !f.includes('i18n/ui.js'))
const used = new Set(); for (const f of files) for (const m of fs.readFileSync(f, 'utf8').matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)) used.add(m[1])
for (let i = 1; i <= 5; i++) used.add(`about.offer.${i}`)
for (const k of ['nav.home', 'nav.library', 'nav.assistant', 'nav.quiz', 'nav.kit', 'nav.voice', 'nav.videos', 'nav.books', 'nav.about']) used.add(k)
let bad = 0
for (const l of ['ar', 'en']) for (const k of used) if (!(k in ui[l])) { console.log(`missing ${l}: ${k}`); bad++ }
for (const k of Object.keys(ui.ar)) if (!(k in ui.en)) { console.log(`en missing: ${k}`); bad++ }
for (const k of Object.keys(ui.en)) if (!(k in ui.ar)) { console.log(`ar missing: ${k}`); bad++ }
console.log(bad ? `FAILED (${bad})` : `OK: ${Object.keys(ui.ar).length} keys, both languages complete`); process.exit(bad ? 1 : 0)
