import { create } from 'zustand';
import type { TodoItem, TodoType } from '@/features/todo/types';
import {
  hydrateTodoItemsFromDatabase,
  readActiveTodoTab,
  readTodoItems,
  readTodoWidgetVisible,
  writeActiveTodoTab,
  writeTodoItems,
  writeTodoWidgetVisible,
  TODO_STORAGE_EVENT,
} from '@/features/todo/todoStorage';

export interface TodoState {
  items: TodoItem[];
  activeTab: TodoType;
  isWidgetEnabled: boolean;
  isWidgetOpen: boolean;
  isLoaded: boolean;

  addItem: (text: string, type?: TodoType, color?: string, priority?: TodoItem['priority']) => void;
  toggleItem: (id: string) => void;
  deleteItem: (id: string) => void;
  updateItemText: (id: string, text: string) => void;
  setItemPriority: (id: string, color?: string, priority?: TodoItem['priority']) => void;
  reorderItems: (orderedIds: string[], type?: TodoType) => void;
  clearCompleted: (type: TodoType) => void;
  setActiveTab: (tab: TodoType) => void;
  setWidgetEnabled: (enabled: boolean) => void;
  setWidgetOpen: (open: boolean) => void;
  refreshFromStorage: () => void;
}

const initialItems = readTodoItems();
const initialTab = readActiveTodoTab();
const initialWidgetEnabled = readTodoWidgetVisible();

export const useTodoStore = create<TodoState>((set, get) => ({
  items: initialItems,
  activeTab: initialTab,
  isWidgetEnabled: initialWidgetEnabled,
  isWidgetOpen: false,
  isLoaded: true,

  refreshFromStorage: () => {
    set({
      items: readTodoItems(),
      activeTab: readActiveTodoTab(),
      isWidgetEnabled: readTodoWidgetVisible(),
    });
  },

  addItem: (text: string, customType?: TodoType, color?: string, priority?: TodoItem['priority']) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const targetType = customType || get().activeTab;
    const newItem: TodoItem = {
      id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: trimmed,
      completed: false,
      type: targetType,
      createdAt: Date.now(),
      color,
      priority,
    };
    const nextItems = [newItem, ...get().items];
    set({ items: nextItems });
    writeTodoItems(nextItems);
  },

  setItemPriority: (id: string, color?: string, priority?: TodoItem['priority']) => {
    const nextItems = get().items.map((item) =>
      item.id === id ? { ...item, color, priority } : item,
    );
    set({ items: nextItems });
    writeTodoItems(nextItems);
  },

  toggleItem: (id: string) => {
    const nextItems = get().items.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item,
    );
    set({ items: nextItems });
    writeTodoItems(nextItems);
  },

  deleteItem: (id: string) => {
    const nextItems = get().items.filter((item) => item.id !== id);
    set({ items: nextItems });
    writeTodoItems(nextItems);
  },

  updateItemText: (id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const nextItems = get().items.map((item) =>
      item.id === id ? { ...item, text: trimmed } : item,
    );
    set({ items: nextItems });
    writeTodoItems(nextItems);
  },

  reorderItems: (orderedIds: string[], type?: TodoType) => {
    const targetType = type || get().activeTab;
    const current = get().items;
    const otherItems = current.filter((item) => item.type !== targetType);
    const targetItemsMap = new Map(
      current.filter((item) => item.type === targetType).map((item) => [item.id, item]),
    );

    const reordered: TodoItem[] = [];
    for (const id of orderedIds) {
      const item = targetItemsMap.get(id);
      if (item) {
        reordered.push(item);
        targetItemsMap.delete(id);
      }
    }
    // Append any unmentioned items
    for (const item of targetItemsMap.values()) {
      reordered.push(item);
    }

    const nextItems = [...reordered, ...otherItems];
    set({ items: nextItems });
    writeTodoItems(nextItems);
  },

  clearCompleted: (type: TodoType) => {
    const nextItems = get().items.filter((item) => !(item.type === type && item.completed));
    set({ items: nextItems });
    writeTodoItems(nextItems);
  },

  setActiveTab: (tab: TodoType) => {
    set({ activeTab: tab });
    writeActiveTodoTab(tab);
  },

  setWidgetEnabled: (enabled: boolean) => {
    set({ isWidgetEnabled: enabled });
    writeTodoWidgetVisible(enabled);
  },

  setWidgetOpen: (open: boolean) => {
    set({ isWidgetOpen: open });
  },
}));

// 监听跨组件与多窗口存储更新
if (typeof window !== 'undefined') {
  const syncStorage = () => {
    useTodoStore.getState().refreshFromStorage();
  };
  window.addEventListener(TODO_STORAGE_EVENT, syncStorage);
  window.addEventListener('storage', syncStorage);

  // 首屏使用本地缓存同步渲染，随后从数据库（IndexedDB / SQLite）水合
  void hydrateTodoItemsFromDatabase();
}
