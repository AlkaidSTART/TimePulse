import { isTauriRuntime } from '@/services/db/platform';

/**
 * 在系统默认浏览器（Tauri 桌面端 / 移动端）或新标签页（Web 端）打开外部链接。
 * 确保下载最新安装包、GitHub Releases、外部文档等不会在 Tauri 嵌入式 Webview 内直接跳转。
 *
 * @param url 目标外部链接地址
 * @returns 是否成功发起打开操作
 */
export async function openExternalUrl(url: string): Promise<boolean> {
  if (!url) return false;

  // 1. 如果运行在 Tauri 原生客户端环境，优先调用系统级 opener 插件唤起系统默认浏览器（如 Safari/Chrome/Edge）
  if (isTauriRuntime()) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
      return true;
    } catch (err) {
      console.warn('[openExternalUrl] 调用 Tauri plugin-opener 打开系统浏览器失败，降级尝试 window.open:', err);
    }
  }

  // 2. Web 环境或降级兜底：在浏览器新标签页中打开
  if (typeof window !== 'undefined') {
    try {
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      return Boolean(win !== null);
    } catch (err) {
      console.error('[openExternalUrl] window.open 失败:', err);
    }
  }

  return false;
}
