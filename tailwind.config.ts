import type { Config } from 'tailwindcss';
import { tokens } from './design-system/tokens';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './design-system/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        black: tokens.colors.black,
        white: tokens.colors.white,
        coral: {
          DEFAULT: tokens.colors.coral,
          hover: tokens.colors.coralHover,
        },
        gray: {
          100: tokens.colors.gray100,
          200: tokens.colors.gray200,
          400: tokens.colors.gray400,
        },
        error: tokens.colors.error,
        success: tokens.colors.success,
      },
      fontFamily: {
        heading: ['Montserrat', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: tokens.fontSizes,
      spacing: tokens.spacing,
      borderRadius: tokens.radii,
      boxShadow: tokens.shadows,
    },
  },
  plugins: [],
};

export default config;
