import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, translations, Translations } from './translations';
import { apiUpdateLanguage } from '../services/api';

export type { Language, Translations };
export { translations };

export interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language, notify?: boolean) => void;
  toggleLanguage: () => void;
  t: Translations;
  formatCurrency: (amount: number) => string;
  formatLocalizedDate: (dateString?: string | null) => string;
}

export const I18nContext = createContext<I18nContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEYS = ['studymind_language', 'studysync_language'];

export function getInitialLanguage(): Language {
  try {
    for (const key of LANGUAGE_STORAGE_KEYS) {
      const saved = localStorage.getItem(key);
      if (saved === 'en' || saved === 'vi') return saved;
    }
  } catch {}
  return 'vi';
}

export const I18nProvider: React.FC<{ children: React.ReactNode; externalValue?: I18nContextType }> = ({
  children,
  externalValue,
}) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      for (const key of LANGUAGE_STORAGE_KEYS) {
        localStorage.setItem(key, lang);
      }
      document.documentElement.lang = lang;
    } catch {}

    // Persist to backend database if user is logged in
    try {
      apiUpdateLanguage(lang).catch(() => {});
    } catch {}
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'vi' ? 'en' : 'vi');
  }, [language, setLanguage]);

  const formatCurrency = useCallback(
    (amount: number) => {
      if (language === 'en') {
        const usd = (amount / 25000).toFixed(2);
        return `$${usd}`;
      }
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    },
    [language]
  );

  const formatLocalizedDate = useCallback(
    (dateString?: string | null) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      } catch {
        return dateString;
      }
    },
    [language]
  );

  if (externalValue) {
    return <I18nContext.Provider value={externalValue}>{children}</I18nContext.Provider>;
  }

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t: translations[language],
        formatCurrency,
        formatLocalizedDate,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    // Graceful fallback outside provider
    const fallbackLang = getInitialLanguage();
    return {
      language: fallbackLang,
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: translations[fallbackLang] || translations.vi,
      formatCurrency: (amt: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amt),
      formatLocalizedDate: (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : ''),
    };
  }
  return context;
}
