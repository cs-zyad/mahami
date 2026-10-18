// Every colour in the app comes from one of these palettes. The keys are
// identical across themes so a screen reads `P.ink` without caring which is
// active; adding a theme means adding one entry here and nothing else.
export type Palette = {
  canvas: string;
  surface: string;
  surfaceMuted: string;
  ink: string;
  inkMuted: string;
  primary: string;
  primaryPressed: string;
  accent: string;
  accentSoft: string;
  line: string;
  success: string;
  successSoft: string;
  danger: string;
  urgent: string;
  important: string;
  later: string;
  /** Text and icons drawn on top of `primary`. */
  onPrimary: string;
  white: string;
};

const sand: Palette = {
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
  onPrimary: '#FFFFFF',
  white: '#FFFFFF',
};

// A conventional dark mode, blue-leaning. Material's guidance is a dark grey
// base rather than pure black — black hides elevation and the contrast against
// white text is harsher than it needs to be — with surfaces that lighten as
// they rise and accents that are desaturated rather than vivid.
const dark: Palette = {
  canvas: '#121418',
  surface: '#1B1F26',
  surfaceMuted: '#262B34',
  ink: '#E8EBF0',
  inkMuted: '#9AA3B2',
  primary: '#6E9BD8',
  primaryPressed: '#5781BC',
  accent: '#8FB8E8',
  accentSoft: '#1F2733',
  line: '#323945',
  success: '#6FB48F',
  successSoft: '#1D3329',
  danger: '#E0796F',
  urgent: '#E0796F',
  important: '#E0A95F',
  later: '#7E8798',
  onPrimary: '#121418',
  white: '#FFFFFF',
};

// The majlis in daylight: the cream of the sheepskin as the ground, the crimson
// of the carpets as the primary, brass from the sadu as the accent. A light
// theme like sand, not a second dark one — the sadu banding carries the
// heritage rather than the background.
const asiri: Palette = {
  canvas: '#FBF4E9',
  surface: '#FFFCF6',
  surfaceMuted: '#F2E6D4',
  ink: '#2A1A16',
  inkMuted: '#6E5A50',
  primary: '#9E2328',
  primaryPressed: '#7C181D',
  accent: '#8A5E1F',
  accentSoft: '#F3DFC8',
  line: '#E3D2BC',
  success: '#44705A',
  successSoft: '#DCE8DF',
  danger: '#A32F28',
  urgent: '#A32F28',
  important: '#8A5E1F',
  later: '#8D7F72',
  onPrimary: '#FFFFFF',
  white: '#FFFFFF',
};

export const themes = { sand, dark, asiri } satisfies Record<string, Palette>;

export type ThemeName = keyof typeof themes;

export const themeOrder: ThemeName[] = ['sand', 'dark', 'asiri'];

export const themeLabels: Record<ThemeName, string> = {
  sand: 'الرملي',
  dark: 'الداكن',
  asiri: 'العسيري',
};

export const themeDescriptions: Record<ThemeName, string> = {
  sand: 'فاتح وهادئ، المظهر الأساسي.',
  dark: 'أزرق ليلي يريح العين.',
  asiri: 'كريمي دافئ بلمسات حمراء وزخارف السدو.',
};

// Only the heritage theme carries the sadu banding; the other two stay plain.
export const themeOrnament: Record<ThemeName, boolean> = {
  sand: false,
  dark: false,
  asiri: true,
};

// A dark palette needs the light status bar glyphs and vice versa.
export const themeStatusBar: Record<ThemeName, 'light' | 'dark'> = {
  sand: 'dark',
  dark: 'light',
  asiri: 'dark',
};

export const defaultTheme: ThemeName = 'sand';

export const Radius = {
  small: 12,
  medium: 18,
  large: 26,
  pill: 999,
} as const;

export function shadowFor(palette: Palette) {
  // The sand theme lifts cards off a light canvas; on a near-black one the same
  // shadow is invisible, so it leans harder and darker to keep the edge.
  const isDark = palette.canvas === dark.canvas;
  return {
    card: {
      shadowColor: isDark ? '#000000' : '#493326',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.45 : 0.08,
      shadowRadius: 24,
      elevation: 3,
    },
  } as const;
}

export const Shadow = shadowFor(sand);
