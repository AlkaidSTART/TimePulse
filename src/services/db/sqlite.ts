import type { Timer } from '../../domain/timer';
import type { TodoItem } from '../../features/todo/types';
import { base64ToBlob, blobToBase64 } from './base64';
import type { StoredImage, TimePulseDatabase } from './types';

/** 连接串：数据库文件位于系统应用配置目录（tauri-plugin-sql 的 sqlite: 相对路径约定） */
export const SQLITE_DATABASE_URL = 'sqlite:timepulse.db';

/**
 * 最小化的 tauri-plugin-sql 连接接口。
 * 仅声明前端用到的能力，避免 Web 打包时静态依赖原生插件。
 */
interface SqliteConnection {
  execute(query: string, values?: unknown[]): Promise<{ rowsAffected: number; lastInsertId?: number }>;
  select<T>(query: string, values?: unknown[]): Promise<T>;
}

type SqliteRow = Record<string, unknown>;

let connectionPromise: Promise<SqliteConnection> | null = null;

/**
 * 数据库表结构由 Rust 侧 tauri-plugin-sql 迁移定义（见 src-tauri/src/lib.rs），
 * 前端只负责连接与读写，避免两端 schema 定义漂移。
 */
async function openSqliteConnection(): Promise<SqliteConnection> {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
    throw new Error('SQLite 后端仅在 Tauri 原生环境中可用');
  }

  if (!connectionPromise) {
    // 动态导入：Web 端永远不会加载原生插件代码
    connectionPromise = import('@tauri-apps/plugin-sql')
      .then(({ default: Database }) => Database.load(SQLITE_DATABASE_URL) as Promise<SqliteConnection>)
      .catch((error: unknown) => {
        connectionPromise = null;
        throw error;
      });
  }
  return connectionPromise;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** 测试注入：清空缓存的连接，便于隔离用例 */
export function __resetSqliteConnectionForTests(): void {
  connectionPromise = null;
}

function parseRowData<T>(row: SqliteRow | undefined): T | null {
  if (!row || typeof row.data !== 'string') return null;
  try {
    return JSON.parse(row.data) as T;
  } catch (error) {
    console.error('[存储] SQLite 行数据解析失败:', error);
    return null;
  }
}

/**
 * Tauri 桌面端 / 移动端数据库后端：SQLite（tauri-plugin-sql）。
 */
export class SqliteDatabase implements TimePulseDatabase {
  readonly kind = 'sqlite' as const;

  async init(): Promise<void> {
    await openSqliteConnection();
  }

  private async upsertCollection(
    table: 'timers' | 'todo_items',
    records: Array<{ id: string; payload: unknown }>,
  ): Promise<void> {
    const db = await openSqliteConnection();

    if (records.length === 0) {
      await db.execute(`DELETE FROM ${table}`);
      return;
    }

    const placeholders = records.map((_, index) => `$${index + 1}`).join(', ');
    await db.execute(`DELETE FROM ${table} WHERE id NOT IN (${placeholders})`, records.map((record) => record.id));

    const updatedAt = nowIso();
    for (let index = 0; index < records.length; index++) {
      const record = records[index];
      await db.execute(
        `INSERT INTO ${table} (id, data, sort_order, updated_at) VALUES ($1, $2, $3, $4)
         ON CONFLICT(id) DO UPDATE SET data = excluded.data, sort_order = excluded.sort_order, updated_at = excluded.updated_at`,
        [record.id, JSON.stringify(record.payload), index, updatedAt],
      );
    }
  }

  private async readCollection<T>(table: 'timers' | 'todo_items'): Promise<T[]> {
    const db = await openSqliteConnection();
    const rows = await db.select<SqliteRow[]>(`SELECT data FROM ${table} ORDER BY sort_order ASC`);
    return rows
      .map((row) => parseRowData<T>(row))
      .filter((value): value is T => value !== null);
  }

  async readTimers(): Promise<Timer[]> {
    return this.readCollection<Timer>('timers');
  }

  async writeTimers(timers: Timer[]): Promise<void> {
    await this.upsertCollection('timers', timers.map((timer) => ({ id: timer.id, payload: timer })));
  }

