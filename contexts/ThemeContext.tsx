import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  getRecallionColors,
  resolveThemePreference,
  type RecallionColors,
  type ThemePreference,
} from '../lib/recallionTheme';

const STORAGE_KEY = 'sermon-recall-mobile-theme';

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: 'light' | 'dark';
  colors: RecallionColors;
  ready: boolean;
  setPreference: (next: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw === 'light' || raw === 'dark' || raw === 'system') {
          setPreferenceState(raw);
        }
      } catch {
        /* ignore */
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const resolved = useMemo(() => {
    const scheme = systemScheme === 'light' ? 'light' : 'dark';
    return resolveThemePreference(preference, scheme);
  }, [preference, systemScheme]);

  const colors = useMemo(() => getRecallionColors(resolved), [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, colors, ready, setPreference }),
    [preference, resolved, colors, ready, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useRecallionTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useRecallionTheme must be used within ThemeProvider');
  }
  return ctx;
}
