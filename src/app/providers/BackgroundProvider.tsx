import { createContext, type ReactNode } from 'react';
import type { BackgroundMode, BackgroundSettings, BackgroundType } from '@/domain/settings';
import { useBackground, useBackgroundStore } from '@/stores/useBackgroundStore';

export type BackgroundContextValue = {
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
};

const BackgroundContext = createContext<BackgroundContextValue | null>(null);

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const value = useBackground();

  return (
    <BackgroundContext.Provider value={value}>
      {children}
    </BackgroundContext.Provider>
  );
}

export { useBackground, useBackgroundStore };

export default BackgroundContext;
