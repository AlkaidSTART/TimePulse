import { create } from 'zustand';
import {
  DEFAULT_BACKGROUND_SETTINGS,
  type BackgroundMode,
  type BackgroundSettings,
  type BackgroundType,
} from '@/domain/settings';

const STORAGE_KEY = 'timepulse_background_settings';

export interface BackgroundState {
  backgroundType: BackgroundType;
  customBackgroundId: string | null;
  backgroundMode: BackgroundMode;
  bgOpacity: number;
  blurAmount: number;
  isLoading: boolean;

  setBackgroundType: (type: BackgroundType) => void;
  setCustomBackgroundId: (id: string | null) => void;
  setBackgroundMode: (mode: BackgroundMode) => void;
  setBgOpacity: (opacity: number) => void;
  setBlurAmount: (amount: number) => void;
  setBackgroundConfig: (config: Partial<BackgroundSettings>) => void;
  clearCustomBackground: () => void;
  resetToDefaults: () => void;
}

function readInitialBackgroundSettings(): BackgroundSettings {
  if (typeof window === 'undefined') return DEFAULT_BACKGROUND_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (typeof parsed === 'object' && parsed !== null) {
        return { ...DEFAULT_BACKGROUND_SETTINGS, ...(parsed as Partial<BackgroundSettings>) };
      }
    }
  } catch (error) {
    console.error('读取背景设置失败:', error);
  }
  return DEFAULT_BACKGROUND_SETTINGS;
}

function saveBackgroundSettings(settings: BackgroundSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('保存背景设置失败:', error);
  }
}

const initialSettings = readInitialBackgroundSettings();

export const useBackgroundStore = create<BackgroundState>((set, get) => ({
  backgroundType: initialSettings.backgroundType,
  customBackgroundId: initialSettings.customBackgroundId,
  backgroundMode: initialSettings.backgroundMode,
  bgOpacity: initialSettings.bgOpacity,
  blurAmount: initialSettings.blurAmount,
  isLoading: false,

  setBackgroundType: (backgroundType) => {
    set({ backgroundType });
    const { customBackgroundId, backgroundMode, bgOpacity, blurAmount } = get();
    saveBackgroundSettings({ backgroundType, customBackgroundId, backgroundMode, bgOpacity, blurAmount });
  },

  setCustomBackgroundId: (customBackgroundId) => {
    const backgroundType: BackgroundType = customBackgroundId ? 'custom' : 'gradient';
    set({ customBackgroundId, backgroundType });
    const { backgroundMode, bgOpacity, blurAmount } = get();
    saveBackgroundSettings({ backgroundType, customBackgroundId, backgroundMode, bgOpacity, blurAmount });
  },

  setBackgroundMode: (backgroundMode) => {
    set({ backgroundMode });
    const { backgroundType, customBackgroundId, bgOpacity, blurAmount } = get();
    saveBackgroundSettings({ backgroundType, customBackgroundId, backgroundMode, bgOpacity, blurAmount });
  },

  setBgOpacity: (bgOpacity) => {
    set({ bgOpacity });
    const { backgroundType, customBackgroundId, backgroundMode, blurAmount } = get();
    saveBackgroundSettings({ backgroundType, customBackgroundId, backgroundMode, bgOpacity, blurAmount });
  },

  setBlurAmount: (blurAmount) => {
    set({ blurAmount });
    const { backgroundType, customBackgroundId, backgroundMode, bgOpacity } = get();
    saveBackgroundSettings({ backgroundType, customBackgroundId, backgroundMode, bgOpacity, blurAmount });
  },

  setBackgroundConfig: (config) => {
    set((state) => {
      const updated = {
        backgroundType: config.backgroundType ?? state.backgroundType,
        customBackgroundId: config.customBackgroundId !== undefined ? config.customBackgroundId : state.customBackgroundId,
        backgroundMode: config.backgroundMode ?? state.backgroundMode,
        bgOpacity: config.bgOpacity ?? state.bgOpacity,
        blurAmount: config.blurAmount ?? state.blurAmount,
      };
      saveBackgroundSettings(updated);
      return updated;
    });
  },

  clearCustomBackground: () => {
    set((state) => {
      const updated: BackgroundSettings = {
        ...DEFAULT_BACKGROUND_SETTINGS,
        backgroundMode: state.backgroundMode,
        bgOpacity: state.bgOpacity,
      };
      saveBackgroundSettings(updated);
      return updated;
    });
  },

  resetToDefaults: () => {
    saveBackgroundSettings(DEFAULT_BACKGROUND_SETTINGS);
    set(DEFAULT_BACKGROUND_SETTINGS);
  },
}));

/**
 * 兼容原有 Context 的 hook
 */
export function useBackground() {
  const backgroundType = useBackgroundStore((s) => s.backgroundType);
  const customBackgroundId = useBackgroundStore((s) => s.customBackgroundId);
  const backgroundMode = useBackgroundStore((s) => s.backgroundMode);
  const bgOpacity = useBackgroundStore((s) => s.bgOpacity);
  const blurAmount = useBackgroundStore((s) => s.blurAmount);
  const isLoading = useBackgroundStore((s) => s.isLoading);

  const setBackgroundType = useBackgroundStore((s) => s.setBackgroundType);
  const setCustomBackgroundId = useBackgroundStore((s) => s.setCustomBackgroundId);
  const setBackgroundMode = useBackgroundStore((s) => s.setBackgroundMode);
  const setBgOpacity = useBackgroundStore((s) => s.setBgOpacity);
  const setBlurAmount = useBackgroundStore((s) => s.setBlurAmount);
  const setBackgroundConfig = useBackgroundStore((s) => s.setBackgroundConfig);
  const clearCustomBackground = useBackgroundStore((s) => s.clearCustomBackground);
  const resetToDefaults = useBackgroundStore((s) => s.resetToDefaults);

  return {
    backgroundType,
    customBackgroundId,
    backgroundMode,
    bgOpacity,
    blurAmount,
    isLoading,
    setBackgroundType,
    setCustomBackgroundId,
    setBackgroundMode,
    setBgOpacity,
    setBlurAmount,
    setBackgroundConfig,
    clearCustomBackground,
    resetToDefaults,
  };
}
