import type { Config } from 'tailwindcss'

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./pages/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        border: 'var(--border)',
        ink: 'var(--ink)',
        subtle: 'var(--subtle-ink)',
        accent: { DEFAULT: 'var(--accent)', 50: 'var(--accent-50)' },
        success: { 50:'var(--success-50)', 500:'var(--success-500)' },
        warning: { 50:'var(--warning-50)', 500:'var(--warning-500)' },
        error:   { 50:'var(--error-50)',   500:'var(--error-500)' },
        info:    { 50:'var(--info-50)',    500:'var(--info-500)' },
      },
      fontFamily: { sans: ['Inter','system-ui','-apple-system','Segoe UI','Roboto','Arial','sans-serif'] },
      boxShadow: { sm:'var(--shadow-sm)', md:'var(--shadow-md)', lg:'var(--shadow-lg)' },
      borderRadius: { sm:'var(--radius-sm)', md:'var(--radius-md)', lg:'var(--radius-lg)' },
    }
  },
  plugins: []
}
export default config
