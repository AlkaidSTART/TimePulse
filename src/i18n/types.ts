export type Language = 'zh-CN' | 'en-US';

export function normalizeLanguage(value: string | null | undefined): Language {
  if (!value) return 'zh-CN';
  if (value === 'en-US' || value === 'en' || value.toLowerCase().startsWith('en')) {
    return 'en-US';
  }
  return 'zh-CN';
}
