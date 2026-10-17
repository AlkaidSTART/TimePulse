import { renderHook, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePlatformShortcuts } from '../usePlatformShortcuts';
import { useFullscreenStore } from '@/stores/useFullscreenStore';
import { useTimerStore } from '@/stores/useTimerStore';
import type { StopwatchTimer } from '@/domain/timer';

describe('usePlatformShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFullscreenStore.setState({ isFullscreen: false, isImmersive: false });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('triggers toggleFullscreen when F11 key is pressed', () => {
    const toggleSpy = vi.spyOn(useFullscreenStore.getState(), 'toggleFullscreen');
    renderHook(() => usePlatformShortcuts());

    const event = new KeyboardEvent('keydown', { key: 'F11', cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(toggleSpy).toHaveBeenCalledTimes(1);
  });

  it('exits fullscreen when Escape key is pressed while in fullscreen', () => {
    useFullscreenStore.setState({ isFullscreen: true, isImmersive: false });
    const toggleSpy = vi.spyOn(useFullscreenStore.getState(), 'toggleFullscreen');
    renderHook(() => usePlatformShortcuts());

    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(toggleSpy).toHaveBeenCalledTimes(1);
  });

  it('controls stopwatch start/pause when Space is pressed outside inputs', () => {
    const stopwatchTimer: StopwatchTimer = {
      id: 'sw-1',
      name: '测试秒表',
      type: 'stopwatch',
      color: '#0ea5e9',
      isRunning: false,
      startTime: new Date().toISOString(),
      totalPausedTime: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    useTimerStore.setState({
      timers: [stopwatchTimer],
      activeTimerId: 'sw-1',
    });

    const updateTimerSpy = vi.spyOn(useTimerStore.getState(), 'updateTimer');
    renderHook(() => usePlatformShortcuts());

    const event = new KeyboardEvent('keydown', { key: ' ', code: 'Space', cancelable: true });
    window.dispatchEvent(event);

    expect(updateTimerSpy).toHaveBeenCalledWith('sw-1', expect.objectContaining({ isRunning: true }));
  });

  it('prevents default on Ctrl+Wheel event to avoid accidental browser zoom', () => {
    renderHook(() => usePlatformShortcuts());

    const event = new WheelEvent('wheel', { ctrlKey: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
