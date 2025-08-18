/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'], // still supported if you want to force .dark
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Neutrals (as CSS var strings; alpha utilities won’t apply, which is fine for brand colors) */
        brand: {
          bg: 'var(--brand-bg)',
          surface: 'var(--brand-surface)',
          surface2: 'var(--brand-surface2)',
          border: 'var(--brand-border)',
          ink: 'var(--brand-ink)',
          subtle: 'var(--brand-subtle)',
          coral: {
            50: 'var(--brand-coral-50)',
            400: 'var(--brand-coral-400)',
            500: 'var(--brand-coral-500)',
            600: 'var(--brand-coral-600)',
            700: 'var(--brand-coral-700)',
          },
        },
        domain: {
          ima: 'var(--domain-ima)',
          rc: 'var(--domain-rc)',
          qpp: 'var(--domain-qpp)',
        },
        role: {
          primary: 'var(--role-primary)',
          onPrimary: 'var(--role-onPrimary)',
          secondary: 'var(--role-secondary)',
          onSecondary: 'var(--role-onSecondary)',
          success: '#2E7D32',
          warning: '#D2942C',
          error: '#D14D57',
          info: '#2563EB',
        },
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        8: 'var(--radius-8)',
        12: 'var(--radius-12)',
        16: 'var(--radius-16)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        card: 'var(--shadow-md)',
      },
      transitionTimingFunction: {
        brand: 'var(--easing-standard)',
      },
      transitionDuration: {
        hover: 'var(--motion-hover)',
        card: 'var(--motion-card)',
      },
    },
  },
  plugins: [],
};
