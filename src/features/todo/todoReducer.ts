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

/**
 * 快速按优先级排序指定的待办列表（未完成在前、优先级由高到低）
 */
export function sortItemsByPriority(items: TodoItem[]): TodoItem[] {
  return [...items].sort((a, b) => {
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
}

export function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'load': {
      const autoSort = action.autoSort ?? state.autoSort ?? false;
      const curTab = action.activeTab ?? state.activeTab;
      const items = autoSort
        ? [
            ...sortItemsByPriority(action.items.filter((i) => i.type === curTab)),
            ...action.items.filter((i) => i.type !== curTab),
          ]
        : action.items;

      return {
        ...state,
        items,
        activeTab: curTab,
        autoSort,
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

      const newItems = [newItem, ...state.items];
      if (state.autoSort) {
        const curTab = state.activeTab;
        const curTabItems = newItems.filter((i) => i.type === curTab);
        const otherItems = newItems.filter((i) => i.type !== curTab);
        return {
          ...state,
          items: [...sortItemsByPriority(curTabItems), ...otherItems],
        };
      }

      return {
        ...state,
        items: newItems,
      };
    }

    case 'toggle': {
      const updated = state.items.map((item) => {
        if (item.id !== action.id) return item;
        const nextCompleted = !item.completed;
        return {
          ...item,
          completed: nextCompleted,
          completedAt: nextCompleted ? Date.now() : undefined,
        };
      });

      if (state.autoSort) {
        const curTab = state.activeTab;
        const curTabItems = updated.filter((i) => i.type === curTab);
        const otherItems = updated.filter((i) => i.type !== curTab);
        return {
          ...state,
          items: [...sortItemsByPriority(curTabItems), ...otherItems],
        };
      }

      return {
        ...state,
        items: updated,
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
      // 手动自由拖拽后，暂时关闭自动排序，确保用户的自由定制顺序不被立刻冲掉
      const currentTab = state.activeTab;
      const otherItems = state.items.filter((item) => item.type !== currentTab);
      return {
        ...state,
        autoSort: false,
        items: [...action.items, ...otherItems],
      };
    }

    case 'set_priority': {
      const updated = state.items.map((item) =>
        item.id === action.id
          ? { ...item, color: action.color, priority: action.priority }
          : item,
      );

      if (state.autoSort) {
        const curTab = state.activeTab;
        const curTabItems = updated.filter((i) => i.type === curTab);
        const otherItems = updated.filter((i) => i.type !== curTab);
        return {
          ...state,
          items: [...sortItemsByPriority(curTabItems), ...otherItems],
        };
      }

      return {
        ...state,
        items: updated,
      };
    }

    case 'set_auto_sort': {
      if (!action.enabled) {
        return { ...state, autoSort: false };
      }
      const currentTab = state.activeTab;
      const currentTabItems = state.items.filter((item) => item.type === currentTab);
      const otherItems = state.items.filter((item) => item.type !== currentTab);
      return {
        ...state,
        autoSort: true,
        items: [...sortItemsByPriority(currentTabItems), ...otherItems],
      };
    }

    case 'sort_by_priority': {
      const currentTab = state.activeTab;
      const currentTabItems = state.items.filter((item) => item.type === currentTab);
      const otherItems = state.items.filter((item) => item.type !== currentTab);

      return {
        ...state,
        items: [...sortItemsByPriority(currentTabItems), ...otherItems],
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
