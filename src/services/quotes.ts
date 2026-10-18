import {
  INSPIRATIONAL_QUOTES,
  type InspirationalQuote,
} from '@/features/cheer/cheerData';

export type { InspirationalQuote };

export const INSPIRATIONAL_QUOTES_TABLE = 'inspirational_quotes';
export const LOCAL_STORAGE_QUOTES_KEY = 'timepulse_cached_quotes_v1';
export const LOCAL_STORAGE_QUOTES_TIMESTAMP_KEY = 'timepulse_cached_quotes_ts_v1';
export const DEFAULT_QUOTES_TIMEOUT_MS = 4000;
export const QUOTES_CACHE_STALE_MS = 60 * 60 * 1000; // 1小时缓存刷新窗口

type SupabaseModule = typeof import('@/lib/supabase');
let supabaseModulePromise: Promise<SupabaseModule | null> | null = null;

export function getSupabaseModule(): Promise<SupabaseModule | null> {
  supabaseModulePromise ??= import('@/lib/supabase').catch((err) => {
    console.warn('[Quotes] 加载 Supabase 模块失败:', err);
    return null;
  });
  return supabaseModulePromise;
}

/**
 * 格式化名言作者与出处
 * 示例:
 *   毛姆 + 月亮与六便士 => "毛姆 · 《月亮与六便士》"
 *   苏轼 => "苏轼"
 *   空 => "佚名"
 */
export function formatQuoteAuthor(quote?: InspirationalQuote | null): string {
  if (!quote) return '';
  const author = quote.author?.trim();
  const source = quote.source?.trim();

  if (author && source) {
    return `${author} · 《${source}》`;
  }
  if (author) {
    return author;
  }
  if (source) {
    return `《${source}》`;
  }
  return '佚名';
}

/**
 * 格式化用于复制的完整文本
 */
export function formatQuoteForCopy(quote?: InspirationalQuote | null): string {
  if (!quote) return '';
  const authorPart = formatQuoteAuthor(quote);
  return authorPart ? `“${quote.text}” —— ${authorPart}` : `“${quote.text}”`;
}

/**
 * 从本地缓存中安全读取名言列表，若无则返回本地兜底静态名言
 */
export function getCachedQuotes(): InspirationalQuote[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return INSPIRATIONAL_QUOTES;
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_QUOTES_KEY);
    if (!raw) return INSPIRATIONAL_QUOTES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // ignore parse error
  }
  return INSPIRATIONAL_QUOTES;
}

/**
 * 将获取到的名言安全持久化到本地存储
 */
export function saveQuotesToCache(quotes: InspirationalQuote[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (!Array.isArray(quotes) || quotes.length === 0) return;

  try {
    window.localStorage.setItem(LOCAL_STORAGE_QUOTES_KEY, JSON.stringify(quotes));
    window.localStorage.setItem(LOCAL_STORAGE_QUOTES_TIMESTAMP_KEY, String(Date.now()));
  } catch (err) {
    console.warn('[Quotes] 缓存名言到 localStorage 失败:', err);
  }
}

/**
 * 从 Supabase 数据库拉取全部已激活的名言金句
 */
export async function fetchQuotesFromDatabase(options?: {
  timeoutMs?: number;
  limit?: number;
}): Promise<InspirationalQuote[] | null> {
  const sb = await getSupabaseModule();
  if (!sb || !sb.isSupabaseConfigured) {
    return null;
  }

  const { supabase } = sb;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_QUOTES_TIMEOUT_MS;
  const limit = options?.limit ?? 300;

  const timeoutPromise = new Promise<null>((_, reject) => {
    const timer = setTimeout(() => {
      clearTimeout(timer);
      reject(new Error('云端名言库请求超时'));
    }, timeoutMs);
  });

  const queryPromise = (async (): Promise<InspirationalQuote[] | null> => {
    try {
      const { data, error } = await supabase
        .from(INSPIRATIONAL_QUOTES_TABLE)
        .select('id, text, author, source, category')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('[Quotes] 从云端数据库读取名言失败:', error.message);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      return data as InspirationalQuote[];
    } catch (err) {
      console.warn('[Quotes] 云端名言查询异常:', err);
      return null;
    }
  })();

  try {
    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (err) {
    console.warn('[Quotes] 获取云端名言超时或失败，平滑降级到本地缓存:', err);
    return null;
  }
}

/**
 * 综合加载名言库：
 * 优先读取本地缓存，后台异步或强制通过 Supabase 刷新并持久化
 */
export async function loadInspirationalQuotes(options?: {
  forceRefresh?: boolean;
  timeoutMs?: number;
}): Promise<InspirationalQuote[]> {
  const cached = getCachedQuotes();

  // 若不强制刷新且缓存很新鲜，可直接返回缓存（但依然支持在后台平滑同步）
  const dbQuotes = await fetchQuotesFromDatabase({
    timeoutMs: options?.timeoutMs,
  });

  if (dbQuotes && dbQuotes.length > 0) {
    saveQuotesToCache(dbQuotes);
    return dbQuotes;
  }

  return cached.length > 0 ? cached : INSPIRATIONAL_QUOTES;
}
