import { createContext, type ReactNode } from 'react';
import type { FontSize } from '@/domain/settings';
import { useFullscreen, useFullscreenStore } from '@/stores/useFullscreenStore';

export type FullscreenContextValue = {
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
  const value = useFullscreen();

  return (
    <FullscreenContext.Provider value={value}>
      {children}
    </FullscreenContext.Provider>
  );
}

export { useFullscreen, useFullscreenStore };

export default FullscreenContext;
