import type { Config } from 'tailwindcss';

// Palette is the canonical dark navy + gold theme from the design prototype.
// See docs/design/README.md and docs/design/reference/EPAU_Workbench_v1.html.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-outfit)', 'Outfit', 'system-ui', 'sans-serif'],
        serif: ['var(--font-dm-serif)', '"DM Serif Display"', 'Georgia', 'serif'],
        mono: ['var(--font-jetbrains)', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink:  { 950: '#0A0E1A', 900: '#0E1424', 850: '#121A2E', 800: '#151B2E', 750: '#1B2340', 700: '#222A48' },
        gold: { 50: '#FBF4DC', 100: '#F0E3B4', 200: '#E4D084', 300: '#D4AF37', 400: '#C49A2A', 500: '#B8941F', 600: '#8F7218' },
        text: { primary: '#F2ECD9', secondary: '#C7C2B3', tertiary: '#8A8778', quat: '#5C5A52' },
        accent: {
          macro:    '#7AA7D9',
          prices:   '#EFC9B6',
          fiscal:   '#C8A87F',
          external: '#7FC29B',
          debt:     '#C89878',
          social:   '#B099D4',
          warn:     '#E0A050',
          danger:   '#E06C6C',
          success:  '#7FC29B',
        },
      },
    },
  },
  plugins: [],
};

export default config;
