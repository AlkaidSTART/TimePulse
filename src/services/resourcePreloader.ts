import { preloadTranslations } from '@/i18n/useTranslation';
import { warmUpDatabase } from './db';
import imageStorage from './imageStorage';

const CRITICAL_IMAGES = [
  '/website-qr.png',
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
  if (typeof window === 'undefined') return;

  const runIdle = (task: () => void, delayMs: number) => {
    window.setTimeout(() => {
      const winWithIdle = window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
      };
      if (typeof winWithIdle.requestIdleCallback === 'function') {
        winWithIdle.requestIdleCallback(task, { timeout: 3000 });
      } else {
        window.setTimeout(task, 100);
      }
    }, delayMs);
  };

  // Stagger preloading to begin after splash animation finishes (~1.8s)
  // Step 1: Preload the most frequent user action flow (Timer creation & Todo)
  runIdle(() => {
    void import('@/features/timer-management/components/TimerCreationFlow');
    void import('@/features/todo/components/TodoPage');
  }, 2200);

  // Step 2: Preload secondary modals gradually
  runIdle(() => {
    void import('@/features/todo/components/TodoListWidget');
    void import('@/features/background/components/BackgroundSettingsModal');
  }, 3800);
}

/**
 * Main preloading coordinator triggered during the splash screen / opening animation.
 * Loads critical images, user background, i18n dictionaries, component chunks, and warms DB.
 */
export function preloadCriticalResources(): void {
  if (isPreloaded || typeof window === 'undefined') return;
  isPreloaded = true;

  // 1. Warm up the platform database connection non-blockingly (IndexedDB / SQLite)
  void warmUpDatabase().catch(() => {});

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
