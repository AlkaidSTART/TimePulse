import { isTauriRuntime } from '@/services/db/platform';
import { useAuthStore, TAURI_CUSTOM_SCHEME } from '@/stores/useAuthStore';

let deepLinkInitialized = false;

/**
 * 设置 Tauri 原生环境下的 Deep Link 监听。
 * 当通过外部浏览器完成 OAuth 并跳回 timepulse:// 时，捕获 URL 并交由 useAuthStore 处理登录凭证。
 */
export async function setupDeepLink(): Promise<(() => void) | undefined> {
  if (!isTauriRuntime() || deepLinkInitialized) {
    return;
  }
  deepLinkInitialized = true;

  try {
    const { onOpenUrl, getCurrent, isRegistered, register } = await import('@tauri-apps/plugin-deep-link');

    // Windows 等平台开发环境下若尚未向系统注册表登记协议，尝试自动登记
    try {
      const registered = await isRegistered(TAURI_CUSTOM_SCHEME).catch(() => true);
      if (!registered) {
        await register(TAURI_CUSTOM_SCHEME).catch(() => null);
      }
    } catch {
      // 部分平台（macOS/移动端）由系统配置文件管理，不支持动态 register()，直接忽略
    }

    const handleUrl = (url: string) => {
      if (!url) return;
      if (url.startsWith(`${TAURI_CUSTOM_SCHEME}://`) || url.startsWith(`${TAURI_CUSTOM_SCHEME}:`)) {
        console.log('[DeepLink] 收到授权回调 URL:', url);
        void useAuthStore.getState().handleOAuthCallback(url);
      }
    };

    // 1. 处理应用冷启动时的传入 URL（例如应用未启动时用户点击授权回跳）
    const initialUrls = await getCurrent().catch(() => null);
    if (initialUrls && initialUrls.length > 0) {
      for (const url of initialUrls) {
        handleUrl(url);
      }
    }

    // 2. 监听应用已在运行时接收到的 URL 事件
    const unlisten = await onOpenUrl((urls) => {
      for (const url of urls) {
        handleUrl(url);
      }
    });

    return () => {
      deepLinkInitialized = false;
      unlisten();
    };
  } catch (err) {
    deepLinkInitialized = false;
    console.warn('[setupDeepLink] 注册 Deep Link 监听失败:', err);
  }
}

/**
 * 供单元测试重置初始化标识
 */
export function _resetDeepLinkInitializedForTest(): void {
  deepLinkInitialized = false;
}
