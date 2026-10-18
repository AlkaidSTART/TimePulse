/**
 * 判断当前是否运行在 Tauri 原生环境（桌面端 / 移动端）。
 * 浏览器与 PWA 中不存在该全局对象，因此会走 Web IndexedDB 后端。
 */
export function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window;
}
