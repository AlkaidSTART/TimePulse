import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isHapticEnabled,
  isVibrationSupported,
  setHapticEnabled,
  triggerHaptic,
} from './vibration';

describe('vibration service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('defaults haptic feedback to enabled', () => {
    expect(isHapticEnabled()).toBe(true);
  });

  it('can enable and disable haptic feedback', () => {
    setHapticEnabled(false);
    expect(isHapticEnabled()).toBe(false);
    setHapticEnabled(true);
    expect(isHapticEnabled()).toBe(true);
  });

  it('does not trigger vibration if disabled', async () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    setHapticEnabled(false);
    const result = await triggerHaptic('item_complete');
    expect(result).toBe(false);
    expect(vibrateMock).not.toHaveBeenCalled();
  });

  it('falls back to navigator.vibrate when haptic is enabled', async () => {
    const vibrateMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    setHapticEnabled(true);
    const result = await triggerHaptic('item_complete');
    expect(result).toBe(true);
    expect(vibrateMock).toHaveBeenCalledWith(45);
  });

  it('triggers all_complete pattern on completion', async () => {
    const vibrateMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    setHapticEnabled(true);
    const result = await triggerHaptic('all_complete');
    expect(result).toBe(true);
    expect(vibrateMock).toHaveBeenCalledWith([45, 60, 45, 60, 110]);
  });

  it('correctly detects vibration support', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });
    expect(isVibrationSupported()).toBe(true);
  });

  it('warns in dev when Tauri env is present but native haptics call fails', async () => {
    const warnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn().mockReturnValue(true),
      writable: true,
      configurable: true,
    });
    // 模拟 Tauri 环境，但 __TAURI_INTERNALS__ 缺失 invoke 导致原生调用失败
    // （等价于插件未注册或 capabilities 权限缺失）
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};

    try {
      const result = await triggerHaptic('item_complete');
      expect(result).toBe(true);
      expect(warnMock).toHaveBeenCalledWith(
        expect.stringContaining('[Vibration]'),
        expect.anything(),
      );
    } finally {
      delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
    }
  });

  it('does not warn in plain browser env when falling back to navigator.vibrate', async () => {
    const warnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn().mockReturnValue(true),
      writable: true,
      configurable: true,
    });

    await triggerHaptic('item_complete');
    expect(warnMock).not.toHaveBeenCalled();
  });
});
