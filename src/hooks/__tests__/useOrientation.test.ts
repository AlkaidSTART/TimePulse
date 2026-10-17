import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOrientation, isMobileDevice } from '../useOrientation';

describe('useOrientation hook', () => {
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete document.documentElement.dataset.orientation;
    delete document.documentElement.dataset.mobileLandscape;
    delete document.documentElement.dataset.simulatedOrientation;

    // Simulate mobile portrait dimensions by default
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 844 });
  });

  afterEach(() => {
    delete document.documentElement.dataset.orientation;
    delete document.documentElement.dataset.mobileLandscape;
    delete document.documentElement.dataset.simulatedOrientation;
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: originalWidth });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: originalHeight });
  });

  it('initializes with portrait orientation by default on portrait viewport', () => {
    const { result } = renderHook(() => useOrientation());
    expect(result.current.orientation).toBe('portrait');
    expect(result.current.isPortrait).toBe(true);
    expect(result.current.isLandscape).toBe(false);
  });

  it('detects landscape when viewport is landscape', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 844 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 390 });

    const { result } = renderHook(() => useOrientation());
    expect(result.current.orientation).toBe('landscape');
    expect(result.current.isLandscape).toBe(true);
    expect(result.current.isPortrait).toBe(false);
    expect(result.current.isMobileLandscape).toBe(true);
  });

  it('toggles to landscape and sets simulated orientation fallback if native lock not available', async () => {
    const { result } = renderHook(() => useOrientation());
    expect(result.current.isLandscape).toBe(false);

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

  it('unlocks orientation and cleans up simulated orientation', async () => {
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
