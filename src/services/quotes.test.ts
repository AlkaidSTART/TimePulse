import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  formatQuoteAuthor,
  formatQuoteForCopy,
  getCachedQuotes,
  saveQuotesToCache,
  fetchQuotesFromDatabase,
  loadInspirationalQuotes,
  LOCAL_STORAGE_QUOTES_KEY,
  LOCAL_STORAGE_QUOTES_TIMESTAMP_KEY,
} from './quotes';
import { INSPIRATIONAL_QUOTES, type InspirationalQuote } from '@/features/cheer/cheerData';
import { supabase } from '@/lib/supabase';

describe('Quotes Service (灵感名言服务)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('formatQuoteAuthor', () => {
    it('formats author and source with book brackets when both exist', () => {
      const formatted = formatQuoteAuthor({
        text: '满地都是六便士...',
        author: '毛姆',
        source: '月亮与六便士',
      });
      expect(formatted).toBe('毛姆 · 《月亮与六便士》');
    });

    it('returns author alone when source is absent', () => {
      const formatted = formatQuoteAuthor({
        text: '生活不在别处...',
        author: '汪曾祺',
      });
      expect(formatted).toBe('汪曾祺');
    });

    it('returns book title when author is absent but source is present', () => {
      const formatted = formatQuoteAuthor({
        text: '古语一言...',
        author: '',
        source: '古谚',
      });
      expect(formatted).toBe('《古谚》');
    });

    it('falls back to "佚名" when both author and source are missing', () => {
      expect(formatQuoteAuthor({ text: '无名金句', author: '' })).toBe('佚名');
      expect(formatQuoteAuthor(null)).toBe('');
    });
  });

  describe('formatQuoteForCopy', () => {
    it('creates beautiful share text with quotes and author attribution', () => {
      const copyText = formatQuoteForCopy({
        text: '竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。',
        author: '苏轼',
        source: '定风波',
      });
      expect(copyText).toBe('“竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。” —— 苏轼 · 《定风波》');
    });

    it('returns empty string if quote is null or undefined', () => {
      expect(formatQuoteForCopy(null)).toBe('');
    });
  });

  describe('Caching & Storage (本地缓存与容灾)', () => {
    it('returns static INSPIRATIONAL_QUOTES when cache is empty', () => {
      const quotes = getCachedQuotes();
      expect(quotes).toEqual(INSPIRATIONAL_QUOTES);
    });

    it('saves and restores quotes from localStorage', () => {
      const sampleQuotes: InspirationalQuote[] = [
        { text: '测试名言一', author: '测试作者一' },
        { text: '测试名言二', author: '测试作者二', source: '测试出处' },
      ];

      saveQuotesToCache(sampleQuotes);

      const raw = localStorage.getItem(LOCAL_STORAGE_QUOTES_KEY);
      expect(raw).toBeTruthy();
      expect(localStorage.getItem(LOCAL_STORAGE_QUOTES_TIMESTAMP_KEY)).toBeTruthy();

      const retrieved = getCachedQuotes();
      expect(retrieved).toEqual(sampleQuotes);
    });

    it('handles corrupted localStorage JSON gracefully', () => {
      localStorage.setItem(LOCAL_STORAGE_QUOTES_KEY, 'invalid-json{{{');
      const retrieved = getCachedQuotes();
      expect(retrieved).toEqual(INSPIRATIONAL_QUOTES);
    });
  });

  describe('fetchQuotesFromDatabase & loadInspirationalQuotes', () => {
    it('loads quotes from Supabase and updates cache', async () => {
      const mockQuotes: InspirationalQuote[] = [
        { text: '云端名言1', author: '作者1', source: '出处1', category: 'life' },
        { text: '云端名言2', author: '作者2', source: '出处2', category: 'growth' },
      ];

      vi.spyOn(supabase, 'from').mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce({
          data: mockQuotes,
          error: null,
        }),
      } as unknown as ReturnType<typeof supabase.from>);

      const result = await loadInspirationalQuotes({ forceRefresh: true });
      expect(result).toEqual(mockQuotes);

      // Verify localStorage was updated
      const cached = getCachedQuotes();
      expect(cached).toEqual(mockQuotes);
    });

    it('falls back seamlessly to local cache when cloud query fails', async () => {
      const fallbackQuotes: InspirationalQuote[] = [
        { text: '本地兜底名言', author: '本地作者' },
      ];
      saveQuotesToCache(fallbackQuotes);

      vi.spyOn(supabase, 'from').mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Database query network failed' },
        }),
      } as unknown as ReturnType<typeof supabase.from>);

      const result = await loadInspirationalQuotes({ forceRefresh: true });
      expect(result).toEqual(fallbackQuotes);
    });

    it('handles database fetch timeout gracefully', async () => {
      vi.spyOn(supabase, 'from').mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementationOnce(
          () => new Promise((resolve) => setTimeout(resolve, 500))
        ),
      } as unknown as ReturnType<typeof supabase.from>);

      const result = await fetchQuotesFromDatabase({ timeoutMs: 20 });
      expect(result).toBeNull();
    });
  });
});
