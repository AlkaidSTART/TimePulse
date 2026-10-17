export type TodoType = 'todo' | 'checklist';

export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low' | 'focus' | 'idea' | 'none';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  type: TodoType;
  createdAt: number;
  completedAt?: number;
  priority?: PriorityLevel;
  color?: string;
}

export interface TodoState {
  items: TodoItem[];
  activeTab: TodoType;
  autoSort?: boolean;
}

export type TodoAction =
  | { type: 'load'; items: TodoItem[]; activeTab?: TodoType; autoSort?: boolean }
  | { type: 'set_tab'; tab: TodoType }
  | { type: 'add'; text: string; itemType?: TodoType; color?: string; priority?: PriorityLevel }
  | { type: 'toggle'; id: string }
  | { type: 'edit'; id: string; text: string }
  | { type: 'delete'; id: string }
  | { type: 'reorder'; items: TodoItem[] }
  | { type: 'set_priority'; id: string; color?: string; priority?: PriorityLevel }
  | { type: 'sort_by_priority' }
  | { type: 'set_auto_sort'; enabled: boolean }
  | { type: 'clear_completed'; itemType?: TodoType }
  | { type: 'reset_all'; itemType?: TodoType }
  | { type: 'batch_add'; items: Array<{ text: string; type: TodoType; color?: string; priority?: PriorityLevel }> };
