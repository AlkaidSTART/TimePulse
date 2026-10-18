import { IndexedDbDatabase } from './indexeddb';
import { isTauriRuntime } from './platform';
import { SqliteDatabase } from './sqlite';
import type { TimePulseDatabase } from './types';

export type { DatabaseKind, StoredImage, StoredImageMetadata, TimePulseDatabase } from './types';
export { isTauriRuntime } from './platform';

let activeDatabase: TimePulseDatabase | null = null;

/**
 * 获取当前平台的数据库实例（单例）。
 * - 浏览器 / PWA：IndexedDB
 * - Tauri 桌面端 / 移动端：SQLite
 */
export function getDatabase(): TimePulseDatabase {
  if (!activeDatabase) {
    activeDatabase = isTauriRuntime() ? new SqliteDatabase() : new IndexedDbDatabase();
  }
  return activeDatabase;
}

/** 预热数据库连接（幂等），失败时静默降级由上层门面兜底 */
export async function warmUpDatabase(): Promise<void> {
  await getDatabase().init();
}

/** 测试注入：替换或重置当前数据库实例 */
export function __setDatabaseForTests(database: TimePulseDatabase | null): void {
  activeDatabase = database;
}
