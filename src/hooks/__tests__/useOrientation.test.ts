import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOrientation, isMobileDevice } from '../useOrientation';

describe('useOrientation hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete document.documentElement.dataset.orientation;
    delete document.documentElement.dataset.mobileLandscape;
    delete document.documentElement.dataset.simulatedOrientation;
  });

  afterEach(() => {
    delete document.documentElement.dataset.orientation;
    delete document.documentElement.dataset.mobileLandscape;
    delete document.documentElement.dataset.simulatedOrientation;
  });

  it('initializes with portrait orientation by default in standard test environment', () => {
    const { result } = renderHook(() => useOrientation());
    expect(result.current.orientation).toBe('portrait');
    expect(result.current.isPortrait).toBe(true);
    expect(result.current.isLandscape).toBe(false);
  });

  it('toggles to landscape and sets simulated orientation fallback if native lock not available', async () => {
    const { result } = renderHook(() => useOrientation());

    await act(async () => {
      await result.current.toggleOrientation();
    });

    expect(result.current.isLandscape).toBe(true);
    expect(result.current.orientation).toBe('landscape');
    expect(document.documentElement.dataset.orientation).toBe('landscape');
  });

  it('toggles back to portrait after toggling to landscape', async () => {
    const { result } = renderHook(() => useOrientation());

    await act(async () => {
      await result.current.toggleOrientation();
    });
    expect(result.current.isLandscape).toBe(true);

    await act(async () => {
      await result.current.toggleOrientation();
    });
    expect(result.current.isPortrait).toBe(true);
    expect(result.current.orientation).toBe('portrait');
  });

  it('un为其解锁 orientation 并清理 simulated orientation', async () => {
    const { result } = renderHook(() => useOrientation());

    await act(async () => {
      await result.current.lockOrientation('landscape');
    });
    expect(result.current.isLandscape).toBe(true);

    await act(async () => {
      await result.current.unlockOrientation();
    });
    expect(document.documentElement.dataset.simulatedOrientation).toBeUndefined();
  });
});
