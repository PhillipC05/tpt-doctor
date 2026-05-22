import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../lib/i18n';

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'zh' | 'ar';

interface LanguageState {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (lang: SupportedLanguage) => {
        i18n.changeLanguage(lang);
        // Set dir attribute for RTL support
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        set({ language: lang });
      },
    }),
    {
      name: 'tpt-language',
      partialize: (state) => ({ language: state.language }),
    }
  )
);

// Initialize
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('tpt-language');
  const lang = stored ? (JSON.parse(stored).language as SupportedLanguage) : 'en';
  i18n.changeLanguage(lang);
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}