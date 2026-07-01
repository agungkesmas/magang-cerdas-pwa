import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        bpjs: {
          blue: '#003F7F',
          'blue-light': '#0066CC',
          'blue-dark': '#002A5C',
          yellow: '#FFD200',
          'yellow-dark': '#E6BC00',
          green: '#00A859',
          'green-dark': '#008C4A',
          red: '#E94E4E'
        },
        agent: {
          bg: '#0A0E1A',
          card: '#131829',
          'card-light': '#1A2138',
          border: '#252D44',
          accent: '#FFD200',
          'accent-glow': 'rgba(255, 210, 0, 0.4)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'bounce-small': 'bounce-small 1s ease infinite'
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 210, 0, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 210, 0, 0.6)' }
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'bounce-small': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' }
        }
      }
    }
  },
  plugins: []
};
export default config;
