import type { BackgroundSettings, FullscreenSettings } from '../domain/settings';
import type { Timer } from '../domain/timer';
import { parseTimers } from '../domain/timer';
import { getDatabase } from './db';

export const STORAGE_KEYS = {
  // 计时器数据主存储位于平台数据库；这两个键作为旧数据迁移来源与降级备份保留
  timers: 'timers',
  activeTimerId: 'activeTimerId',
  theme: 'theme',
  accentColor: 'accent-color',
  background: 'timepulse_background_settings',
  fullscreen: 'timepulse_fullscreen_settings',
  notificationPreference: 'timepulse_notification_preference',
} as const;

const ACTIVE_TIMER_ID_KEY = 'activeTimerId';

function getSafeStorage(storage?: Storage | null): Storage | null {
  if (storage) return storage;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    // ignore
  }
  return null;
}

function readLegacyTimers(storage?: Storage | null): Timer[] {
  const s = getSafeStorage(storage);
  if (!s) return [];
  try {
    const raw = s.getItem(STORAGE_KEYS.timers);
    return raw ? parseTimers(JSON.parse(raw)) : [];
  } catch (error) {
    console.error('读取旧版 localStorage 计时器失败:', error);
    return [];
  }
}

/**
 * 同步从 localStorage 缓存中读取计时器，供 store 首屏预水合使用
 */
export function readCachedTimers(storage?: Storage | null): Timer[] {
  return readLegacyTimers(storage);
}

/**
 * 同步从 localStorage 缓存中读取活动计时器 ID
 */
export function readCachedActiveTimerId(storage?: Storage | null): string | null {
  const s = getSafeStorage(storage);
  if (!s) return null;
  try {
    return s.getItem(STORAGE_KEYS.activeTimerId);
  } catch (error) {
    console.warn('读取 localStorage 缓存活动计时器失败:', error);
    return null;
  }
}

function writeLegacyValue(key: string, value: string | null): void {
  try {
    const s = getSafeStorage();
    if (!s) return;
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch (error) {
    console.warn(`写入 localStorage 备份 ${key} 失败:`, error);
  }
}

export function readJson<T>(key: string, fallback: T, storage?: Storage | null): T {
  const s = getSafeStorage(storage);
  if (!s) return fallback;
  try {
    const raw = s.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return parsed as T;
  } catch (error) {
    console.error(`读取 ${key} 失败:`, error);
    return fallback;
  }
}

export function readSettings<T extends BackgroundSettings | FullscreenSettings>(
  key: string,
  fallback: T,
  storage?: Storage | null,
): T {
  const value = readJson<unknown>(key, fallback, storage);
  if (typeof value !== 'object' || value === null) return fallback;
  return { ...fallback, ...(value as Partial<T>) };
}

/**
 * 读取全部计时器（Web: IndexedDB / 原生: SQLite）。
 * 数据库为空时执行一次性迁移：从 localStorage 旧键导入，同时返回导入结果。
 */
export async function readTimers(): Promise<Timer[]> {
  try {
    const stored = await getDatabase().readTimers();
    const timers = parseTimers(stored);
    if (timers.length > 0) return timers;

    const legacyTimers = readLegacyTimers();
    if (legacyTimers.length > 0) {
      console.log(`[存储] 迁移 ${legacyTimers.length} 个旧版 localStorage 计时器到数据库`);
      await writeTimers(legacyTimers);
      return legacyTimers;
    }
    return [];
  } catch (error) {
    console.error('[存储] 数据库读取计时器失败，回退到 localStorage:', error);
    return readLegacyTimers();
  }
}

/**
 * 覆盖写入全部计时器。数据库为唯一数据源，localStorage 仅保留降级备份。
 */
export async function writeTimers(timers: Timer[]): Promise<void> {
  try {
    await getDatabase().writeTimers(timers);
  } catch (error) {
    console.error('[存储] 数据库写入计时器失败，回退到 localStorage:', error);
  } finally {
    writeLegacyValue(STORAGE_KEYS.timers, JSON.stringify(timers));
  }
}

const TIMERS_WRITE_DEBOUNCE_MS = 300;

let pendingTimersWrite: Timer[] | null = null;
let pendingTimersWriteTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 合并高频计时器写入（例如拖动颜色滑杆时的连续更新）：
 * 至多每 300ms 落库一次，最后一批数据等待防抖窗口结束后写入。
 */
export function scheduleTimersWrite(timers: Timer[]): void {
  pendingTimersWrite = timers;
  if (pendingTimersWriteTimer !== null) return;
  pendingTimersWriteTimer = setTimeout(() => {
    flushTimersWrite();
  }, TIMERS_WRITE_DEBOUNCE_MS);
}

/**
 * 立即冲刷尚未写入的计时器数据（页面隐藏/关闭前调用，避免数据丢失）。
 */
export function flushTimersWrite(): void {
  if (pendingTimersWriteTimer !== null) {
    clearTimeout(pendingTimersWriteTimer);
    pendingTimersWriteTimer = null;
  }
  const timers = pendingTimersWrite;
  if (!timers) return;
  pendingTimersWrite = null;
  void writeTimers(timers);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushTimersWrite);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushTimersWrite();
    }
  });
}

export async function readActiveTimerId(): Promise<string | null> {
  try {
    const value = await getDatabase().readState<unknown>(ACTIVE_TIMER_ID_KEY);
    if (typeof value === 'string') return value;

    const s = getSafeStorage();
    const legacyId = s ? s.getItem(STORAGE_KEYS.activeTimerId) : null;
    if (legacyId) {
      await writeActiveTimerId(legacyId);
      return legacyId;
    }
    return null;
  } catch (error) {
    console.error('[存储] 数据库读取活动计时器失败，回退到 localStorage:', error);
    try {
      const s = getSafeStorage();
      return s ? s.getItem(STORAGE_KEYS.activeTimerId) : null;
    } catch {
      return null;
    }
  }
}

export async function writeActiveTimerId(id: string | null): Promise<void> {
  try {
    await getDatabase().writeState(ACTIVE_TIMER_ID_KEY, id);
  } catch (error) {
    console.error('[存储] 数据库写入活动计时器失败，回退到 localStorage:', error);
  } finally {
    writeLegacyValue(ACTIVE_TIMER_ID_KEY, id);
  }
}
