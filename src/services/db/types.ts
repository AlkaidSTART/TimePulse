import type { Timer } from '../../domain/timer';
import type { TodoItem } from '../../features/todo/types';

/**
 * 当前生效的数据库后端类型：
 * - `indexeddb`：Web / PWA 浏览器环境
 * - `sqlite`：Tauri 桌面端与移动端原生环境
 */
export type DatabaseKind = 'indexeddb' | 'sqlite';

export interface StoredImageMetadata {
  size: number;
  mimeType: string;
  width: number;
  height: number;
  uploadedAt: string;
  name?: string;
}

export interface StoredImage {
  id: string;
  type: 'file' | 'url';
  url: string;
  blob: Blob;
  metadata: StoredImageMetadata;
  [key: string]: unknown;
}

/**
 * 平台数据库统一契约。
 *
 * 上层（storage.ts / imageStorage.ts / todoStorage.ts）只依赖这个接口，
 * 由平台探测决定注入 IndexedDB 或 SQLite 实现，两端的领域方法语义保持一致：
 * `writeXxx` 均为“全量覆盖写入”，读取结果按写入顺序返回。
 */
export interface TimePulseDatabase {
  readonly kind: DatabaseKind;

  /** 打开连接并确保数据结构就绪（幂等） */
  init(): Promise<void>;

  readTimers(): Promise<Timer[]>;
  writeTimers(timers: Timer[]): Promise<void>;

  /** 通用键值状态（如活动计时器 ID），值为结构化数据，内部按 JSON 序列化 */
  readState<T>(key: string): Promise<T | null>;
  writeState(key: string, value: unknown | null): Promise<void>;

  readTodoItems(): Promise<TodoItem[]>;
  writeTodoItems(items: TodoItem[]): Promise<void>;

  readBackgroundImages(): Promise<StoredImage[]>;
  readBackgroundImage(id: string): Promise<StoredImage | null>;
  writeBackgroundImage(image: StoredImage): Promise<void>;
  deleteBackgroundImage(id: string): Promise<void>;
  clearBackgroundImages(): Promise<void>;
}
