import { useCallback, useEffect, useState } from 'react';
import { normalizeLanguage, type Language } from './types';

type TranslationTree = Record<string, unknown>;
type TranslationFunction = (key: string, defaultValue?: string) => string;

const translationDataCache = new Map<string, TranslationTree>();
const pendingRequests = new Map<string, Promise<TranslationTree | null>>();

type EarlyLocaleGlobals = {
  __TIMEPULSE_EARLY_LOCALE__?: string;
  __TIMEPULSE_EARLY_LOCALE_PROMISE__?: Promise<unknown>;
};

/**
 * 消费 index.html 内联脚本提前发起的语言包请求（若有），只取一次
 */
function takeEarlyLocalePromise(locale: string): Promise<unknown> | null {
  if (typeof window === 'undefined') return null;
  const globals = window as unknown as EarlyLocaleGlobals;
  if (globals.__TIMEPULSE_EARLY_LOCALE__ !== locale) return null;
  const promise = globals.__TIMEPULSE_EARLY_LOCALE_PROMISE__ ?? null;
  delete globals.__TIMEPULSE_EARLY_LOCALE__;
  delete globals.__TIMEPULSE_EARLY_LOCALE_PROMISE__;
  return promise;
}

async function loadLocalePayload(locale: string): Promise<unknown> {
  const earlyPromise = takeEarlyLocalePromise(locale);
  if (earlyPromise) {
    const earlyValue = await earlyPromise;
    if (earlyValue !== null && earlyValue !== undefined) return earlyValue;
  }

  const response = await fetch(`/locales/${locale}/common.json`);
  if (!response.ok) throw new Error(`Failed to load ${locale} translations`);
  return response.json();
}

function getLanguage(): Language {
  if (typeof window === 'undefined') return 'zh-CN';
  return normalizeLanguage(new URLSearchParams(window.location.search).get('lang'));
}

async function loadLanguageFile(language: Language): Promise<TranslationTree | null> {
  const locale = language === 'en-US' ? 'en' : 'zh';
  if (translationDataCache.has(locale)) {
    return translationDataCache.get(locale)!;
  }
  if (pendingRequests.has(locale)) {
    return pendingRequests.get(locale)!;
  }

  const request = (async () => {
    try {
      const value: unknown = await loadLocalePayload(locale);
      if (typeof value === 'object' && value !== null) {
        const tree = value as TranslationTree;
        translationDataCache.set(locale, tree);
        return tree;
      }
      return null;
    } catch (error) {
      console.error('Failed to load language file:', error);
      return null;
    } finally {
      pendingRequests.delete(locale);
    }
  })();

  pendingRequests.set(locale, request);
  return request;
}

/**
 * Preloads translation file(s) into memory cache
 */
export async function preloadTranslations(language?: Language): Promise<TranslationTree | null> {
  const lang = language ?? getLanguage();
  return loadLanguageFile(lang);
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
  const localeKey = currentLang === 'en-US' ? 'en' : 'zh';
  const initialCached = translationDataCache.get(localeKey) ?? {};

  const [translations, setTranslations] = useState<TranslationTree>(initialCached);
  const [isLoading, setIsLoading] = useState(() => !translationDataCache.has(localeKey));

  useEffect(() => {
    let cancelled = false;
    const initializeTranslations = async () => {
      const language = getLanguage();
      setCurrentLang(language);
      const targetLocale = language === 'en-US' ? 'en' : 'zh';

      if (translationDataCache.has(targetLocale)) {
        if (!cancelled) {
          setTranslations(translationDataCache.get(targetLocale)!);
          setIsLoading(false);
        }
        return;
      }

      const translationData = await loadLanguageFile(language);
      const fallbackData = translationData ?? (await loadLanguageFile('zh-CN'));
      if (!cancelled && fallbackData) {
        setTranslations(fallbackData);
      }
      if (!cancelled) {
        setIsLoading(false);
      }
    };

    void initializeTranslations();
    return () => {
      cancelled = true;
    };
  }, []);

  const t = useCallback<TranslationFunction>(
    (key, defaultValue = '') => {
      const value = getNestedValue(translations, key);
      if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
      }
      return defaultValue || key;
    },
    [translations],
  );

  const changeLanguage = (language: Language) => {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', language);
    window.location.href = url.toString();
  };

  return { t, currentLang, changeLanguage, isLoading };
}
