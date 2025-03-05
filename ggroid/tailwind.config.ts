import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
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
};

export default config;