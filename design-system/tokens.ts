// design-system/tokens.ts
export const tokens = {
  colors: {
    black: '#0A0A0A',
    white: '#F5F5F5',
    coral: '#FF6B55', // accent ~10% usage
    coralHover: '#E55A44',
    gray100: '#1A1A1A', // card backgrounds
    gray200: '#2A2A2A', // borders
    gray400: '#666666', // muted text
    error: '#FF4444',
    success: '#44FF88',
  },
  fonts: {
    heading: "'Montserrat', sans-serif",
    body: "'Inter', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '2rem',
  },
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    6: '24px',
    8: '32px',
    12: '48px',
    16: '64px',
  },
  radii: { none: '0', sm: '2px', md: '4px' }, // brutalist: minimal radius
  shadows: { none: 'none', hard: '4px 4px 0px #FF6B55' }, // brutalist hard shadow with coral
} as const;
