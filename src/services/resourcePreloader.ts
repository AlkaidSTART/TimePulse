import { preloadTranslations } from '@/i18n/useTranslation';
import imageStorage from './imageStorage';
import { openTimePulseDatabase } from './storage';

const CRITICAL_IMAGES = [
  '/logo.png',
  '/website-qr.png',
  '/qrcode.png',
  '/favicon-32x32.png',
];

let isPreloaded = false;

/**
 * Preloads an image into the browser cache non-blockingly
 */
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

/**
 * Preload the custom background image if configured by the user
 */
async function preloadCustomBackground(): Promise<void> {
  try {
    const raw = localStorage.getItem('timepulse_background_settings');
    if (!raw) return;
    const settings = JSON.parse(raw) as { customBackgroundId?: string; backgroundType?: string };
    if (settings.customBackgroundId && settings.backgroundType === 'custom') {
      const data = await imageStorage.getImage(settings.customBackgroundId);
      if (data?.url) {
        await preloadImage(data.url);
      }
    }
  } catch {
    // Non-critical background failure, ignore
  }
}

/**
 * Preload critical dynamic components into browser module cache
 */
function preloadLazyComponents(): void {
  // Use requestIdleCallback or setTimeout to yield to the main thread during animations
  const idle = typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 100);

  idle(() => {
    // Preload timer creation modals
    void import('@/features/timer-management/components/TimerCreationFlow');
    // Preload sharing modal
    void import('@/features/sharing/components/ShareModal');
    // Preload background modal
    void import('@/features/background/components/BackgroundSettingsModal');
    // Preload fullscreen settings modal
    void import('@/features/fullscreen/components/FullscreenSettingsModal');
    // Preload todo components
    void import('@/features/todo/components/TodoPage');
    void import('@/features/todo/components/TodoListWidget');
    // Preload version modal
    void import('@/features/version/components/AboutVersionModal');
  });
}

/**
 * Main preloading coordinator triggered during the splash screen / opening animation.
 * Loads critical images, user background, i18n dictionaries, component chunks, and warms DB.
 */
export function preloadCriticalResources(): void {
  if (isPreloaded || typeof window === 'undefined') return;
  isPreloaded = true;

  // 1. Warm up IndexedDB connection non-blockingly
  void openTimePulseDatabase().catch(() => {});

  // 2. Preload i18n translations
  void preloadTranslations('zh-CN');
  void preloadTranslations('en-US');

  // 3. Preload critical images
  CRITICAL_IMAGES.forEach((src) => {
    void preloadImage(src);
  });

  // 4. Preload custom background image from IndexedDB if exists
  void preloadCustomBackground();

  // 5. Preload lazy component chunks during idle time
  preloadLazyComponents();
}
