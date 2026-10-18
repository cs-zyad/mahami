import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Palette, ThemeName, defaultTheme, shadowFor, themes } from '@/constants/design';

const STORAGE_KEY = 'mahami.theme';

type ThemeContextValue = {
  theme: ThemeName;
  palette: Palette;
  shadow: ReturnType<typeof shadowFor>;
  setTheme: (name: ThemeName) => void;
  /** False until the saved choice has been read, so nothing flashes the wrong theme. */
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeName(value: string | null): value is ThemeName {
  return value !== null && value in themes;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(defaultTheme);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (active && isThemeName(saved)) setThemeState(saved);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback((name: ThemeName) => {
    // Applied immediately; the write is a background detail the user never waits on.
    setThemeState(name);
    void AsyncStorage.setItem(STORAGE_KEY, name).catch(() => undefined);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      palette: themes[theme],
      shadow: shadowFor(themes[theme]),
      setTheme,
      ready,
    }),
    [theme, setTheme, ready],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}

type StyleFactory<T> = (palette: Palette, shadow: ReturnType<typeof shadowFor>) => T;

/**
 * StyleSheet.create runs once per module, which bakes in whichever palette was
 * active at import time. makeStyles defers it: the sheet is built per theme and
 * cached, so switching costs one build per theme and nothing after that.
 *
 *   const useStyles = makeStyles((P) => ({ row: { color: P.ink } }));
 *   const styles = useStyles();
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: StyleFactory<T>) {
  const cache = new Map<ThemeName, T>();

  return function useStyles(): T {
    const { theme, palette, shadow } = useTheme();
    return useMemo(() => {
      const cached = cache.get(theme);
      if (cached) return cached;
      const created = StyleSheet.create(factory(palette, shadow));
      cache.set(theme, created);
      return created;
    }, [theme, palette, shadow]);
  };
}
