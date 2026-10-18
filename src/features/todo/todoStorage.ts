import { getDatabase } from '@/services/db';
import type { TodoItem, TodoType } from './types';

const TODO_STORAGE_KEY = 'timepulse_todo_items_v1';
const TODO_ACTIVE_TAB_KEY = 'timepulse_todo_active_tab_v1';

export const DEFAULT_PRESET_ITEMS: TodoItem[] = [];

/** 过滤非法数据与历史预置项，数据库与本地缓存共用同一套校验 */
function sanitizeTodoItems(value: unknown): TodoItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is TodoItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as TodoItem).id === 'string' &&
        typeof (item as TodoItem).text === 'string' &&
        typeof (item as TodoItem).completed === 'boolean' &&
        ((item as TodoItem).type === 'todo' || (item as TodoItem).type === 'checklist'),
    )
    .filter((item) => !item.id.startsWith('preset-'));
}

/**
 * 读取本地缓存的所有待办/清单项，默认返回空数组。
 * 同步读取保证首屏即时渲染，数据库水合由 hydrateTodoItemsFromDatabase 完成。
 */
export function readTodoItems(): TodoItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TODO_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeTodoItems(JSON.parse(raw));
  } catch (error) {
    console.error('[TodoStorage] 读取待办项失败:', error);
    return [];
  }
}

export const TODO_STORAGE_EVENT = 'timepulse_todo_storage_updated';

let lastWrittenItemsJson = '';
let lastWrittenTab: TodoType | '';
/** 写入版本号：用于避免水合期间覆盖用户刚产生的新数据 */
let writeRevision = 0;

/** 数据库写穿（Web: IndexedDB / 原生: SQLite），失败仅告警，不影响本地缓存 */
async function persistTodoItems(items: TodoItem[]): Promise<void> {
  try {
    await getDatabase().writeTodoItems(items);
  } catch (error) {
    console.warn('[TodoStorage] 待办项写入数据库失败:', error);
  }
}

function dispatchTodoStorageEvent(type: string, detail: Record<string, unknown> = {}): void {
  window.dispatchEvent(new CustomEvent(TODO_STORAGE_EVENT, { detail: { type, ...detail } }));
}

/**
 * 保存待办/清单项到本地缓存（同步）并写穿数据库（异步）。
 */
export function writeTodoItems(items: TodoItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    writeRevision += 1;
    const json = JSON.stringify(items);
    if (json !== lastWrittenItemsJson) {
      lastWrittenItemsJson = json;
      localStorage.setItem(TODO_STORAGE_KEY, json);
      dispatchTodoStorageEvent('items');
    }
    void persistTodoItems(items);
  } catch (error) {
    console.warn('[TodoStorage] 保存待办项失败:', error);
  }
}

let hydrationPromise: Promise<void> | null = null;

/**
 * 从数据库水合待办项（幂等）。
 * - 数据库为空时：把本地缓存中的旧数据一次性迁移进数据库
 * - 数据库有数据时：刷新本地缓存并广播更新事件，供各视图重载
 */
export function hydrateTodoItemsFromDatabase(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (!hydrationPromise) {
    hydrationPromise = (async () => {
      const revisionAtStart = writeRevision;
      try {
        const stored = sanitizeTodoItems(await getDatabase().readTodoItems());

        // 水合期间用户已写入新数据（或已写穿数据库），放弃覆盖本地缓存
        if (writeRevision !== revisionAtStart) return;

        if (stored.length === 0) {
          const cached = readTodoItems();
          if (cached.length > 0) {
            console.log(`[TodoStorage] 迁移 ${cached.length} 条本地待办项到数据库`);
            await persistTodoItems(cached);
          }
          return;
        }

        const nextJson = JSON.stringify(stored);
        if (localStorage.getItem(TODO_STORAGE_KEY) !== nextJson) {
          localStorage.setItem(TODO_STORAGE_KEY, nextJson);
          lastWrittenItemsJson = nextJson;
          dispatchTodoStorageEvent('items');
        }
      } catch (error) {
        console.warn('[TodoStorage] 数据库水合待办项失败，继续使用本地缓存:', error);
      }
    })().catch(() => {
      hydrationPromise = null;
    });
  }
  return hydrationPromise;
}

/**
 * 读取上次选中的标签页（'todo' 或 'checklist'）
 */
export function readActiveTodoTab(): TodoType {
  if (typeof window === 'undefined') return 'todo';
  try {
    const tab = localStorage.getItem(TODO_ACTIVE_TAB_KEY);
    return tab === 'checklist' ? 'checklist' : 'todo';
  } catch {
    return 'todo';
  }
}

const TODO_WIDGET_VISIBLE_KEY = 'timepulse_todo_widget_visible_v1';

/**
 * 保存选中的标签页
 */
export function writeActiveTodoTab(tab: TodoType): void {
  if (typeof window === 'undefined') return;
  try {
    if (tab === lastWrittenTab) return;
    lastWrittenTab = tab;
    localStorage.setItem(TODO_ACTIVE_TAB_KEY, tab);
    dispatchTodoStorageEvent('tab');
  } catch (error) {
    console.warn('[TodoStorage] 保存活动标签页失败:', error);
  }
}

/**
 * 读取用户是否启用桌面待办悬浮挂件（默认启用 true）
 */
export function readTodoWidgetVisible(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(TODO_WIDGET_VISIBLE_KEY);
    if (val === null) return true;
    return val === 'true';
  } catch {
    return true;
  }
}

/**
 * 保存用户是否启用桌面待办悬浮挂件
 */
export function writeTodoWidgetVisible(visible: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TODO_WIDGET_VISIBLE_KEY, String(visible));
    dispatchTodoStorageEvent('widget_visible', { visible });
  } catch (error) {
    console.warn('[TodoStorage] 保存悬浮挂件可见性设置失败:', error);
  }
}

const TODO_AUTO_SORT_KEY = 'timepulse_todo_auto_sort_v1';

/**
 * 读取用户是否开启按优先级自动排序（默认开启 true）
 */
export function readTodoAutoSort(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(TODO_AUTO_SORT_KEY);
    if (val === null) return true;
    return val === 'true';
  } catch {
    return true;
  }
}

/**
 * 保存用户是否开启自动排序设置
 */
export function writeTodoAutoSort(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TODO_AUTO_SORT_KEY, String(enabled));
    dispatchTodoStorageEvent('auto_sort', { enabled });
  } catch (error) {
    console.warn('[TodoStorage] 保存自动排序配置失败:', error);
  }
}
