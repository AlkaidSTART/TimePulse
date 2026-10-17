import type { BackgroundSettings, FullscreenSettings } from '../domain/settings';
import type { Timer } from '../domain/timer';
import { parseTimers } from '../domain/timer';

const DATABASE_NAME = 'TimePulseDB';
const DATABASE_VERSION = 2;
const BACKGROUND_STORE = 'custom_backgrounds';
const TIMERS_STORE = 'timers';
const STATE_STORE = 'state';
const ACTIVE_TIMER_ID_KEY = 'activeTimerId';

export const STORAGE_KEYS = {
  // 计时器数据主存储已迁移至 IndexedDB；这两个键作为旧数据迁移来源与降级备份保留
  timers: 'timers',
  activeTimerId: 'activeTimerId',
  theme: 'theme',
  accentColor: 'accent-color',
  background: 'timepulse_background_settings',
  fullscreen: 'timepulse_fullscreen_settings',
  notificationPreference: 'timepulse_notification_preference',
} as const;

let databasePromise: Promise<IDBDatabase> | null = null;

/**
 * 打开共享的 TimePulseDB 连接（v2）。
 * 所有经过 IndexedDB 的模块都必须使用这个 opener，避免版本号不一致导致 VersionError。
 */
export function openTimePulseDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not supported in this environment'));
  }

  if (!databasePromise) {
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onerror = () => reject(request.error ?? new Error('无法打开 TimePulseDB'));
      request.onblocked = () => {
        console.warn('[存储] TimePulseDB 升级被其他标签页阻塞，请关闭旧标签页');
      };
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(BACKGROUND_STORE)) {
          const store = db.createObjectStore(BACKGROUND_STORE, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
        }
        if (!db.objectStoreNames.contains(TIMERS_STORE)) {
          db.createObjectStore(TIMERS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STATE_STORE)) {
          db.createObjectStore(STATE_STORE);
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          databasePromise = null;
        };
        db.onclose = () => {
          databasePromise = null;
        };
        resolve(db);
      };
    }).catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 请求失败'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB 事务失败'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB 事务已中止'));
  });
}

function readLegacyTimers(storage: Storage = localStorage): Timer[] {
  try {
    const raw = storage.getItem(STORAGE_KEYS.timers);
    return raw ? parseTimers(JSON.parse(raw)) : [];
  } catch (error) {
    console.error('读取旧版 localStorage 计时器失败:', error);
    return [];
  }
}

/**
 * 同步从 localStorage 缓存中读取计时器，供 store 首屏预水合使用
 */
export function readCachedTimers(storage: Storage = localStorage): Timer[] {
  return readLegacyTimers(storage);
}

/**
 * 同步从 localStorage 缓存中读取活动计时器 ID
 */
export function readCachedActiveTimerId(storage: Storage = localStorage): string | null {
  try {
    return storage.getItem(STORAGE_KEYS.activeTimerId);
  } catch (error) {
    console.warn('读取 localStorage 缓存活动计时器失败:', error);
    return null;
  }
}

function writeLegacyValue(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`写入 localStorage 备份 ${key} 失败:`, error);
  }
}

export function readJson<T>(key: string, fallback: T, storage: Storage = localStorage): T {
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return parsed as T;
  } catch (error) {
    console.error(`读取 ${key} 失败:`, error);
    return fallback;
  }
}

export function readSettings<T extends BackgroundSettings | FullscreenSettings>(key: string, fallback: T, storage: Storage = localStorage): T {
  const value = readJson<unknown>(key, fallback, storage);
  if (typeof value !== 'object' || value === null) return fallback;
  return { ...fallback, ...(value as Partial<T>) };
}

/**
 * 读取全部计时器。
 * IDB 为空时执行一次性迁移：从 localStorage 旧键导入，同时返回导入结果。
 */
export async function readTimers(): Promise<Timer[]> {
  try {
    const db = await openTimePulseDatabase();
    const stored = await requestToPromise(
      db.transaction(TIMERS_STORE, 'readonly').objectStore(TIMERS_STORE).getAll(),
    );
    const timers = parseTimers(stored);
    if (timers.length > 0) return timers;

    const legacyTimers = readLegacyTimers();
    if (legacyTimers.length > 0) {
      console.log(`[存储] 迁移 ${legacyTimers.length} 个旧版 localStorage 计时器到 IndexedDB`);
      await writeTimers(legacyTimers);
      return legacyTimers;
    }
    return [];
  } catch (error) {
    console.error('[存储] IndexedDB 读取计时器失败，回退到 localStorage:', error);
    return readLegacyTimers();
  }
}

/**
 * 覆盖写入全部计时器。IDB 为唯一数据源，localStorage 仅保留降级备份。
 */
export async function writeTimers(timers: Timer[]): Promise<void> {
  try {
    const db = await openTimePulseDatabase();
    const transaction = db.transaction(TIMERS_STORE, 'readwrite');
    const store = transaction.objectStore(TIMERS_STORE);
    store.clear();
    timers.forEach((timer) => store.put(timer));
    await transactionDone(transaction);
  } catch (error) {
    console.error('[存储] 写入 IndexedDB 计时器失败，回退到 localStorage:', error);
  } finally {
    writeLegacyValue(STORAGE_KEYS.timers, JSON.stringify(timers));
  }
}

export async function readActiveTimerId(): Promise<string | null> {
  try {
    const db = await openTimePulseDatabase();
    const value: unknown = await requestToPromise(
      db.transaction(STATE_STORE, 'readonly').objectStore(STATE_STORE).get(ACTIVE_TIMER_ID_KEY),
    );
    if (typeof value === 'string') return value;

    const legacyId = localStorage.getItem(STORAGE_KEYS.activeTimerId);
    if (legacyId) {
      await writeActiveTimerId(legacyId);
      return legacyId;
    }
    return null;
  } catch (error) {
    console.error('[存储] IndexedDB 读取活动计时器失败，回退到 localStorage:', error);
    return localStorage.getItem(STORAGE_KEYS.activeTimerId);
  }
}

export async function writeActiveTimerId(id: string | null): Promise<void> {
  try {
    const db = await openTimePulseDatabase();
    const transaction = db.transaction(STATE_STORE, 'readwrite');
    const store = transaction.objectStore(STATE_STORE);
    if (id === null) store.delete(ACTIVE_TIMER_ID_KEY);
    else store.put(id, ACTIVE_TIMER_ID_KEY);
    await transactionDone(transaction);
  } catch (error) {
    console.error('[存储] 写入 IndexedDB 活动计时器失败，回退到 localStorage:', error);
  } finally {
    writeLegacyValue(ACTIVE_TIMER_ID_KEY, id);
  }
}
