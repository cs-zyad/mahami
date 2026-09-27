export const Palette = {
  canvas: '#F6F1E8',
  surface: '#FFFDFC',
  surfaceMuted: '#EEE5D7',
  ink: '#2E241D',
  inkMuted: '#75675C',
  primary: '#6D4935',
  primaryPressed: '#563827',
  accent: '#B9825A',
  accentSoft: '#E9D6C4',
  line: '#DED2C4',
  success: '#4E725B',
  successSoft: '#DBE7DD',
  danger: '#9D4D43',
  urgent: '#A9493D',
  important: '#C47A3C',
  later: '#9A8E82',
  white: '#FFFFFF',
} as const;

export const Radius = {
  small: 12,
  medium: 18,
  large: 26,
  pill: 999,
} as const;

export const Shadow = {
  card: {
    shadowColor: '#493326',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  },
} as const;
