---
title: Nabd
emoji: 💓
colorFrom: red
colorTo: pink
sdk: docker
app_port: 7860
pinned: false
---

# نبض | Nabd
تطبيق عربي/إنجليزي للإسعافات الأولية — React + Vite + Tailwind + خادم Node/Express. يعمل كموقع وPWA وتطبيق أندرويد (Capacitor).

## الواجهة الجديدة
- تصميم مستوحى من تطبيقات كوريا والصين واليابان: ألوان باستيل، بطاقات «ستيكر»، أزرار منفوخة، شريط تبويب سفلي عائم، شخصية «نبوض» (`src/components/Mascot.jsx`).
- لغتان بضغطة (عربي/English) مع RTL/LTR تلقائي: النصوص في `src/i18n/ui.js` والمحتوى الإنجليزي في `src/data/en/*` (نفس معرّفات الحالات). `npm run check:i18n` يتحقق من اكتمال الترجمة.
- مختبر الـ NLP لم يعد ظاهراً في التطبيق، لكن كود المحرك والنموذج (`src/nlp/**`، `llm/`) باقٍ كما هو ويعمل خلف الكواليس: الشات يستخدمه تلقائياً كوضع محلي (بدون إنترنت) لو الخادم غير متاح. الاختبارات: `npm test`.
- **النشر ومشاركة التطبيق مع الأصدقاء (رابط + APK): اقرئي `دليل-النشر.md`.**

---
منصة عربية للإسعافات الأولية — React + Vite + Tailwind (RTL) + خادم Node/Express. تعمل كموقع وكتطبيق موبايل (PWA / APK).

المشروع فيه **جزءان مستقلان تماماً**:

| | شات NLP / LLM (مشروع المادة) | شات Gemini |
|---|---|---|
| المكان | وضع الشات المحلي (داخل تبويب الشات) | صفحة `/assistant` (تبويب «اسأل نبض») + `/voice` |
| يعمل بدون إنترنت/خادم/مفتاح؟ | نعم، بالكامل داخل المتصفح | لا، يحتاج الخادم و`GEMINI_API_KEY` |
| الكود | `src/nlp/**` و`llm/train.py` | `server/gemini.js` و`server/prompts.js` |
| الوظيفة | إسعافات من مكتبة نبض، بنموذج بنيناه ودرّبناه | دردشة عامة في أي موضوع + الصور + الصوت |

## التشغيل
```
npm install
cp .env.example .env     # ضع GEMINI_API_KEY (اختياري، لشات Gemini فقط)
npm run dev:all          # الواجهة http://localhost:5173 + الخادم :8787
npm test                 # اختبارات الـ NLP والـ LLM
```
(اكتب `npm run dev:all` بدون مسافة بين dev و:all)

## مشروع مادة NLP
**المرجع الأكاديمي: محاضرات مقرر معالجة اللغات الطبيعية – د. أمير الجدي.**

### 1) محرك NLP كلاسيكي (مكتوب من الصفر، `src/nlp`)
| المرحلة | الملف |
|---|---|
| تطبيع، تقطيع، حذف الكلمات الشائعة، تجذيع خفيف، توسيع العامية | `preprocess.js` |
| Minimum Edit Distance (تصحيح إملائي) + Cosine | `similarity.js` |
| Bag-of-Words ثم TF-IDF | `tfidf.js` |
| Multinomial Naive Bayes + Laplace (نيّة الرسالة وتصنيف الحالة) | `naiveBayes.js` |
| Bigram Language Model + Perplexity | `ngramLM.js` |
| Co-occurrence → PPMI (تقارب دلالي) | `ppmi.js` |
| خط المعالجة والاسترجاع والرد بالقوالب | `engine.js` |
| مجموعة التقييم (Top-1 / Top-3) | `evalset.js` · `npm run eval:nlp` |

### 2) LLM حقيقي مبني من الصفر (GPT صغير، `src/nlp/llm` و`llm/`)
بدون PyTorch ولا Hugging Face ولا أي نموذج مُدرَّب مسبقاً:

| المرحلة | الملف |
|---|---|
| Tokenizer من نوع BPE (تدريب الدمج + الترميز + فكّه) | `src/nlp/llm/bpe.js` |
| بيانات التدريب (سؤال ← عنوان الحالة ← جواب) | `scripts/llm-build-data.js` |
| **التدريب**: Embedding + Causal Multi-Head Self-Attention + LayerNorm + MLP/GELU + Cross-Entropy + **Backpropagation يدوي** + Adam (numpy) | `llm/train.py` |
| فحص صحة الـ backprop بالمشتقات العددية | `npm run llm:gradcheck` |
| **الاستدلال** بـ JavaScript من الصفر مع KV-cache والـ sampling (temperature / top-k) | `src/nlp/llm/gpt.js` · `llm.js` |
| الشات: NLP يفهم ويسترجع الحالة ← LLM يكتب الجواب ← **فحص الأمانة** (يقارن كل سطر بالمكتبة بمسافة التحرير ويرفض أي هلوسة ويستبدلها بالقالب) | `src/nlp/llm/chat.js` |

