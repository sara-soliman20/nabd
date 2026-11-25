// ─────────────────────────────────────────────────────────────
// المرحلة 1: المعالجة الأولية للنص العربي (Text Preprocessing)
// تطبيع (Normalization) ← تقطيع (Tokenization) ← حذف الكلمات الشائعة (Stop-words)
// ← تجذيع خفيف (Light Stemming) ← توسيع العامية (Dialect expansion)
// كل شيء مكتوب من الصفر بدون أي مكتبة NLP جاهزة.
// ─────────────────────────────────────────────────────────────

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'

/** تطبيع: يوحّد أشكال الحروف ويحذف التشكيل والتطويل والرموز. */
export function norm(s = '') {
  return s.toString().toLowerCase()
    .replace(/[٠-٩]/g, d => AR_DIGITS.indexOf(d))          // الأرقام العربية → لاتينية
    .replace(/[ً-ٰٟـ]/g, '')            // التشكيل والتطويل
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[^ء-يa-z0-9\s]/g, ' ')              // أي رمز غير الحروف والأرقام
    .replace(/(.)\1{2,}/g, '$1')                            // "مش بيتنفسسس" → "مش بيتنفس"
    .replace(/\s+/g, ' ').trim()
}

/** كلمات شائعة لا تحمل معنى للتصنيف. نُبقي كلمات النفي (لا/مش/ما/بدون) لأن معناها حاسم. */
const STOP_RAW = `في من على عن الى إلى ده دي دا ديه دول هو هي هم انا أنا انت أنت احنا نحن ان إن أن او أو ثم لو اذا إذا
ماذا ايه إيه اي أي هل كيف ازاي إزاي ليه لماذا امتى متى فين اين أين مين من هذا هذه ذلك تلك الذي التي كان كانت يكون
مع يا طب بس كده كدا قد كل بعد قبل عند عندي عنده معايا لي له ليا ليه لها فيه فيها منه منها بيه بها
حد حاجه حاجة شويه شوية جدا جداً اوي أوي خالص برضه كمان تاني بقى بقي يعني زي مثل`
export const STOPWORDS = new Set(STOP_RAW.split(/\s+/).map(norm).filter(Boolean))
export const NEGATIONS = new Set(['لا', 'مش', 'ما', 'مفيش', 'بدون', 'غير', 'ولا'].map(norm))

/** تقطيع النص إلى كلمات بعد التطبيع. */
export const tokenize = text => { const n = norm(text); return n ? n.split(' ') : [] }

export const removeStopwords = tokens => tokens.filter(t => !STOPWORDS.has(t) && t.length > 1)

// ───────── التجذيع الخفيف (Light stemmer شبيه بـ Larkey Light10 + بادئات العامية) ─────────
// ليس استخراج جذر؛ هو فقط يحذف أشهر السوابق واللواحق ليتطابق "الحروق" مع "حرق" و"حالات" مع "حاله".
const PREFIXES = ['وال', 'بال', 'كال', 'فال', 'ولل', 'لل', 'ال', 'بي', 'هي', 'و', 'ف', 'ب', 'ل']
const SUFFIXES = ['ها', 'هم', 'هن', 'كما', 'كم', 'نا', 'ان', 'ات', 'ون', 'ين', 'يه', 'ه', 'ي', 'ك']

export function stem(word) {
  if (/^[a-z0-9]+$/.test(word) || word.length < 4) return word         // لاتيني/قصير: لا نمسّه
  let w = word
  for (const p of PREFIXES) {                                           // نحذف سابقة واحدة (الأطول أولاً)
    if (w.startsWith(p) && w.length - p.length >= 3 && (p.length > 1 || w.length >= 5)) { w = w.slice(p.length); break }
  }
  for (const s of SUFFIXES) {                                           // ولاحقة واحدة
    if (w.endsWith(s) && w.length - s.length >= 3) { w = w.slice(0, -s.length); break }
  }
  return w
}

// ───────── توسيع العامية المصرية → مفردات المحتوى ─────────
// معجم صغير يربط تعبيرات الناس بالمصطلحات المستخدمة في مكتبة نبض (Query expansion بمعجم).
const DIALECT_RAW = {
  'حرق حرقت اتحرق اتحرقت اتحرقوا ولعت مولع اتكويت كاوي': 'حرق',
  'بيتخنق اتخنق بيختنق مخنوق خنق غص غصه بلع زوره زورو لقمه': 'اختناق',
  'بيرتعش رعشه ارتعاش بيتشنج اتشنج تشنجات صرع': 'تشنج',
  'مغمي مغمى اغمي اغمى دايخ بيدوخ دوخه دوخان دوار غم غمي غمى': 'اغماء دوخه',
  'تقيا بتقيا تقيئ بتقيئ بتقيي بيتقيا قيء قئ استفراغ بيستفرغ بتستفرغ استفرغ بترجع بيرجع ترجيع رجع غثيان': 'قيء غثيان',
  'بينزف بتنزف نازف نزف ينزف الدم دم': 'نزيف',
  'عقربه عقرب تعبان ثعبان حنش حيه لدغني لدغتني لسعني لسعتني لدغ': 'لدغ',
  'عضني عضتني عضه كلب قطه خربشني': 'عضه حيوان',
  'اتكسر اتكسرت مكسور كسر عظمه': 'كسر',
  'اتلوت لوي اتلوى ملخ ملخت اتملخ': 'التواء',
  'اتكهرب كهربا كهرباء صعق سلك بريزه': 'صعق كهرباء',
  'غرقان غرق بيغرق غريق حمام سباحه': 'غرق',
  'سكر سكري انسولين': 'هبوط سكر',
  'جلطه ذبحه': 'قلب صدر',
  'شلل مايل': 'سكته دماغيه',
  'ربو نهجان بخاخ': 'ربو ضيق نفس',
  'بلع شرب ابتلع كلور مبيد': 'تسمم',
  'عيني عين': 'اصابه عين',
  'راسه راس دماغ خبطه': 'اصابه راس',
  'ورم تورم': 'حساسيه',
  'وقع سقط': 'وقع',
}
export const DIALECT = new Map()
for (const [keys, val] of Object.entries(DIALECT_RAW))
  for (const k of keys.split(' ')) DIALECT.set(norm(k), norm(val).split(' '))

/** يضيف مرادفات الفصحى/المحتوى لكل كلمة عامية موجودة في المعجم. */
export const expandDialect = tokens => tokens.flatMap(t => DIALECT.has(t) ? DIALECT.get(t) : [])

/** خط المعالجة الكامل؛ يرجع كل مرحلة منفصلة لعرضها في مختبر NLP. */
export function preprocess(text, { expand = true } = {}) {
  const normalized = norm(text)
  const tokens = normalized ? normalized.split(' ') : []
  const filtered = removeStopwords(tokens)
  const expanded = expand ? expandDialect(filtered) : []
  const stems = [...filtered, ...expanded].map(stem)
  return { normalized, tokens, filtered, expanded, stems }
}

/** الميزات المستخدمة في النماذج: كلمات مجذّعة (unigrams) + أزواج متجاورة (bigrams). */
export function features(stems) {
  const out = [...stems]
  for (let i = 0; i < stems.length - 1; i++) out.push(`${stems[i]}_${stems[i + 1]}`)
  return out
}
