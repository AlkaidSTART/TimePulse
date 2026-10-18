import type { Timer } from '../../domain/timer';
import type { TodoItem } from '../../features/todo/types';
import type { StoredImage, TimePulseDatabase } from './types';

const DATABASE_NAME = 'TimePulseDB';
const DATABASE_VERSION = 3;

/** IndexedDB 对象仓库名，与 SQLite 表名保持语义一致 */
export const STORE_NAMES = {
  backgrounds: 'custom_backgrounds',
  timers: 'timers',
  state: 'state',
  todos: 'todos',
} as const;

/** 列表类数据附加的排序字段，读取时会被剥离，避免泄漏到领域模型 */
const ORDER_FIELD = '__order';

let databasePromise: Promise<IDBDatabase> | null = null;

/**
 * 打开共享的 TimePulseDB 连接。
 * 所有经过 IndexedDB 的模块都必须使用这个 opener，避免版本号不一致导致 VersionError。
 * - v1 → v2：新增 timers / state 仓库
 * - v2 → v3：新增 todos 仓库
 */
export function openTimePulseIndexedDb(): Promise<IDBDatabase> {
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
        if (!db.objectStoreNames.contains(STORE_NAMES.backgrounds)) {
          const store = db.createObjectStore(STORE_NAMES.backgrounds, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_NAMES.timers)) {
          db.createObjectStore(STORE_NAMES.timers, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_NAMES.state)) {
          db.createObjectStore(STORE_NAMES.state);
        }
        if (!db.objectStoreNames.contains(STORE_NAMES.todos)) {
          db.createObjectStore(STORE_NAMES.todos, { keyPath: 'id' });
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

/** 按写入顺序还原列表，并剥离内部排序字段 */
function restoreOrderedList<T extends { id: string }>(rows: Array<T & Record<string, unknown>>): T[] {
  return [...rows]
    .sort((a, b) => {
      const orderA = typeof a[ORDER_FIELD] === 'number' ? a[ORDER_FIELD] : Number.MAX_SAFE_INTEGER;
      const orderB = typeof b[ORDER_FIELD] === 'number' ? b[ORDER_FIELD] : Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    })
    .map((row) => {
      const { [ORDER_FIELD]: _order, ...rest } = row;
      return rest as T;
    });
}

/**
 * Web / PWA 数据库后端：IndexedDB。
 */
export class IndexedDbDatabase implements TimePulseDatabase {
  readonly kind = 'indexeddb' as const;

  async init(): Promise<void> {
    await openTimePulseIndexedDb();
  }

  async readTimers(): Promise<Timer[]> {
    const db = await openTimePulseIndexedDb();
    const rows = await requestToPromise(
      db.transaction(STORE_NAMES.timers, 'readonly').objectStore(STORE_NAMES.timers).getAll(),
    );
    return restoreOrderedList<Timer>(rows as Array<Timer & Record<string, unknown>>);
  }

  async writeTimers(timers: Timer[]): Promise<void> {
    const db = await openTimePulseIndexedDb();
    const transaction = db.transaction(STORE_NAMES.timers, 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.timers);
    store.clear();
    timers.forEach((timer, index) => store.put({ ...timer, [ORDER_FIELD]: index }));
    await transactionDone(transaction);
  }

  async readState<T>(key: string): Promise<T | null> {
    const db = await openTimePulseIndexedDb();
    const value: unknown = await requestToPromise(
      db.transaction(STORE_NAMES.state, 'readonly').objectStore(STORE_NAMES.state).get(key),
    );
    return value === undefined ? null : (value as T);
  }

  async writeState(key: string, value: unknown | null): Promise<void> {
    const db = await openTimePulseIndexedDb();
    const transaction = db.transaction(STORE_NAMES.state, 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.state);
    if (value === null) store.delete(key);
    else store.put(value, key);
    await transactionDone(transaction);
  }

  async readTodoItems(): Promise<TodoItem[]> {
    const db = await openTimePulseIndexedDb();
    const rows = await requestToPromise(
      db.transaction(STORE_NAMES.todos, 'readonly').objectStore(STORE_NAMES.todos).getAll(),
    );
    return restoreOrderedList<TodoItem>(rows as Array<TodoItem & Record<string, unknown>>);
  }

  async writeTodoItems(items: TodoItem[]): Promise<void> {
    const db = await openTimePulseIndexedDb();
    const transaction = db.transaction(STORE_NAMES.todos, 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.todos);
    store.clear();
    items.forEach((item, index) => store.put({ ...item, [ORDER_FIELD]: index }));
    await transactionDone(transaction);
  }

  async readBackgroundImages(): Promise<StoredImage[]> {
    const db = await openTimePulseIndexedDb();
    const rows = await requestToPromise(
      db.transaction(STORE_NAMES.backgrounds, 'readonly').objectStore(STORE_NAMES.backgrounds).getAll(),
    );
    return rows as StoredImage[];
  }

  async readBackgroundImage(id: string): Promise<StoredImage | null> {
    const db = await openTimePulseIndexedDb();
    const row: unknown = await requestToPromise(
      db.transaction(STORE_NAMES.backgrounds, 'readonly').objectStore(STORE_NAMES.backgrounds).get(id),
    );
    return (row as StoredImage | undefined) ?? null;
  }

  async writeBackgroundImage(image: StoredImage): Promise<void> {
    const db = await openTimePulseIndexedDb();
    const transaction = db.transaction(STORE_NAMES.backgrounds, 'readwrite');
    transaction.objectStore(STORE_NAMES.backgrounds).put(image);
    await transactionDone(transaction);
  }

  async deleteBackgroundImage(id: string): Promise<void> {
    const db = await openTimePulseIndexedDb();
    const transaction = db.transaction(STORE_NAMES.backgrounds, 'readwrite');
    transaction.objectStore(STORE_NAMES.backgrounds).delete(id);
    await transactionDone(transaction);
  }

  async clearBackgroundImages(): Promise<void> {
    const db = await openTimePulseIndexedDb();
    const transaction = db.transaction(STORE_NAMES.backgrounds, 'readwrite');
    transaction.objectStore(STORE_NAMES.backgrounds).clear();
    await transactionDone(transaction);
  }
}
