import type { Language } from '@/i18n/types';
import {
  isPermissionGranted as tauriIsPermissionGranted,
  requestPermission as tauriRequestPermission,
  sendNotification as tauriSendNotification,
  cancel as tauriCancelNotification,
  createChannel as tauriCreateChannel,
  Importance,
  Visibility,
  Schedule as TauriSchedule,
} from '@tauri-apps/plugin-notification';

export interface CountdownNotification {
  id: string;
  title: string;
  targetTime: number;
}

export interface NotificationResult {
  success: boolean;
  needsPermission: boolean;
}

const NOTIFICATION_PREFERENCE_KEY = 'timepulse_notification_preference';
const pendingNotifications: Array<Record<string, string | number>> = [];
let notificationTranslations: Record<string, unknown> | null = null;

function getCurrentLanguage(): Language {
  if (typeof window === 'undefined') return 'zh-CN';
  const value = new URLSearchParams(window.location.search).get('lang');
  return value === 'en-US' ? 'en-US' : 'zh-CN';
}

async function loadNotificationTranslations(): Promise<Record<string, unknown>> {
  if (notificationTranslations) return notificationTranslations;
  try {
    const locale = getCurrentLanguage() === 'en-US' ? 'en' : 'zh';
    const response = await fetch(`/locales/${locale}/common.json`);
    if (!response.ok) throw new Error(`Failed to load ${locale} translations`);
    const value: unknown = await response.json();
    if (typeof value !== 'object' || value === null) throw new Error('Invalid translations');
    notificationTranslations = value as Record<string, unknown>;
    return notificationTranslations;
  } catch (error) {
    console.error('Failed to load notification translations:', error);
    return {
      notification: {
        messages: {
          countdownEnded: '倒计时结束',
          countdownEndedBody: '您设置的倒计时"{title}"已经结束。',
          testNotification: '通知测试',
          testNotificationBody: '这是一个测试通知，用于验证通知功能是否正常工作。',
        },
      },
    };
  }
}

function getNestedValue(value: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (typeof current !== 'object' || current === null) return null;
    return key in current ? (current as Record<string, unknown>)[key] : null;
  }, value);
}

async function getLocalizedNotificationMessage(key: string, replacements: Record<string, string> = {}): Promise<string> {
  const translations = await loadNotificationTranslations();
  const message = getNestedValue(translations, key);
  if (typeof message !== 'string') {
    console.warn(`Translation not found for key: ${key}`);
    return key;
  }
  return Object.entries(replacements).reduce(
    (result, [placeholder, replacement]) => result.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), replacement),
    message,
  );
}

export function clearNotificationTranslationsCache(): void {
  notificationTranslations = null;
  console.log('通知翻译缓存已清除');
}

export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function hashStringToId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

let tauriChannelInitialized = false;

export async function setupTauriNotificationChannel(): Promise<void> {
  if (!isTauriEnvironment() || tauriChannelInitialized) return;
  try {
    await tauriCreateChannel({
      id: 'timepulse_countdown',
      name: '倒计时提醒',
      description: 'TimePulse 倒计时结束与定时通知',
      importance: Importance.High,
      visibility: Visibility.Public,
      vibration: true,
      lights: true,
    });
    tauriChannelInitialized = true;
  } catch (error) {
    // 非 Android 或渠道已存在，静默处理
    tauriChannelInitialized = true;
  }
}

const tauriTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function getNotificationPreference(): string {
  if (typeof window === 'undefined') return 'not_set';
  return localStorage.getItem(NOTIFICATION_PREFERENCE_KEY) || 'not_set';
}

export function setNotificationPreference(preference: 'allowed' | 'denied'): void {
  if (typeof window !== 'undefined') localStorage.setItem(NOTIFICATION_PREFERENCE_KEY, preference);
}

export function shouldShowNotificationModal(): boolean {
  if (typeof window === 'undefined') return false;
  if (getNotificationPreference() === 'denied') return false;

  // 在 Tauri 原生环境中，只要未明确拒绝/允许，就可引导用户授权
  if (isTauriEnvironment()) {
    return getNotificationPreference() !== 'allowed';
  }

  if (!('Notification' in window)) return false;
  return Notification.permission !== 'granted' && Notification.permission !== 'denied';
}

