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
  white: '#FFFFFF',
};

// A plain dark mode: warm greys with no red cast, so it reads as night rather
// than as a second heritage theme. The brand's brown survives in the accent.
const dark: Palette = {
  canvas: '#15130F',
  surface: '#1F1C17',
  surfaceMuted: '#2B2721',
  ink: '#EFE9DF',
  inkMuted: '#A89F93',
  primary: '#C08E63',
  primaryPressed: '#A5764E',
  accent: '#D9B98C',
  accentSoft: '#2E2920',
  line: '#38332B',
  success: '#6FAF8B',
  successSoft: '#22362B',
  danger: '#E0766B',
  urgent: '#E0766B',
  important: '#E0A85F',
  later: '#8E867B',
  white: '#FFFFFF',
};

// Sampled from a بيت الشعر majlis: the near-black of the tent, the crimson of
// the carpets, cream from the sheepskin, and the camel and brass of the sadu
// weaving. Every pairing a screen actually renders clears WCAG AA.
const asiri: Palette = {
  canvas: '#150B0A',
  surface: '#21110F',
  surfaceMuted: '#2F1815',
  ink: '#F4EADF',
  inkMuted: '#C0A595',
  primary: '#9E2328',
  primaryPressed: '#781A1E',
  accent: '#C9A06A',
  accentSoft: '#3A1D19',
  line: '#3E221E',
  success: '#5A9676',
  successSoft: '#1F3A2D',
  danger: '#D15950',
  urgent: '#D15950',
  important: '#C9A06A',
  later: '#9B8378',
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
  dark: 'داكن محايد يريح العين ليلًا.',
  asiri: 'أحمر مستوحى من مجالس بيت الشعر.',
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
  asiri: 'light',
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
  const isDark = palette.canvas === asiri.canvas || palette.canvas === dark.canvas;
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
