import { create } from 'zustand';
import {
  DEFAULT_FULLSCREEN_SETTINGS,
  type FontSize,
  type FullscreenSettings,
} from '@/domain/settings';

const STORAGE_KEY = 'timepulse_fullscreen_settings';

export interface FullscreenState {
  isFullscreen: boolean;
  isNativeFullscreen: boolean;
  isImmersive: boolean;
  isHeaderVisible: boolean;
  headerHideDelay: number;
  timerFontSize: FontSize;
  labelFontSize: FontSize;
  isLoading: boolean;

  setHeaderHideDelay: (delay: number) => void;
  setTimerFontSize: (size: FontSize) => void;
  setLabelFontSize: (size: FontSize) => void;
  showHeader: () => void;
  hideHeader: () => void;
  toggleFullscreen: () => void;
  resetToDefaults: () => void;
  setNativeFullscreen: (isNative: boolean) => void;
}

function readInitialFullscreenSettings(): FullscreenSettings {
  if (typeof window === 'undefined') return DEFAULT_FULLSCREEN_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          ...DEFAULT_FULLSCREEN_SETTINGS,
          ...(parsed as Partial<FullscreenSettings>),
          fontSize: {
            ...DEFAULT_FULLSCREEN_SETTINGS.fontSize,
            ...((parsed as Partial<FullscreenSettings>).fontSize || {}),
          },
        };
      }
    }
  } catch (error) {
    console.error('读取全屏设置失败:', error);
  }
  return DEFAULT_FULLSCREEN_SETTINGS;
}

function saveFullscreenSettings(settings: FullscreenSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('保存全屏设置失败:', error);
  }
}

const initialSettings = readInitialFullscreenSettings();

export const useFullscreenStore = create<FullscreenState>((set, get) => ({
  isFullscreen: false,
  isNativeFullscreen: false,
  isImmersive: false,
  isHeaderVisible: true,
  headerHideDelay: initialSettings.headerHideDelay,
  timerFontSize: initialSettings.fontSize.timer,
  labelFontSize: initialSettings.fontSize.label,
  isLoading: false,

  setNativeFullscreen: (isNativeFullscreen: boolean) => {
    set((state) => ({
      isNativeFullscreen,
      isFullscreen: isNativeFullscreen || state.isImmersive,
      isHeaderVisible: true,
    }));
  },

  setHeaderHideDelay: (headerHideDelay: number) => {
    set({ headerHideDelay });
    const { timerFontSize, labelFontSize } = get();
    saveFullscreenSettings({
      headerHideDelay,
      fontSize: { timer: timerFontSize, label: labelFontSize },
    });
  },

  setTimerFontSize: (timerFontSize: FontSize) => {
    set({ timerFontSize });
    const { headerHideDelay, labelFontSize } = get();
    saveFullscreenSettings({
      headerHideDelay,
      fontSize: { timer: timerFontSize, label: labelFontSize },
    });
  },

  setLabelFontSize: (labelFontSize: FontSize) => {
    set({ labelFontSize });
    const { headerHideDelay, timerFontSize } = get();
    saveFullscreenSettings({
      headerHideDelay,
      fontSize: { timer: timerFontSize, label: labelFontSize },
    });
  },

  showHeader: () => set({ isHeaderVisible: true }),
  hideHeader: () => set({ isHeaderVisible: false }),

  toggleFullscreen: () => {
    const { isNativeFullscreen, isImmersive } = get();

    if (isNativeFullscreen) {
      if (typeof document !== 'undefined' && document.exitFullscreen) {
        void document.exitFullscreen().catch((error: unknown) => {
          console.error('退出全屏失败:', error);
        });
      }
      return;
    }

    if (isImmersive) {
      set({
        isImmersive: false,
        isFullscreen: isNativeFullscreen,
        isHeaderVisible: true,
      });
      return;
    }

    if (typeof document === 'undefined') return;

    let request: Promise<void> | undefined;
    try {
      request = document.documentElement.requestFullscreen?.() as unknown as Promise<void> | undefined;
    } catch (error) {
      console.warn('原生全屏不可用，改用沉浸模式:', error);
      set({ isImmersive: true, isFullscreen: true });
      return;
    }

    if (!request || typeof request.then !== 'function') {
      set({ isImmersive: true, isFullscreen: true });
      return;
    }

    request
      .then(() => {
        window.setTimeout(() => {
          if (!document.fullscreenElement) {
            set({ isImmersive: true, isFullscreen: true });
          }
        }, 250);
      })
      .catch((error: unknown) => {
        console.warn('原生全屏不可用，改用沉浸模式:', error);
        set({ isImmersive: true, isFullscreen: true });
      });
  },

  resetToDefaults: () => {
    saveFullscreenSettings(DEFAULT_FULLSCREEN_SETTINGS);
    set({
      headerHideDelay: DEFAULT_FULLSCREEN_SETTINGS.headerHideDelay,
      timerFontSize: DEFAULT_FULLSCREEN_SETTINGS.fontSize.timer,
      labelFontSize: DEFAULT_FULLSCREEN_SETTINGS.fontSize.label,
    });
  },
}));

// 在浏览器环境中自动挂载 fullscreenchange 事件监听
if (typeof document !== 'undefined') {
  const handleFullscreenChange = () => {
    const isNative = Boolean(document.fullscreenElement);
    useFullscreenStore.getState().setNativeFullscreen(isNative);
  };
  document.addEventListener('fullscreenchange', handleFullscreenChange);
}

/**
 * 兼容原有 Context 的 hook
 */
export function useFullscreen() {
  const isFullscreen = useFullscreenStore((s) => s.isFullscreen);
  const isHeaderVisible = useFullscreenStore((s) => s.isHeaderVisible);
  const headerHideDelay = useFullscreenStore((s) => s.headerHideDelay);
  const timerFontSize = useFullscreenStore((s) => s.timerFontSize);
  const labelFontSize = useFullscreenStore((s) => s.labelFontSize);
  const isLoading = useFullscreenStore((s) => s.isLoading);

  const setHeaderHideDelay = useFullscreenStore((s) => s.setHeaderHideDelay);
  const setTimerFontSize = useFullscreenStore((s) => s.setTimerFontSize);
  const setLabelFontSize = useFullscreenStore((s) => s.setLabelFontSize);
  const showHeader = useFullscreenStore((s) => s.showHeader);
  const hideHeader = useFullscreenStore((s) => s.hideHeader);
  const toggleFullscreen = useFullscreenStore((s) => s.toggleFullscreen);
  const resetToDefaults = useFullscreenStore((s) => s.resetToDefaults);

  return {
    isFullscreen,
    isHeaderVisible,
    headerHideDelay,
    timerFontSize,
    labelFontSize,
    isLoading,
    setHeaderHideDelay,
    setTimerFontSize,
    setLabelFontSize,
    showHeader,
    hideHeader,
    toggleFullscreen,
    resetToDefaults,
  };
}
