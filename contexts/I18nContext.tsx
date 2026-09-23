import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from './AuthContext';
import {
  DEFAULT_APP_LANGUAGE,
  type AppLanguage,
  normalizeAppLanguage,
} from '../lib/i18n/languages';
import { translateUi, type UiKey, type UiVars } from '../lib/i18n/ui';

const STORAGE_KEY = 'sr.preferred_language';

type I18nContextValue = {
  language: AppLanguage;
  setLanguagePreview: (language: AppLanguage) => void;
  t: (key: UiKey, vars?: UiVars) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [stored, setStored] = useState<AppLanguage>(DEFAULT_APP_LANGUAGE);
  const [preview, setPreview] = useState<AppLanguage | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value) setStored(normalizeAppLanguage(value));
    });
  }, []);

  const fromProfile = profile?.preferred_language
    ? normalizeAppLanguage(profile.preferred_language)
    : null;

  const language = preview ?? fromProfile ?? stored;

  useEffect(() => {
    if (!fromProfile) return;
    setStored(fromProfile);
    void AsyncStorage.setItem(STORAGE_KEY, fromProfile);
  }, [fromProfile]);

  const setLanguagePreview = useCallback((next: AppLanguage) => {
    const lang = normalizeAppLanguage(next);
    setPreview(lang);
    setStored(lang);
    void AsyncStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = useCallback(
    (key: UiKey, vars?: UiVars) => translateUi(language, key, vars),
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguagePreview, t }),
    [language, setLanguagePreview, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      language: DEFAULT_APP_LANGUAGE,
      setLanguagePreview: () => undefined,
      t: (key, vars) => translateUi(DEFAULT_APP_LANGUAGE, key, vars),
    };
  }
  return ctx;
}
