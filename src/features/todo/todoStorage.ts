import type { TodoItem, TodoType } from './types';

const TODO_STORAGE_KEY = 'timepulse_todo_items_v1';
const TODO_ACTIVE_TAB_KEY = 'timepulse_todo_active_tab_v1';

export const DEFAULT_PRESET_ITEMS: TodoItem[] = [
  {
    id: 'preset-todo-1',
    text: '开启今日专注计时',
    completed: false,
    type: 'todo',
    createdAt: 1700000000000,
  },
  {
    id: 'preset-todo-2',
    text: '整理工作笔记与待办清单',
    completed: false,
    type: 'todo',
    createdAt: 1700000001000,
  },
  {
    id: 'preset-check-1',
    text: '桌面杂物清理 & 倒一杯水',
    completed: false,
    type: 'checklist',
    createdAt: 1700000002000,
  },
  {
    id: 'preset-check-2',
    text: '手机调为静音或勿扰模式',
    completed: false,
    type: 'checklist',
    createdAt: 1700000003000,
  },
  {
    id: 'preset-check-3',
    text: '明确本轮番茄钟核心产出',
    completed: false,
    type: 'checklist',
    createdAt: 1700000004000,
  },
];

/**
 * 读取本地存储的所有待办/清单项，首次使用时返回默认预设项
 */
export function readTodoItems(): TodoItem[] {
  if (typeof window === 'undefined') return DEFAULT_PRESET_ITEMS;
  try {
    const raw = localStorage.getItem(TODO_STORAGE_KEY);
    if (!raw) return DEFAULT_PRESET_ITEMS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is TodoItem =>
          typeof item === 'object' &&
          item !== null &&
          typeof item.id === 'string' &&
          typeof item.text === 'string' &&
          typeof item.completed === 'boolean' &&
          (item.type === 'todo' || item.type === 'checklist'),
      );
    }
    return DEFAULT_PRESET_ITEMS;
  } catch (error) {
    console.error('[TodoStorage] 读取待办项失败:', error);
    return DEFAULT_PRESET_ITEMS;
  }
}

export const TODO_STORAGE_EVENT = 'timepulse_todo_storage_updated';

let lastWrittenItemsJson = '';
let lastWrittenTab: TodoType | '' = '';

/**
 * 保存待办/清单项到本地存储
 */
export function writeTodoItems(items: TodoItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    const json = JSON.stringify(items);
    if (json === lastWrittenItemsJson) return;
    lastWrittenItemsJson = json;
    localStorage.setItem(TODO_STORAGE_KEY, json);
    window.dispatchEvent(new CustomEvent(TODO_STORAGE_EVENT, { detail: { type: 'items' } }));
  } catch (error) {
    console.warn('[TodoStorage] 保存待办项失败:', error);
  }
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
    window.dispatchEvent(new CustomEvent(TODO_STORAGE_EVENT, { detail: { type: 'tab' } }));
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
    window.dispatchEvent(
      new CustomEvent(TODO_STORAGE_EVENT, {
        detail: { type: 'widget_visible', visible },
      }),
    );
  } catch (error) {
    console.warn('[TodoStorage] 保存悬浮挂件可见性设置失败:', error);
  }
}


