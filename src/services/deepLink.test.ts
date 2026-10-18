import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupDeepLink, _resetDeepLinkInitializedForTest } from './deepLink';
import * as platformModule from '@/services/db/platform';
import { useAuthStore, TAURI_CUSTOM_SCHEME } from '@/stores/useAuthStore';

describe('deepLink service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    _resetDeepLinkInitializedForTest();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing in non-Tauri web environment', async () => {
    vi.spyOn(platformModule, 'isTauriRuntime').mockReturnValue(false);
    const unlisten = await setupDeepLink();
    expect(unlisten).toBeUndefined();
  });

  it('handles initial URL from getCurrent and registers onOpenUrl in Tauri environment', async () => {
    vi.spyOn(platformModule, 'isTauriRuntime').mockReturnValue(true);

    const handleCallbackSpy = vi
      .spyOn(useAuthStore.getState(), 'handleOAuthCallback')
      .mockResolvedValue({ success: true });

    let registeredHandler: ((urls: string[]) => void) | null = null;
    const mockUnlisten = vi.fn();

    vi.doMock('@tauri-apps/plugin-deep-link', () => ({
      getCurrent: vi.fn().mockResolvedValue([`${TAURI_CUSTOM_SCHEME}://auth/callback#access_token=token123&refresh_token=refresh456`]),
      onOpenUrl: vi.fn((handler: (urls: string[]) => void) => {
        registeredHandler = handler;
        return Promise.resolve(mockUnlisten);
      }),
      isRegistered: vi.fn().mockResolvedValue(true),
      register: vi.fn().mockResolvedValue(null),
    }));

    const unlisten = await setupDeepLink();

    expect(typeof unlisten).toBe('function');
    unlisten?.();
    expect(mockUnlisten).toHaveBeenCalledTimes(1);
    expect(handleCallbackSpy).toHaveBeenCalledWith(
      `${TAURI_CUSTOM_SCHEME}://auth/callback#access_token=token123&refresh_token=refresh456`
    );

    // 触发运行时接收到的新 URL
    if (registeredHandler) {
      (registeredHandler as (urls: string[]) => void)([
        `${TAURI_CUSTOM_SCHEME}://auth/callback?code=pkce_code_123`,
      ]);
      expect(handleCallbackSpy).toHaveBeenCalledWith(
        `${TAURI_CUSTOM_SCHEME}://auth/callback?code=pkce_code_123`
      );
    }

    vi.doUnmock('@tauri-apps/plugin-deep-link');
  });

  it('attempts to register scheme if not registered on supported platforms', async () => {
    vi.spyOn(platformModule, 'isTauriRuntime').mockReturnValue(true);

    const registerMock = vi.fn().mockResolvedValue(null);
    vi.doMock('@tauri-apps/plugin-deep-link', () => ({
      getCurrent: vi.fn().mockResolvedValue(null),
      onOpenUrl: vi.fn().mockResolvedValue(vi.fn()),
      isRegistered: vi.fn().mockResolvedValue(false),
      register: registerMock,
    }));

    await setupDeepLink();
    expect(registerMock).toHaveBeenCalledWith(TAURI_CUSTOM_SCHEME);

    vi.doUnmock('@tauri-apps/plugin-deep-link');
  });
});