  async readState<T>(key: string): Promise<T | null> {
    const db = await openSqliteConnection();
    const rows = await db.select<SqliteRow[]>('SELECT value FROM app_state WHERE key = $1', [key]);
    if (rows.length === 0) return null;
    const raw = rows[0].value;
    if (typeof raw !== 'string') return null;
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error('[存储] SQLite 状态数据解析失败:', error);
      return null;
    }
  }

  async writeState(key: string, value: unknown | null): Promise<void> {
    const db = await openSqliteConnection();
    if (value === null) {
      await db.execute('DELETE FROM app_state WHERE key = $1', [key]);
      return;
    }
    await db.execute(
      `INSERT INTO app_state (key, value, updated_at) VALUES ($1, $2, $3)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, JSON.stringify(value), nowIso()],
    );
  }

  async readTodoItems(): Promise<TodoItem[]> {
    return this.readCollection<TodoItem>('todo_items');
  }

  async writeTodoItems(items: TodoItem[]): Promise<void> {
    await this.upsertCollection('todo_items', items.map((item) => ({ id: item.id, payload: item })));
  }

  private rowToStoredImage(row: SqliteRow): StoredImage | null {
    const id = typeof row.id === 'string' ? row.id : null;
    if (!id) return null;

    const mimeType = typeof row.mime_type === 'string' ? row.mime_type : 'application/octet-stream';
    const blobBase64 = typeof row.blob_base64 === 'string' ? row.blob_base64 : '';
    return {
      id,
      type: row.type === 'url' ? 'url' : 'file',
      url: typeof row.url === 'string' ? row.url : '',
      blob: blobBase64 ? base64ToBlob(blobBase64, mimeType) : new Blob([], { type: mimeType }),
      metadata: {
        size: typeof row.size === 'number' ? row.size : 0,
        mimeType,
        width: typeof row.width === 'number' ? row.width : 0,
        height: typeof row.height === 'number' ? row.height : 0,
        uploadedAt: typeof row.uploaded_at === 'string' ? row.uploaded_at : nowIso(),
        name: typeof row.name === 'string' && row.name ? row.name : undefined,
      },
    };
  }

  async readBackgroundImages(): Promise<StoredImage[]> {
    const db = await openSqliteConnection();
    const rows = await db.select<SqliteRow[]>('SELECT * FROM custom_backgrounds ORDER BY uploaded_at ASC');
    return rows
      .map((row) => this.rowToStoredImage(row))
      .filter((image): image is StoredImage => image !== null);
  }

  async readBackgroundImage(id: string): Promise<StoredImage | null> {
    const db = await openSqliteConnection();
    const rows = await db.select<SqliteRow[]>('SELECT * FROM custom_backgrounds WHERE id = $1', [id]);
    if (rows.length === 0) return null;
    return this.rowToStoredImage(rows[0]);
  }

  async writeBackgroundImage(image: StoredImage): Promise<void> {
    const db = await openSqliteConnection();
    const blobBase64 = image.blob ? await blobToBase64(image.blob) : '';
    await db.execute(
      `INSERT INTO custom_backgrounds
         (id, type, url, mime_type, size, width, height, name, uploaded_at, blob_base64)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT(id) DO UPDATE SET
         type = excluded.type,
         url = excluded.url,
         mime_type = excluded.mime_type,
         size = excluded.size,
         width = excluded.width,
         height = excluded.height,
         name = excluded.name,
         uploaded_at = excluded.uploaded_at,
         blob_base64 = excluded.blob_base64`,
      [
        image.id,
        image.type,
        image.url,
        image.metadata?.mimeType ?? 'application/octet-stream',
        image.metadata?.size ?? 0,
        image.metadata?.width ?? 0,
        image.metadata?.height ?? 0,
        image.metadata?.name ?? null,
        image.metadata?.uploadedAt ?? nowIso(),
        blobBase64,
      ],
    );
  }

  async deleteBackgroundImage(id: string): Promise<void> {
    const db = await openSqliteConnection();
    await db.execute('DELETE FROM custom_backgrounds WHERE id = $1', [id]);
  }

  async clearBackgroundImages(): Promise<void> {
    const db = await openSqliteConnection();
    await db.execute('DELETE FROM custom_backgrounds');
  }
}