async function checkNotificationPermission(): Promise<boolean> {
  if (isTauriEnvironment()) {
    try {
      return await tauriIsPermissionGranted();
    } catch (error) {
      console.warn('Tauri 检查通知权限失败:', error);
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('此环境不支持通知');
    return false;
  }
  console.log('当前通知权限状态:', Notification.permission);
  return Notification.permission === 'granted';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isTauriEnvironment()) {
    try {
      await setupTauriNotificationChannel();
      let granted = await tauriIsPermissionGranted();
      if (!granted) {
        const permission = await tauriRequestPermission();
        granted = permission === 'granted';
      }
      return granted;
    } catch (error) {
      console.error('Tauri 请求通知权限失败:', error);
      return false;
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('此环境不支持通知');
    return false;
  }
  if (Notification.permission === 'granted') return true;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch (error) {
    console.error('请求通知权限失败:', error);
    return false;
  }
}

export async function scheduleCountdownNotification(
  countdown: CountdownNotification,
  skipPermissionCheck = false,
): Promise<NotificationResult> {
  console.log('scheduleCountdownNotification 被调用:', { countdown, skipPermissionCheck });
  if (!countdown?.targetTime || !countdown.title) {
    console.error('无效的倒计时数据:', countdown);
    return { success: false, needsPermission: false };
  }

  if (!skipPermissionCheck && shouldShowNotificationModal()) {
    console.log('需要显示权限弹窗');
    window.dispatchEvent(new CustomEvent('needNotificationPermission', { detail: { countdown } }));
    return { success: false, needsPermission: true };
  }

  if (!(await checkNotificationPermission())) {
    console.log('无法设置通知：权限未获取');
    return { success: false, needsPermission: false };
  }

  const title = await getLocalizedNotificationMessage('notification.messages.countdownEnded');
  const body = await getLocalizedNotificationMessage('notification.messages.countdownEndedBody', { title: countdown.title });

  // 1. 优先使用 Tauri 移动端/桌面原生通知系统
  if (isTauriEnvironment()) {
    try {
      await setupTauriNotificationChannel();
      const numericId = hashStringToId(countdown.id);
      const delay = countdown.targetTime - Date.now();

      if (delay <= 0) {
        tauriSendNotification({
          id: numericId,
          channelId: 'timepulse_countdown',
          title,
          body,
        });
      } else {
        try {
          // 针对移动端原生（Android / iOS）调度
          tauriSendNotification({
            id: numericId,
            channelId: 'timepulse_countdown',
            title,
            body,
            schedule: TauriSchedule.at(new Date(countdown.targetTime)),
          });
        } catch {
          // 桌面端或平台 Schedule 不支持时，降级使用定时器调度
          if (tauriTimers.has(countdown.id)) {
            clearTimeout(tauriTimers.get(countdown.id));
          }
          const timerId = setTimeout(() => {
            try {
              tauriSendNotification({
                id: numericId,
                channelId: 'timepulse_countdown',
                title,
                body,
              });
            } catch (err) {
              console.error('Tauri 延时通知发送失败:', err);
            }
            tauriTimers.delete(countdown.id);
          }, delay);
          tauriTimers.set(countdown.id, timerId);
        }
      }
      return { success: true, needsPermission: false };
    } catch (error) {
      console.error('Tauri 设置通知失败:', error);
    }
  }

  // 2. 兜底使用 Web Service Worker 通知 (PWA / Web) 或原生 Web Notification
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const delay = countdown.targetTime - Date.now();
      if (delay <= 0) {
        try {
          new Notification(title, { body });
          return { success: true, needsPermission: false };
        } catch {
          return { success: false, needsPermission: false };
        }
      } else {
        setTimeout(() => {
          try {
            new Notification(title, { body });
          } catch (e) {
            console.error('发送通知失败:', e);
          }
        }, delay);
        return { success: true, needsPermission: false };
      }
    }
    console.log('此环境不支持Service Worker，无法设置通知');
    return { success: false, needsPermission: false };
  }

  const notificationData = {
    action: 'scheduleNotification',
    title,
    body,
    timestamp: countdown.targetTime,
    id: countdown.id,
  };
  console.log('准备发送通知数据到Service Worker:', notificationData);

  if (navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage(notificationData);
      console.log('已设置倒计时通知:', countdown.title);
      return { success: true, needsPermission: false };
    } catch (error) {
      console.error('发送消息到Service Worker失败:', error);
      return { success: false, needsPermission: false };
    }
  }

  pendingNotifications.push(notificationData);
  void navigator.serviceWorker.ready.then(() => {
    const checkController = () => {
      if (navigator.serviceWorker.controller) {
        while (pendingNotifications.length > 0) {
          const notification = pendingNotifications.shift();
          if (notification) navigator.serviceWorker.controller.postMessage(notification);
        }
      } else {
        setTimeout(checkController, 500);
      }
    };
    checkController();
  }).catch((error: unknown) => console.error('Service Worker ready 错误:', error));

  return { success: true, needsPermission: false };
}

export function cancelCountdownNotification(countdownId: string): void {
  console.log('取消通知:', countdownId);
  if (isTauriEnvironment()) {
    try {
      const numericId = hashStringToId(countdownId);
      void tauriCancelNotification([numericId]);
      if (tauriTimers.has(countdownId)) {
        clearTimeout(tauriTimers.get(countdownId));
        tauriTimers.delete(countdownId);
      }
    } catch (e) {
      console.warn('Tauri 取消通知失败:', e);
    }
  }

  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.controller?.postMessage({ action: 'cancelNotification', id: countdownId });
  void navigator.serviceWorker.ready.then((registration) => {
    void registration.getNotifications({ tag: countdownId }).then((notifications) => {
      notifications.forEach((notification) => notification.close());
    });
  });
}

export async function testNotification(): Promise<boolean> {
  console.log('开始测试通知功能...');
  const title = await getLocalizedNotificationMessage('notification.messages.testNotification');
  const body = await getLocalizedNotificationMessage('notification.messages.testNotificationBody');

  if (isTauriEnvironment()) {
    const granted = await requestNotificationPermission();
    if (!granted) return false;
    await setupTauriNotificationChannel();
    try {
      tauriSendNotification({
        id: Math.floor(Math.random() * 100000),
        channelId: 'timepulse_countdown',
        title,
        body,
      });
      return true;
    } catch (e) {
      console.error('Tauri 测试通知失败:', e);
      return false;
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') return false;
  if (!navigator.serviceWorker?.controller) {
    try {
      new Notification(title, { body });
      return true;
    } catch (e) {
      console.error('Web 测试通知发送失败:', e);
      return false;
    }
  }
  navigator.serviceWorker.controller.postMessage({
    action: 'scheduleNotification',
    title,
    body,
    timestamp: Date.now() + 1000,
    id: `test-${Date.now()}`,
  });
  return true;
}
