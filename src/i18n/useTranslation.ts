import { useCallback, useEffect, useState } from 'react';
import { normalizeLanguage, type Language } from './types';
import defaultZhTranslations from '../../public/locales/zh/common.json';
import defaultEnTranslations from '../../public/locales/en/common.json';

type TranslationTree = Record<string, unknown>;
type TranslationFunction = (key: string, defaultValue?: string) => string;

const staticTranslations: Record<Language, TranslationTree> = {
  'zh-CN': defaultZhTranslations as TranslationTree,
  'en-US': defaultEnTranslations as TranslationTree,
};

function getLanguage(): Language {
  if (typeof window === 'undefined') return 'zh-CN';
  return normalizeLanguage(new URLSearchParams(window.location.search).get('lang'));
}

function getNestedValue(tree: TranslationTree, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (typeof current !== 'object' || current === null) return null;
    return key in current ? (current as Record<string, unknown>)[key] : null;
  }, tree);
}

export function useTranslation(): {
  t: TranslationFunction;
  currentLang: Language;
  changeLanguage: (language: Language) => void;
  isLoading: boolean;
} {
  const [currentLang, setCurrentLang] = useState<Language>(() => getLanguage());
  const [translations, setTranslations] = useState<TranslationTree>(() => {
    const lang = getLanguage();
    return staticTranslations[lang] ?? (defaultZhTranslations as TranslationTree);
  });
  const isLoading = false;

  useEffect(() => {
    const lang = getLanguage();
    setCurrentLang(lang);
    setTranslations(staticTranslations[lang] ?? (defaultZhTranslations as TranslationTree));
  }, []);

  const t = useCallback<TranslationFunction>((key, defaultValue = '') => {
    const value = getNestedValue(translations, key);
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
    return defaultValue || key;
  }, [translations]);

  const changeLanguage = (language: Language) => {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', language);
    window.location.href = url.toString();
  };

  return { t, currentLang, changeLanguage, isLoading };
}
