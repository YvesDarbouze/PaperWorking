import type { Config } from 'tailwindcss';

/**
 * PaperWorking Design Tokens — "Bloomberg Terminal for Real Estate Investment"
 * Dark, dense, professional.
 * All palette and dimensional tokens are bound to CSS variables for seamless theme toggling.
 */
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        app: 'var(--bg-app)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        'border-subtle': 'var(--border-subtle)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          active: 'var(--accent-active)',
          subtle: 'var(--accent-subtle)',
        },
        'status-live': 'var(--status-live)',
        'status-caution': 'var(--status-caution)',
        danger: {
          DEFAULT: 'var(--danger)',
          subtle: 'var(--danger-subtle)',
        },
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        'elevation-subtle': 'var(--shadow-elevation-subtle)',
        'elevation-card': 'var(--shadow-elevation-card)',
        'elevation-modal': 'var(--shadow-elevation-modal)',
        'accent-glow': 'var(--shadow-accent-glow)',
      },
      fontSize: {
        display: [
          'var(--font-display-size)',
          {
            lineHeight: 'var(--font-display-leading)',
            letterSpacing: 'var(--font-display-tracking)',
            fontWeight: 'var(--font-display-weight)',
          },
        ],
        title: [
          'var(--font-title-size)',
          {
            lineHeight: 'var(--font-title-leading)',
            fontWeight: 'var(--font-title-weight)',
          },
        ],
        body: [
          'var(--font-body-size)',
          {
            lineHeight: 'var(--font-body-leading)',
            fontWeight: 'var(--font-body-weight)',
          },
        ],
        caption: [
          'var(--font-caption-size)',
          {
            lineHeight: 'var(--font-caption-leading)',
            letterSpacing: 'var(--font-caption-tracking)',
            fontWeight: 'var(--font-caption-weight)',
          },
        ],
      },
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '14': '56px',
        '16': '64px',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        med: 'var(--duration-med)',
        slow: 'var(--duration-slow)',
      },
      transitionTimingFunction: {
        entrance: 'var(--ease-entrance)',
        move: 'var(--ease-move)',
      },
    },
  },
  plugins: [],
};

export default config;
