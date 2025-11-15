export type ThemeMode = 'light' | 'dark'

export type ThemeTokens = typeof designTokens & {
  mode: ThemeMode
  palette: typeof palettes.light
}

const palettes = {
  light: {
    background: '#FBEBC9', // Ivory Sand
    surface: '#FFF6E3',
    surfaceMuted: '#F3DFC0',
    textPrimary: '#3D3F24', // Olive Noir
    textSecondary: '#865535', // Chestnut Brown
    accent: '#C48D49', // Amber Gold
    accentStrong: '#865535', // Chestnut Brown
    border: '#E4CDA3',
    success: '#4C8C2B',
    danger: '#B53D2A',
  },
  dark: {
    background: '#3D3F24', // Olive Noir
    surface: '#2A2B17',
    surfaceMuted: '#443C24',
    textPrimary: '#FBEBC9', // Ivory Sand
    textSecondary: '#E8D8B9',
    accent: '#C48D49', // Amber Gold
    accentStrong: '#F5C177',
    border: '#564531',
    success: '#8BC34A',
    danger: '#F78C6B',
  },
}

const designTokens = {
  font: {
    family: "'Lora', 'Noto Naskh Arabic', 'Georgia', serif",
    heading:
      "'Parliament', 'Cairo', 'Lora', 'Noto Naskh Arabic', serif",
    weight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    size: {
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.25rem',
      xl: '1.5rem',
      display: '2.5rem',
    },
    lineHeight: {
      snug: 1.2,
      normal: 1.5,
      relaxed: 1.65,
    },
  },
  spacing: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
  },
  radii: {
    sm: '8px',
    md: '16px',
    lg: '24px',
    pill: '999px',
  },
  shadow: {
    soft: '0 10px 30px rgba(15, 23, 42, 0.08)',
    medium: '0 20px 45px rgba(15, 23, 42, 0.12)',
  },
  layout: {
    maxWidth: '520px',
  },
} as const

export const getTheme = (mode: ThemeMode): ThemeTokens => ({
  ...designTokens,
  mode,
  palette: palettes[mode],
})

