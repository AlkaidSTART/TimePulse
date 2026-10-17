import { renderHook, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGlobalTouchGestures } from '../useGlobalTouchGestures';
import { useNavigationStore } from '@/stores/useNavigationStore';
import { useFullscreenStore } from '@/stores/useFullscreenStore';
import * as vibration from '@/services/vibration';

vi.mock('@/services/vibration', () => ({
  triggerHaptic: vi.fn(),
}));

describe('useGlobalTouchGestures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = '#main';
    useNavigationStore.getState().setView('main');
    useFullscreenStore.setState({ isFullscreen: false, isImmersive: false });

    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 844 });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function simulateSwipe(startX: number, startY: number, endX: number, endY: number, target: HTMLElement = document.body) {
    const touchStartEvent = new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [{ clientX: startX, clientY: startY, target } as unknown as Touch],
    });
    target.dispatchEvent(touchStartEvent);

    const touchEndEvent = new TouchEvent('touchend', {
      bubbles: true,
      cancelable: true,
      changedTouches: [{ clientX: endX, clientY: endY, target } as unknown as Touch],
    });
    target.dispatchEvent(touchEndEvent);
  }

  function simulateTap(x: number, y: number, target: HTMLElement = document.body) {
    simulateSwipe(x, y, x + 2, y + 2, target);
  }

  it('switches between timers on main page when multiple timers exist', () => {
    const onNextTimer = vi.fn();
    const onPrevTimer = vi.fn();

    renderHook(() =>
      useGlobalTouchGestures({
        timersCount: 3,
        activeTimerIndex: 1,
        onNextTimer,
        onPrevTimer,
      }),
    );

    // Swipe left (next timer)
    act(() => {
      simulateSwipe(200, 300, 100, 305);
    });

    expect(onNextTimer).toHaveBeenCalledTimes(1);
    expect(vibration.triggerHaptic).toHaveBeenCalledWith('timer_switch');

    // Swipe right (prev timer)
    act(() => {
      simulateSwipe(100, 300, 200, 295);
    });

    expect(onPrevTimer).toHaveBeenCalledTimes(1);
    expect(vibration.triggerHaptic).toHaveBeenCalledWith('timer_switch');
  });

  it('switches to todo page when swiping left on the last timer or on single timer', () => {
    const onNextTimer = vi.fn();

    renderHook(() =>
      useGlobalTouchGestures({
        timersCount: 2,
        activeTimerIndex: 1, // last timer
        onNextTimer,
      }),
    );

    // Swipe left at boundary
    act(() => {
      simulateSwipe(250, 300, 150, 300);
    });

    expect(useNavigationStore.getState().view).toBe('todo');
    expect(vibration.triggerHaptic).toHaveBeenCalledWith('page_switch');
  });

  it('switches to cheer page when swiping right on the first timer', () => {
    const onPrevTimer = vi.fn();

    renderHook(() =>
      useGlobalTouchGestures({
        timersCount: 3,
        activeTimerIndex: 0, // first timer
        onPrevTimer,
      }),
    );

    act(() => {
      simulateSwipe(150, 300, 250, 300);
    });

    expect(useNavigationStore.getState().view).toBe('cheer');
    expect(vibration.triggerHaptic).toHaveBeenCalledWith('page_switch');
  });

  it('navigates through global pages on swipe in cheer, todo, settings', () => {
    renderHook(() => useGlobalTouchGestures());

    const transitionSpy = vi.spyOn(useNavigationStore.getState(), 'transitionTo');

    // 1. From cheer, swipe left -> main
    useNavigationStore.setState({ view: 'cheer' });
    act(() => {
      simulateSwipe(250, 300, 150, 300);
    });
    expect(transitionSpy).toHaveBeenCalledWith('main');

    // 2. From todo, swipe right -> main
    transitionSpy.mockClear();
    useNavigationStore.setState({ view: 'todo' });
    act(() => {
      simulateSwipe(150, 300, 250, 300);
    });
    expect(transitionSpy).toHaveBeenCalledWith('main');

    // 3. From todo, swipe left -> settings
    transitionSpy.mockClear();
    useNavigationStore.setState({ view: 'todo' });
    act(() => {
      simulateSwipe(250, 300, 150, 300);
    });
    expect(transitionSpy).toHaveBeenCalledWith('settings');

    // 4. From settings, swipe right -> todo
    transitionSpy.mockClear();
    useNavigationStore.setState({ view: 'settings' });
    act(() => {
      simulateSwipe(150, 300, 250, 300);
    });
    expect(transitionSpy).toHaveBeenCalledWith('todo');
  });

  it('exits fullscreen when pulling down in fullscreen mode', () => {
    useFullscreenStore.setState({ isFullscreen: true, isImmersive: true });
    const toggleFullscreenSpy = vi.spyOn(useFullscreenStore.getState(), 'toggleFullscreen');

    renderHook(() => useGlobalTouchGestures());

    act(() => {
      // Pull down from upper half of screen
      simulateSwipe(190, 80, 190, 180);
    });

    expect(toggleFullscreenSpy).toHaveBeenCalled();
    expect(vibration.triggerHaptic).toHaveBeenCalledWith('page_switch');
  });

  it('toggles fullscreen on double tap in non-interactive area', () => {
    const toggleFullscreenSpy = vi.spyOn(useFullscreenStore.getState(), 'toggleFullscreen');

    renderHook(() => useGlobalTouchGestures());

    act(() => {
      // Tap 1
      simulateTap(200, 300);
    });

    act(() => {
      // Tap 2 within 300ms
      simulateTap(202, 301);
    });

    expect(toggleFullscreenSpy).toHaveBeenCalled();
    expect(vibration.triggerHaptic).toHaveBeenCalledWith('page_switch');
  });

  it('ignores swipes originating from input elements or interactive buttons', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    renderHook(() => useGlobalTouchGestures());

    const transitionSpy = vi.spyOn(useNavigationStore.getState(), 'transitionTo');
    useNavigationStore.setState({ view: 'todo' });

    act(() => {
      simulateSwipe(150, 300, 250, 300, input);
    });

    // View should remain 'todo', no swipe navigation triggered
    expect(transitionSpy).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });
});
