// رسائل الحالة الموحّدة لشات Gemini (تظهر للمستخدم بالعربية بدل رموز الأخطاء).
const tail = ' الشات المحلي في صفحة «مختبر NLP» يعمل بدون Gemini وبدون إنترنت.'
export const notices = {
  no_key: 'Gemini غير مفعّل: لا يوجد مفتاح في الخادم. ضع GEMINI_API_KEY في ملف .env ثم أعد تشغيل الخادم.' + tail,
  bad_key: 'مفتاح Gemini غير صالح أو غير مفعّل. أنشئ مفتاحاً جديداً من Google AI Studio، وشغّل npm run gemini:models للتأكد.',
  bad_model: 'اسم نموذج Gemini غير متاح لمفتاحك. شغّل الأمر npm run gemini:models في الـ Terminal وسيعرض الاسم الصحيح لتضعه في GEMINI_MODEL داخل .env.',
  bad_request: 'رفض Gemini الطلب. جرّب صياغة أخرى.',
  quota: 'تم تجاوز حصة Gemini المجانية الآن. انتظر قليلاً ثم أعد المحاولة.',
  blocked: 'حجب Gemini هذا الرد لأسباب أمان. جرّب صياغة أخرى.',
  empty: 'لم يرجع Gemini رداً. أعد المحاولة.',
  rate_limited: 'عدد الطلبات كبير، انتظر دقيقة.',
  upstream: 'تعذر الاتصال بـ Gemini الآن (تحقق من الإنترنت).',
  server_down: 'الخادم غير مشغّل. شغّل المشروع بالأمر: npm run dev:all',
  error: 'حدث خطأ غير متوقع في الخادم.',
}
export const imageErrors = {
  no_key: 'الرسم يحتاج مفتاح Gemini في الخادم.', bad_key: 'مفتاح Gemini غير صالح.', quota: 'تم تجاوز حصة الرسم. انتظر قليلاً.',
  bad_model: 'نموذج الصور غير متاح لمفتاحك. قد يحتاج حساباً مدفوعاً أو ضبط GEMINI_IMAGE_MODEL.',
  rate_limited: 'عدد الطلبات كبير، انتظر دقيقة.', server_down: 'الرسم يحتاج اتصالاً بالخادم.', no_image: 'تعذر رسم الصورة لهذا الطلب.', blocked: 'لم يُسمح بتوليد هذه الصورة.',
}
export const healthText = {
  server_down: 'الخادم غير متصل. شغّل npm run dev:all.',
  no_key: 'Gemini غير مفعّل: ضع GEMINI_API_KEY في ملف .env وأعد تشغيل الخادم.',
  bad_key: 'مفتاح Gemini غير صالح.', bad_model: 'نموذج Gemini غير متاح لمفتاحك: شغّل npm run gemini:models.',
  quota: 'حصة Gemini منتهية الآن.', upstream: 'تعذر الوصول إلى Gemini.',
}
