import { v4 as uuidv4 } from 'uuid';
import type { TodoAction, TodoItem, TodoState, TodoType } from './types';
import { getPriorityWeight } from './constants/priorityColors';
export type { TodoState };

export const INITIAL_TODO_STATE: TodoState = {
  items: [],
  activeTab: 'todo',
};

/**
 * 检查指定类型的项是否全部已完成且至少有一项
 */
export function isAllCompleted(items: TodoItem[], type: TodoType): boolean {
  const filtered = items.filter((item) => item.type === type);
  if (filtered.length === 0) return false;
  return filtered.every((item) => item.completed);
}

export function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'load': {
      return {
        ...state,
        items: action.items,
        activeTab: action.activeTab ?? state.activeTab,
      };
    }

    case 'set_tab': {
      return {
        ...state,
        activeTab: action.tab,
      };
    }

    case 'add': {
      const trimmed = action.text.trim();
      if (!trimmed) return state;

      const newItem: TodoItem = {
        id: uuidv4(),
        text: trimmed,
        completed: false,
        type: action.itemType ?? state.activeTab,
        createdAt: Date.now(),
        color: action.color,
        priority: action.priority,
      };

      return {
        ...state,
        items: [newItem, ...state.items],
      };
    }

    case 'toggle': {
      return {
        ...state,
        items: state.items.map((item) => {
          if (item.id !== action.id) return item;
          const nextCompleted = !item.completed;
          return {
            ...item,
            completed: nextCompleted,
            completedAt: nextCompleted ? Date.now() : undefined,
          };
        }),
      };
    }

    case 'edit': {
      const trimmed = action.text.trim();
      if (!trimmed) return state;

      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.id ? { ...item, text: trimmed } : item,
        ),
      };
    }

    case 'delete': {
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.id),
      };
    }

    case 'reorder': {
      // action.items 是当前 activeTab 经过拖拽排好序的 items 列表
      // 将其他 tab 的 items 原样保留，把当前 tab 的 items 替换为排好序的 items
      const currentTab = state.activeTab;
      const otherItems = state.items.filter((item) => item.type !== currentTab);
      return {
        ...state,
        items: [...action.items, ...otherItems],
      };
    }

    case 'set_priority': {
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.id
            ? { ...item, color: action.color, priority: action.priority }
            : item,
        ),
      };
    }

    case 'sort_by_priority': {
      const currentTab = state.activeTab;
      const currentTabItems = state.items.filter((item) => item.type === currentTab);
      const otherItems = state.items.filter((item) => item.type !== currentTab);

      const sorted = [...currentTabItems].sort((a, b) => {
        // 未完成项排在已完成项前面
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        const weightA = getPriorityWeight(a.color, a.priority);
        const weightB = getPriorityWeight(b.color, b.priority);
        if (weightA !== weightB) {
          return weightA - weightB;
        }
        return (b.createdAt || 0) - (a.createdAt || 0);
      });

      return {
        ...state,
        items: [...sorted, ...otherItems],
      };
    }

    case 'clear_completed': {
      const targetType = action.itemType ?? state.activeTab;
      return {
        ...state,
        items: state.items.filter(
          (item) => !(item.type === targetType && item.completed),
        ),
      };
    }

    case 'reset_all': {
      // 将指定类型（通常是 checklist）中的所有项目重置为未完成
      const targetType = action.itemType ?? state.activeTab;
      return {
        ...state,
        items: state.items.map((item) =>
          item.type === targetType
            ? { ...item, completed: false, completedAt: undefined }
            : item,
        ),
      };
    }

    case 'batch_add': {
      const now = Date.now();
      const newItems: TodoItem[] = action.items.map((item, index) => ({
        id: uuidv4(),
        text: item.text,
        completed: false,
        type: item.type,
        createdAt: now + index,
        color: item.color,
        priority: item.priority,
      }));
      return {
        ...state,
        items: [...newItems, ...state.items],
      };
    }

    default:
      return state;
  }
}
