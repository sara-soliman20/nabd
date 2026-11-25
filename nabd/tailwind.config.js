const v = n => `rgb(var(--${n}) / <alpha-value>)`
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  safelist: ['badge-critical', 'badge-urgent', 'badge-minor'],
  theme: { extend: {
    colors: {
      canvas: v('canvas'), surface: v('surface'), ink: v('ink'), muted: v('muted'), line: v('line'), soft: v('soft'),
      brand: v('brand'), 'brand-deep': v('brand-deep'), accent: v('accent'), ok: v('ok'), 'ok-soft': v('ok-soft'),
      pop: { rose: v('p-rose'), peach: v('p-peach'), butter: v('p-butter'), mint: v('p-mint'), sky: v('p-sky'), lav: v('p-lav') },
    },
    fontFamily: { sans: ['Cairo', 'system-ui', 'sans-serif'], display: ['"Baloo Bhaijaan 2"', 'Cairo', 'system-ui', 'sans-serif'] },
    borderRadius: { '4xl': '2rem' },
  } },
}
