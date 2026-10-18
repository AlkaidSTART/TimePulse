import { useState, useEffect, useCallback } from 'react';

export type OrientationType = 'portrait' | 'landscape';

export interface OrientationState {
  orientation: OrientationType;
  isLandscape: boolean;
  isPortrait: boolean;
  isMobile: boolean;
  isMobileLandscape: boolean;
  angle: number;
  toggleOrientation: () => Promise<void>;
  lockOrientation: (type: OrientationType) => Promise<boolean>;
  unlockOrientation: () => Promise<void>;
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const hasCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches;
  const isTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return isMobileUA || (hasCoarsePointer && isTouchScreen) || (window.innerWidth < 1024 && isTouchScreen);
}

function getSystemOrientation(): { orientation: OrientationType; angle: number; isLandscape: boolean } {
  if (typeof window === 'undefined') {
    return { orientation: 'portrait', angle: 0, isLandscape: false };
  }

  const simulated = typeof document !== 'undefined' ? document.documentElement.dataset.simulatedOrientation : undefined;
  if (simulated === 'landscape' || simulated === 'portrait') {
    return {
      orientation: simulated,
      angle: simulated === 'landscape' ? 90 : 0,
      isLandscape: simulated === 'landscape',
    };
  }

  // 1. Check screen.orientation API
  if (window.screen?.orientation?.type) {
    const isLand = window.screen.orientation.type.startsWith('landscape');
    return {
      orientation: isLand ? 'landscape' : 'portrait',
      angle: window.screen.orientation.angle || (isLand ? 90 : 0),
      isLandscape: isLand,
    };
  }

  // 2. Check window.orientation (older iOS/Android WebViews)
  if (typeof window.orientation === 'number') {
    const isLand = Math.abs(window.orientation) === 90 || Math.abs(window.orientation) === 270;
    return {
      orientation: isLand ? 'landscape' : 'portrait',
      angle: window.orientation,
      isLandscape: isLand,
    };
  }

  // 3. Fallback: matchMedia & window dimensions
  const mql = window.matchMedia?.('(orientation: landscape)');
  const isLand = mql?.matches ?? (window.innerWidth > window.innerHeight);
  return {
    orientation: isLand ? 'landscape' : 'portrait',
    angle: isLand ? 90 : 0,
    isLandscape: isLand,
  };
}

export function useOrientation(): OrientationState {
  const [state, setState] = useState(() => {
    const sys = getSystemOrientation();
    const mobile = isMobileDevice();
    const mobileLandscape = sys.isLandscape && (typeof window !== 'undefined' ? window.innerHeight <= 640 || mobile : mobile);
    return {
      ...sys,
      isPortrait: !sys.isLandscape,
      isMobile: mobile,
      isMobileLandscape: mobileLandscape,
    };
  });

  const updateOrientation = useCallback(() => {
    const sys = getSystemOrientation();
    const mobile = isMobileDevice();
    const simulated = typeof document !== 'undefined' ? document.documentElement.dataset.simulatedOrientation : undefined;

    const isLandscape = simulated ? simulated === 'landscape' : sys.isLandscape;
    const orientation: OrientationType = isLandscape ? 'landscape' : 'portrait';
    const mobileLandscape = isLandscape && (window.innerHeight <= 640 || mobile);

    // 仅在字段真正变化时更新 state，避免 resize 期间的无谓重渲染
    setState((prev) => (
      prev.orientation === orientation &&
      prev.angle === sys.angle &&
      prev.isLandscape === isLandscape &&
      prev.isPortrait === !isLandscape &&
      prev.isMobile === mobile &&
      prev.isMobileLandscape === mobileLandscape
        ? prev
        : {
            orientation,
            angle: sys.angle,
            isLandscape,
            isPortrait: !isLandscape,
            isMobile: mobile,
            isMobileLandscape: mobileLandscape,
          }
    ));

    if (typeof document !== 'undefined') {
      document.documentElement.dataset.orientation = orientation;
      document.documentElement.dataset.mobileLandscape = String(mobileLandscape);
    }
  }, []);

  const lockOrientation = useCallback(async (target: OrientationType): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    // 1. Try Native Screen Orientation API
    try {
      if (window.screen?.orientation && 'lock' in window.screen.orientation) {
        // Some mobile browsers require fullscreen before orientation lock
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          try {
            await document.documentElement.requestFullscreen();
          } catch {
            // Fullscreen might fail, continue attempting lock
          }
        }
        await (window.screen.orientation as any).lock(target === 'landscape' ? 'landscape' : 'portrait');
        updateOrientation();
        return true;
      }
    } catch (e) {
      console.warn('Screen orientation lock failed or not supported:', e);
    }

    // 2. Simulated orientation fallback via dataset
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.simulatedOrientation = target;
      updateOrientation();
      return true;
    }

    return false;
  }, [updateOrientation]);

  const unlockOrientation = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      if (window.screen?.orientation && 'unlock' in window.screen.orientation) {
        window.screen.orientation.unlock();
      }
    } catch {
      // ignore unlock error
    }

    if (typeof document !== 'undefined') {
      delete document.documentElement.dataset.simulatedOrientation;
      updateOrientation();
    }
  }, [updateOrientation]);

  const toggleOrientation = useCallback(async () => {
    const nextTarget: OrientationType = state.isLandscape ? 'portrait' : 'landscape';
    await lockOrientation(nextTarget);
  }, [state.isLandscape, lockOrientation]);

  useEffect(() => {
    updateOrientation();

    let rafId: number | null = null;
    const scheduleOrientationUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateOrientation();
      });
    };

    const screenOrientation = window.screen?.orientation;
    const handleOrientationChangeEvent = () => {
      // Orientation change might take a few milliseconds for viewport dimensions to settle
      scheduleOrientationUpdate();
      setTimeout(scheduleOrientationUpdate, 100);
      setTimeout(scheduleOrientationUpdate, 300);
    };

    if (screenOrientation && 'addEventListener' in screenOrientation) {
      screenOrientation.addEventListener('change', handleOrientationChangeEvent);
    }

    const mql = window.matchMedia?.('(orientation: landscape)');
    if (mql && 'addEventListener' in mql) {
      mql.addEventListener('change', handleOrientationChangeEvent);
    } else if (mql && 'addListener' in mql) {
      (mql as any).addListener(handleOrientationChangeEvent);
    }

    window.addEventListener('orientationchange', handleOrientationChangeEvent);
    window.addEventListener('resize', scheduleOrientationUpdate);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (screenOrientation && 'removeEventListener' in screenOrientation) {
        screenOrientation.removeEventListener('change', handleOrientationChangeEvent);
      }
      if (mql && 'removeEventListener' in mql) {
        mql.removeEventListener('change', handleOrientationChangeEvent);
      } else if (mql && 'removeListener' in mql) {
        (mql as any).removeListener(handleOrientationChangeEvent);
      }
      window.removeEventListener('orientationchange', handleOrientationChangeEvent);
      window.removeEventListener('resize', scheduleOrientationUpdate);
    };
  }, [updateOrientation]);

  return {
    ...state,
    toggleOrientation,
    lockOrientation,
    unlockOrientation,
  };
}

export default useOrientation;
