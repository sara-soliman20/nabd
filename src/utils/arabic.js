// تطبيع النص العربي للبحث: يتجاهل التشكيل واختلاف الهمزات والياء والتاء المربوطة
export const norm = (s = '') =>
  s.toString().toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ؤ]/g, 'و').replace(/[ئ]/g, 'ي')
    .replace(/[^\u0621-\u064Aa-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
