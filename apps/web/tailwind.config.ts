import type { Config } from 'tailwindcss';

/**
 * PaperWorking Design Tokens — shadcn preset buFzlTs (radix-lyra / neutral)
 * Clean, architectural, data-dense.
 */
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './sections/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // shadcn radix-lyra neutral tokens
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
          hover: 'var(--accent)',
          active: 'var(--primary)',
          subtle: 'var(--muted)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',

        // Sidebar tokens
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
          primary: 'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent: 'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)',
        },

        // Legacy semantic mappings to neutral tokens
        app: 'var(--background)',
        surface: 'var(--card)',
        elevated: 'var(--muted)',
        'border-subtle': 'var(--border)',
        'text-primary': 'var(--foreground)',
        'text-secondary': 'var(--muted-foreground)',
        'text-muted': 'var(--muted-foreground)',
        'status-live': 'var(--status-live)',
        'status-caution': 'var(--status-caution)',
        danger: {
          DEFAULT: 'var(--destructive)',
          subtle: 'var(--danger-subtle)',
        },
      },
      borderRadius: {
        card: 'var(--radius)',
        control: '0px',
        pill: '0px',
        sm: 'calc(var(--radius) - 4px)',
        md: 'calc(var(--radius) - 2px)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
      },
      boxShadow: {
        'elevation-subtle': '0 1px 2px rgba(0, 0, 0, 0.08)',
        'elevation-card': '0 1px 3px rgba(0, 0, 0, 0.12)',
        'elevation-modal': '0 12px 32px rgba(0, 0, 0, 0.25)',
        'accent-glow': 'none',
      },
      fontSize: {
        display: [
          '1.5rem',
          {
            lineHeight: '1.2',
            letterSpacing: '-0.02em',
            fontWeight: '600',
          },
        ],
        title: [
          '0.875rem',
          {
            lineHeight: '1.25',
            fontWeight: '600',
          },
        ],
        body: [
          '0.8125rem',
          {
            lineHeight: '1.5',
            fontWeight: '400',
          },
        ],
        caption: [
          '0.6875rem',
          {
            lineHeight: '1',
            letterSpacing: '0.06em',
            fontWeight: '600',
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
