import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
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
      },
      borderRadius: {
        8: 'var(--radius-8)',
        12: 'var(--radius-12)',
        16: 'var(--radius-16)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
};

export default config;