أرقام النموذج: 376,800 معامل، 3 طبقات Transformer، 4 رؤوس، مفردات 800 رمز BPE، سياق 400. تدريبه يستغرق دقائق على CPU عادي.

**إعادة التدريب** (لو غيّرت `src/data/topics.js`):
```
npm run llm:data         # يدرّب BPE ويبني llm/dataset.json
npm run llm:train        # يحتاج python3 + numpy. يحفظ public/llm/model.bin/json
npm run llm:ref          # يحدّث المرجع الرقمي الذي يقارن به اختبار JS
npm test
```
(واجهة المختبر ذات الـ 14 مرحلة أُزيلت من التطبيق بطلب صاحبة المشروع؛ المسار `/nlp` يحوّل الآن إلى الشات.)

> **ملاحظة علمية:** النموذج صغير ومتخصص ومدرَّب على مكتبة نبض فقط؛ يصوغ الأجوبة حسب الحالة التي يسترجعها محرك NLP، ولا يعرف شيئاً خارجها. لذلك فوقه الاسترجاع وفحص الأمانة.

## Gemini (شات عام + صور + صوت)
1. ضع `GEMINI_API_KEY` في `.env` (يبقى في الخادم فقط) وأعد تشغيل الخادم.
2. **لمعرفة اسم النموذج المتاح لمفتاحك:** `npm run gemini:models` — يعرض النماذج المتاحة ويجرّبها ويقول لك ماذا تكتب في `GEMINI_MODEL`.
3. لو ظهر خطأ في الشات اضغط «تفاصيل الخطأ» لرؤية رد Google الحقيقي، أو افتح `http://localhost:8787/api/health`.
4. اختبار بدون مفتاح: `npm run mock:gemini` ثم `GEMINI_BASE_URL=http://localhost:9999 GEMINI_API_KEY=test npm run server`.

## المحادثة الصوتية (`/voice`)
محادثة مستمرة بدون ضغط زر في كل مرة: تتكلمين فيرد نبض، ويمكنك **مقاطعته** في أي وقت فيسكت فوراً ويسمعك.
- التعرف على الكلام: `SpeechRecognition` في Chrome/Edge (جلسة مستمرة، ويُعتبر سكوت 0.85 ثانية نهاية جملتك). في Safari/Firefox يُسجَّل الصوت ويُفرَّغ عبر `/api/stt`.
- الرد **متدفق** (`/api/chat-stream`، SSE من Gemini): ينطق نبض كل جملة فور وصولها دون انتظار اكتمال الرد، وهذا ما يقلل التأخير.
- النطق بصوت المتصفح (فوري). خيار «صوت Gemini الطبيعي» أحلى لكنه أبطأ.
- مرشّح صدى: لا يعتبر كلام نبض نفسه مقاطعة. السماعات تعطي أفضل تجربة، ويمكن إيقاف «السماح بمقاطعتي».
- الصور: «ارسملي ...» في شات `/assistant` (`/api/image`، حد 6/دقيقة).

## النشر (مطلوب للموبايل)
خدمة Node واحدة (Render/Railway): Build `npm install && npm run build`، Start `npm start`، وأضف `GEMINI_API_KEY`. شات NLP يعمل حتى لو الخادم واقف.

## تطبيق الموبايل
- **PWA:** افتح الموقع المنشور (https) ثم «إضافة إلى الشاشة الرئيسية». (يُحفظ نموذج الـ LLM مؤقتاً فيعمل بدون إنترنت بعد أول فتح.)
- **APK:** ضع `VITE_API_BASE=https://عنوان-خادمك` في `.env.production`، ثم `npm run cap:sync` و`npx cap add android` (مرة واحدة) و`npx cap open android`.

## المحتوى
`src/data/topics.js` (25 حالة)، `quiz.js`، `triage.js`، `kit.js`، `numbers.js`، `books.js` (المراجع، ومنها محاضرات د. أمير الجدي). راجع المحتوى الطبي مع مختص قبل النشر العام.

## فهم الكلمات الجديدة (بدون قاموس)
- **n-gram حروف** (`src/nlp/charngram.js`): الكلمة الغريبة تُمثَّل بأجزاء حروفها فتقترب من كلمات الحالة المشابهة. القياس: `npm run eval:unseen` (جمل لم تُستخدم في أي تدريب: Top-1 من 66.7% إلى 75%).
- **ذاكرة تتعلم** (`src/nlp/memory.js`): لو المحرك لم يفهم، يعرض أزرار «قصدك أنهي حالة؟»؛ اختيارك يُحفظ في المتصفح (`nabd-learned`) ويُفهم لاحقاً بصيغ مشابهة.
