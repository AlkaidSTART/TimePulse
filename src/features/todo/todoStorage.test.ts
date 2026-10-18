import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TimePulseDatabase } from '@/services/db';
import type { TodoItem } from './types';

const TODO_STORAGE_KEY = 'timepulse_todo_items_v1';

function makeTodo(id: string, text: string): TodoItem {
  return { id, text, completed: false, type: 'todo', createdAt: 1 };
}

class FakeDatabase {
  readonly kind = 'indexeddb' as const;
  items: TodoItem[] = [];
  readImpl: (() => Promise<TodoItem[]>) | null = null;

  async init(): Promise<void> {}

  async readTimers() {
    return [];
  }

  async writeTimers() {}

  async readState() {
    return null;
  }

  async writeState() {}

  async readTodoItems(): Promise<TodoItem[]> {
    return this.readImpl ? this.readImpl() : this.items.map((item) => ({ ...item }));
  }

  async writeTodoItems(items: TodoItem[]): Promise<void> {
    this.items = items.map((item) => ({ ...item }));
  }

  async readBackgroundImages() {
    return [];
  }

  async readBackgroundImage() {
    return null;
  }

  async writeBackgroundImage() {}

  async deleteBackgroundImage() {}

  async clearBackgroundImages() {}
}

async function loadTodoStorage(database: FakeDatabase) {
  vi.resetModules();
  const dbModule = await import('@/services/db');
  dbModule.__setDatabaseForTests(database as unknown as TimePulseDatabase);
  const todoModule = await import('./todoStorage');
  return todoModule;
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('todoStorage 数据库写穿与水合', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('写入待办项时同步本地缓存并写穿数据库', async () => {
    const database = new FakeDatabase();
    const storage = await loadTodoStorage(database);

    storage.writeTodoItems([makeTodo('t1', '写测试')]);
    await flush();

    expect(storage.readTodoItems()).toEqual([makeTodo('t1', '写测试')]);
    expect(localStorage.getItem(TODO_STORAGE_KEY)).toBe(JSON.stringify([makeTodo('t1', '写测试')]));
    expect(database.items).toEqual([makeTodo('t1', '写测试')]);
  });

  it('数据库有数据时水合刷新本地缓存并广播更新事件', async () => {
    const database = new FakeDatabase();
    database.items = [makeTodo('t9', '数据库里的任务')];
    const storage = await loadTodoStorage(database);

    const listener = vi.fn();
    window.addEventListener(storage.TODO_STORAGE_EVENT, listener);

    await storage.hydrateTodoItemsFromDatabase();

    expect(storage.readTodoItems()).toEqual([makeTodo('t9', '数据库里的任务')]);
    expect(localStorage.getItem(TODO_STORAGE_KEY)).toBe(JSON.stringify([makeTodo('t9', '数据库里的任务')]));
    expect(listener).toHaveBeenCalled();

    window.removeEventListener(storage.TODO_STORAGE_EVENT, listener);
  });

  it('数据库为空时把本地缓存迁移进数据库', async () => {
    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify([makeTodo('t3', '旧数据')]));
    const database = new FakeDatabase();
    const storage = await loadTodoStorage(database);

    await storage.hydrateTodoItemsFromDatabase();

    expect(database.items).toEqual([makeTodo('t3', '旧数据')]);
  });

  it('水合期间产生的新写入不会被数据库旧数据覆盖', async () => {
    const database = new FakeDatabase();
    const deferred = createDeferred<TodoItem[]>();
    database.readImpl = () => deferred.promise;

    const storage = await loadTodoStorage(database);
    const hydration = storage.hydrateTodoItemsFromDatabase();

    storage.writeTodoItems([makeTodo('t-new', '刚新建的任务')]);
    deferred.resolve([makeTodo('t-old', '数据库旧任务')]);
    await hydration;

    expect(storage.readTodoItems()).toEqual([makeTodo('t-new', '刚新建的任务')]);
  });
});
