import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openExternalUrl } from './browser';
import * as platformModule from '@/services/db/platform';

describe('openExternalUrl utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when url is empty', async () => {
    const result = await openExternalUrl('');
    expect(result).toBe(false);
  });

  it('calls window.open in web environment', async () => {
    vi.spyOn(platformModule, 'isTauriRuntime').mockReturnValue(false);
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({} as Window);

    const result = await openExternalUrl('https://github.com/AlkaidSTART/TimePulse/releases');

    expect(openSpy).toHaveBeenCalledWith(
      'https://github.com/AlkaidSTART/TimePulse/releases',
      '_blank',
      'noopener,noreferrer'
    );
    expect(result).toBe(true);
  });

  it('uses @tauri-apps/plugin-opener when running in Tauri environment', async () => {
    vi.spyOn(platformModule, 'isTauriRuntime').mockReturnValue(true);
    const mockOpenUrl = vi.fn().mockResolvedValue(undefined);

    vi.doMock('@tauri-apps/plugin-opener', () => ({
      openUrl: mockOpenUrl,
    }));

    const result = await openExternalUrl('https://github.com/AlkaidSTART/TimePulse/releases');
    expect(mockOpenUrl).toHaveBeenCalledWith('https://github.com/AlkaidSTART/TimePulse/releases');
    expect(result).toBe(true);

    vi.doUnmock('@tauri-apps/plugin-opener');
  });

  it('falls back to window.open if Tauri opener throws error', async () => {
    vi.spyOn(platformModule, 'isTauriRuntime').mockReturnValue(true);
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({} as Window);

    vi.doMock('@tauri-apps/plugin-opener', () => ({
      openUrl: vi.fn().mockRejectedValue(new Error('Tauri command error')),
    }));

    const result = await openExternalUrl('https://example.com');
    expect(openSpy).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
    expect(result).toBe(true);

    vi.doUnmock('@tauri-apps/plugin-opener');
  });
});
