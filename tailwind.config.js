/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './ggroid/src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './ggroid/src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './ggroid/src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        r2: {
          primary: 'var(--r2-primary)',
          secondary: 'var(--r2-secondary)',
          accent: 'var(--r2-accent)',
          'bg-dark': 'var(--r2-bg-dark)',
          'bg-light': 'var(--r2-bg-light)',
        }
      },
    },
  },
  plugins: [],
}

