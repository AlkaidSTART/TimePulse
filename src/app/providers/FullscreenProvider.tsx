import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_FULLSCREEN_SETTINGS, type FontSize, type FullscreenSettings } from '@/domain/settings';

const STORAGE_KEY = 'timepulse_fullscreen_settings';

type FullscreenContextValue = {
  isFullscreen: boolean;
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
};

const FullscreenContext = createContext<FullscreenContextValue | null>(null);

export function FullscreenProvider({ children }: { children: ReactNode }) {
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  // 沉浸模式：WebView 不支持原生全屏（Tauri Android 的 wry 会立刻取消自定义视图）时的降级方案。
  const [isImmersive, setIsImmersive] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [settings, setSettings] = useState<FullscreenSettings>(DEFAULT_FULLSCREEN_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (typeof parsed === 'object' && parsed !== null) {
          setSettings((previous) => ({ ...previous, ...(parsed as Partial<FullscreenSettings>) }));
        }
      }
    } catch (error) {
      console.error('读取全屏设置失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (error) {
        console.error('保存全屏设置失败:', error);
      }
    }
  }, [settings, isLoading]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsNativeFullscreen(Boolean(document.fullscreenElement));
      setIsHeaderVisible(true);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    handleFullscreenChange();
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const showHeader = useCallback(() => setIsHeaderVisible(true), []);
  const hideHeader = useCallback(() => setIsHeaderVisible(false), []);

  // 优先使用原生 Fullscreen API；不可用或不生效时退化为沉浸模式（隐藏顶栏，只留计时器）。
  const toggleFullscreen = useCallback(() => {
    if (isNativeFullscreen) {
      void document.exitFullscreen().catch((error: unknown) => {
        console.error('退出全屏失败:', error);
      });
      return;
    }

    if (isImmersive) {
      setIsImmersive(false);
      setIsHeaderVisible(true);
      return;
    }

    let request: Promise<void> | undefined;
    try {
      request = document.documentElement.requestFullscreen?.() as unknown as Promise<void> | undefined;
    } catch (error) {
      console.warn('原生全屏不可用，改用沉浸模式:', error);
      setIsImmersive(true);
      return;
    }

    // 旧版 WebView 的 requestFullscreen 可能返回 undefined
    if (!request || typeof request.then !== 'function') {
      setIsImmersive(true);
      return;
    }

    request
      .then(() => {
        // 有的 WebView 会接受请求后立刻回退，稍后校验真实状态再决定是否进入沉浸模式
        window.setTimeout(() => {
          if (!document.fullscreenElement) setIsImmersive(true);
        }, 250);
      })
      .catch((error: unknown) => {
        console.warn('原生全屏不可用，改用沉浸模式:', error);
        setIsImmersive(true);
      });
  }, [isNativeFullscreen, isImmersive]);

  const isFullscreen = isNativeFullscreen || isImmersive;

  const value: FullscreenContextValue = {
    isFullscreen,
    isHeaderVisible,
    headerHideDelay: settings.headerHideDelay,
    timerFontSize: settings.fontSize.timer,
    labelFontSize: settings.fontSize.label,
    isLoading,
    setHeaderHideDelay: (headerHideDelay) => setSettings((previous) => ({ ...previous, headerHideDelay })),
    setTimerFontSize: (timer) => setSettings((previous) => ({ ...previous, fontSize: { ...previous.fontSize, timer } })),
    setLabelFontSize: (label) => setSettings((previous) => ({ ...previous, fontSize: { ...previous.fontSize, label } })),
    showHeader,
    hideHeader,
    toggleFullscreen,
    resetToDefaults: () => setSettings(DEFAULT_FULLSCREEN_SETTINGS),
  };

  return <FullscreenContext.Provider value={value}>{children}</FullscreenContext.Provider>;
}

export function useFullscreen(): FullscreenContextValue {
  const context = useContext(FullscreenContext);
  if (!context) throw new Error('useFullscreen must be used within FullscreenProvider');
  return context;
}

export default FullscreenContext;
