import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--background) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-secondary': 'rgb(var(--surface-secondary) / <alpha-value>)',
        'surface-hover': 'rgb(var(--surface-hover) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        'text-primary': 'rgb(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-secondary': 'rgb(var(--accent-secondary) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        income: 'rgb(var(--income) / <alpha-value>)',
        expense: 'rgb(var(--expense) / <alpha-value>)'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
        10: 'var(--space-10)',
        12: 'var(--space-12)',
        'icon-sm': 'var(--icon-sm)',
        'icon-md': 'var(--icon-md)',
        'icon-lg': 'var(--icon-lg)'
      },
      fontSize: {
        display: ['var(--font-size-display)', { lineHeight: 'var(--line-height-tight)' }],
        title: ['var(--font-size-title)', { lineHeight: 'var(--line-height-tight)' }],
        heading: ['var(--font-size-heading)', { lineHeight: 'var(--line-height-snug)' }],
        body: ['var(--font-size-body)', { lineHeight: 'var(--line-height-relaxed)' }],
        caption: ['var(--font-size-caption)', { lineHeight: 'var(--line-height-normal)' }]
      },
      borderRadius: {
        control: 'var(--radius-control)',
        panel: 'var(--radius-panel)'
      },
      borderWidth: {
        DEFAULT: 'var(--border-thin)'
      },
      boxShadow: {
        panel: 'var(--shadow-panel)',
        elevated: 'var(--shadow-elevated)',
        glow: 'var(--shadow-glow)'
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)'
      },
      backgroundImage: {
        'accent-gradient': 'var(--gradient-accent)',
        'accent-gradient-soft': 'var(--gradient-accent-soft)'
      }
    }
  },
  plugins: []
} satisfies Config;
