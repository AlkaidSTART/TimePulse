import '@testing-library/jest-dom/vitest';

// Node 内置的实验性全局 localStorage 在未提供 --localstorage-file 时返回 undefined，
// 且会遮蔽 jsdom 的 window.localStorage。这里用内存实现补齐测试环境。
function isStorageUsable(): boolean {
  try {
    return typeof globalThis.localStorage !== 'undefined' && globalThis.localStorage !== null;
  } catch {
    return false;
  }
}

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => {
      store.clear();
    },
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  };
}

if (!isStorageUsable()) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createMemoryStorage(),
    configurable: true,
    writable: true,
  });
}

// 模拟测试环境下的 i18n 静态语言文件 fetch 请求
import zhLocale from '../../public/locales/zh/common.json';
import enLocale from '../../public/locales/en/common.json';

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const urlStr = String(input);
  if (urlStr.includes('/locales/en/common.json') || urlStr.includes('/locales/en-US/common.json')) {
    return new Response(JSON.stringify(enLocale), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (urlStr.includes('/locales/zh/common.json') || urlStr.includes('/locales/zh-CN/common.json')) {
    return new Response(JSON.stringify(zhLocale), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (originalFetch) {
    return originalFetch(input, init);
  }
  return new Response('{}', { status: 404 });
};

if (typeof window !== 'undefined') {
  window.fetch = globalThis.fetch;
}
