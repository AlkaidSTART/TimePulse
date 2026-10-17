import { describe, expect, it } from 'vitest';
import {
  isAllCompleted,
  todoReducer,
  type TodoState,
} from './todoReducer';
import type { TodoItem } from './types';

function createItem(
  id: string,
  text: string,
  completed: boolean,
  type: 'todo' | 'checklist' = 'todo',
): TodoItem {
  return {
    id,
    text,
    completed,
    type,
    createdAt: Date.now(),
  };
}

describe('todoReducer', () => {
  it('adds a new item to the beginning of the list', () => {
    const initialState: TodoState = {
      items: [createItem('1', 'Old item', false)],
      activeTab: 'todo',
    };

    const nextState = todoReducer(initialState, {
      type: 'add',
      text: 'New task',
    });

    expect(nextState.items.length).toBe(2);
    expect(nextState.items[0].text).toBe('New task');
    expect(nextState.items[0].type).toBe('todo');
    expect(nextState.items[0].completed).toBe(false);
  });

  it('ignores empty add text', () => {
    const initialState: TodoState = {
      items: [createItem('1', 'Old item', false)],
      activeTab: 'todo',
    };

    const nextState = todoReducer(initialState, {
      type: 'add',
      text: '   ',
    });

    expect(nextState).toBe(initialState);
  });

  it('toggles item completion state and sets completedAt timestamp', () => {
    const initialState: TodoState = {
      items: [createItem('1', 'Task 1', false)],
      activeTab: 'todo',
    };

    const toggledOn = todoReducer(initialState, { type: 'toggle', id: '1' });
    expect(toggledOn.items[0].completed).toBe(true);
    expect(toggledOn.items[0].completedAt).toBeTypeOf('number');

    const toggledOff = todoReducer(toggledOn, { type: 'toggle', id: '1' });
    expect(toggledOff.items[0].completed).toBe(false);
    expect(toggledOff.items[0].completedAt).toBeUndefined();
  });

  it('edits item text', () => {
    const initialState: TodoState = {
      items: [createItem('1', 'Old text', false)],
      activeTab: 'todo',
    };

    const nextState = todoReducer(initialState, {
      type: 'edit',
      id: '1',
      text: 'Updated text',
    });

    expect(nextState.items[0].text).toBe('Updated text');
  });

  it('deletes an item', () => {
    const initialState: TodoState = {
      items: [createItem('1', 'Item 1', false), createItem('2', 'Item 2', false)],
      activeTab: 'todo',
    };

    const nextState = todoReducer(initialState, {
      type: 'delete',
      id: '1',
    });

    expect(nextState.items.length).toBe(1);
    expect(nextState.items[0].id).toBe('2');
  });

  it('reorders items for the active tab while preserving other tab items', () => {
    const item1 = createItem('1', 'Todo 1', false, 'todo');
    const item2 = createItem('2', 'Todo 2', false, 'todo');
    const check1 = createItem('c1', 'Check 1', false, 'checklist');

    const initialState: TodoState = {
      items: [item1, item2, check1],
      activeTab: 'todo',
    };

    const reorderedTodos = [item2, item1];
    const nextState = todoReducer(initialState, {
      type: 'reorder',
      items: reorderedTodos,
    });

    expect(nextState.items.map((i) => i.id)).toEqual(['2', '1', 'c1']);
  });

  it('clears completed items only for the target tab', () => {
    const state: TodoState = {
      items: [
        createItem('1', 'Todo 1 (done)', true, 'todo'),
        createItem('2', 'Todo 2 (active)', false, 'todo'),
        createItem('3', 'Check 1 (done)', true, 'checklist'),
      ],
      activeTab: 'todo',
    };

    const nextState = todoReducer(state, { type: 'clear_completed' });
    expect(nextState.items.map((i) => i.id)).toEqual(['2', '3']);
  });

  it('resets all items in checklist to uncompleted', () => {
    const state: TodoState = {
      items: [
        createItem('1', 'Check 1', true, 'checklist'),
        createItem('2', 'Check 2', true, 'checklist'),
        createItem('3', 'Todo 1', true, 'todo'),
      ],
      activeTab: 'checklist',
    };

    const nextState = todoReducer(state, { type: 'reset_all' });
    const checks = nextState.items.filter((i) => i.type === 'checklist');
    expect(checks.every((i) => !i.completed)).toBe(true);
    // todo item should remain untouched
    expect(nextState.items.find((i) => i.id === '3')?.completed).toBe(true);
  });

  it('correctly calculates isAllCompleted', () => {
    const items: TodoItem[] = [
      createItem('1', 'Task 1', true, 'todo'),
      createItem('2', 'Task 2', true, 'todo'),
      createItem('3', 'Check 1', false, 'checklist'),
    ];

    expect(isAllCompleted(items, 'todo')).toBe(true);
    expect(isAllCompleted(items, 'checklist')).toBe(false);
    expect(isAllCompleted([], 'todo')).toBe(false);
  });
});
