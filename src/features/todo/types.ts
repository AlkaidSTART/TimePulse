export type TodoType = 'todo' | 'checklist';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  type: TodoType;
  createdAt: number;
  completedAt?: number;
  priority?: 'low' | 'medium' | 'high';
}

export interface TodoState {
  items: TodoItem[];
  activeTab: TodoType;
}

export type TodoAction =
  | { type: 'load'; items: TodoItem[]; activeTab?: TodoType }
  | { type: 'set_tab'; tab: TodoType }
  | { type: 'add'; text: string; itemType?: TodoType }
  | { type: 'toggle'; id: string }
  | { type: 'edit'; id: string; text: string }
  | { type: 'delete'; id: string }
  | { type: 'reorder'; items: TodoItem[] }
  | { type: 'clear_completed'; itemType?: TodoType }
  | { type: 'reset_all'; itemType?: TodoType }
  | { type: 'batch_add'; items: Array<{ text: string; type: TodoType }> };
