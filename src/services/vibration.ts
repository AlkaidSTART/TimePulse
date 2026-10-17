import {
  vibrate as tauriVibrate,
  impactFeedback as tauriImpact,
  notificationFeedback as tauriNotification,
  selectionFeedback as tauriSelection,
} from '@tauri-apps/plugin-haptics';

export type HapticType = 'item_complete' | 'all_complete' | 'reorder' | 'test' | 'page_switch' | 'timer_switch' | 'selection';

const HAPTIC_ENABLED_KEY = 'timepulse_haptic_feedback_enabled';

/**
 * 检查当前环境是否支持振动反馈（Tauri 原生 haptics 或浏览器 navigator.vibrate）
 */
export function isVibrationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  // 检查是否存在 Tauri 运行环境（window.__TAURI_INTERNALS__）或支持 navigator.vibrate
  const hasNavigatorVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  const hasTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  return hasNavigatorVibrate || hasTauri;
}

/**
 * 获取触感振动开关状态（默认开启）
 */
export function isHapticEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const stored = localStorage.getItem(HAPTIC_ENABLED_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

/**
 * 设置触感振动开关状态
 */
export function setHapticEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HAPTIC_ENABLED_KEY, String(enabled));
  } catch (error) {
    console.warn('保存触感振动开关状态失败:', error);
  }
}

/**
 * 触发触感振动反馈。
 * 针对 Android Tauri App 调用原生系统振动 API，
 * 在普通移动浏览器/Android WebView 下自动降级使用 navigator.vibrate。
 */
export async function triggerHaptic(type: HapticType = 'item_complete'): Promise<boolean> {
  if (!isHapticEnabled()) return false;

  // 1. 优先尝试调用 Tauri 原生 Haptics 插件 (Android 原生系统 Vibrator)
  try {
    if (type === 'item_complete') {
      await tauriImpact('medium');
      return true;
    }
    if (type === 'all_complete') {
      await tauriNotification('success');
      return true;
    }
    if (type === 'reorder' || type === 'timer_switch' || type === 'selection') {
      await tauriSelection();
      return true;
    }
    if (type === 'page_switch') {
      await tauriImpact('light');
      return true;
    }
    if (type === 'test') {
      await tauriVibrate(80);
      return true;
    }
  } catch {
    // 非 Tauri 原生环境或插件未初始化，自动转入 Web API 兜底
  }

  // 2. 兜底使用 HTML5 标准 Vibration API (Android Chrome / WebView / PWA)
  try {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      switch (type) {
        case 'item_complete':
          // 单个项完成：短促清脆振动
          return navigator.vibrate(45);
        case 'all_complete':
          // 全部完成：成功三连震
          return navigator.vibrate([45, 60, 45, 60, 110]);
        case 'reorder':
          // 拖拽落位：极轻微震动
          return navigator.vibrate(18);
        case 'timer_switch':
          // 切换计时器：轻快微震
          return navigator.vibrate(14);
        case 'page_switch':
          // 切换页面：轻量触感
          return navigator.vibrate(22);
        case 'test':
          // 测试振动：明显双击
          return navigator.vibrate([60, 80, 80]);
        default:
          return navigator.vibrate(45);
      }
    }
  } catch (error) {
    console.warn('[Vibration] 调用系统振动 API 失败:', error);
  }

  return false;
}

/**
 * 轻触轻微振动反馈快捷方法
 */
export function vibrateLight(): void {
  void triggerHaptic('reorder');
}
