import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { useVersionStore } from '../useVersionStore';
import { APP_VERSION, GITHUB_RELEASES_URL } from '@/constants/version';
import * as versionService from '@/services/version';

describe('useVersionStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    useVersionStore.setState({
      currentVersion: APP_VERSION,
      latestVersion: null,
      hasUpdate: false,
      isChecking: false,
      lastCheckError: null,
      lastCheckedTime: null,
      releaseInfo: null,
      downloadUrl: GITHUB_RELEASES_URL,
      isBannerVisible: false,
      isAboutModalOpen: false,
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('initializes with default values', () => {
    const state = useVersionStore.getState();
    expect(state.currentVersion).toBe(APP_VERSION);
    expect(state.latestVersion).toBeNull();
    expect(state.hasUpdate).toBe(false);
    expect(state.isBannerVisible).toBe(false);
    expect(state.isAboutModalOpen).toBe(false);
    expect(state.downloadUrl).toBe(GITHUB_RELEASES_URL);
  });

  it('updates state and displays banner when new version is detected and not yet notified', async () => {
    vi.spyOn(versionService, 'checkAppUpdate').mockResolvedValueOnce({
      success: true,
      currentVersion: APP_VERSION,
      latestVersion: '0.8.0',
      hasUpdate: true,
      shouldNotify: true,
      downloadUrl: GITHUB_RELEASES_URL,
      releaseInfo: {
        tagName: 'v0.8.0',
        version: '0.8.0',
        name: 'Release v0.8.0',
        body: 'Notes',
        publishedAt: '2026-10-18T00:00:00Z',
        htmlUrl: GITHUB_RELEASES_URL,
      },
    });

    const markSpy = vi.spyOn(versionService, 'markVersionAsNotified');

    await useVersionStore.getState().checkUpdate();

    const state = useVersionStore.getState();
    expect(state.isChecking).toBe(false);
    expect(state.latestVersion).toBe('0.8.0');
    expect(state.hasUpdate).toBe(true);
    expect(state.isBannerVisible).toBe(true);
    expect(markSpy).toHaveBeenCalledWith('0.8.0');
  });

  it('does NOT show banner if already notified ("只提醒一次")', async () => {
    vi.spyOn(versionService, 'checkAppUpdate').mockResolvedValueOnce({
      success: true,
      currentVersion: APP_VERSION,
      latestVersion: '0.8.0',
      hasUpdate: true,
      shouldNotify: false, // 已经提醒过
      downloadUrl: GITHUB_RELEASES_URL,
    });

    await useVersionStore.getState().checkUpdate();

    const state = useVersionStore.getState();
    expect(state.hasUpdate).toBe(true);
    expect(state.isBannerVisible).toBe(false);
  });

  it('dismissBanner hides the banner and records notification', () => {
    useVersionStore.setState({
      latestVersion: '0.8.0',
      isBannerVisible: true,
    });

    const markSpy = vi.spyOn(versionService, 'markVersionAsNotified');

    useVersionStore.getState().dismissBanner();

    expect(useVersionStore.getState().isBannerVisible).toBe(false);
    expect(markSpy).toHaveBeenCalledWith('0.8.0');
  });

  it('opens and closes about version modal', () => {
    useVersionStore.getState().openAboutModal();
    expect(useVersionStore.getState().isAboutModalOpen).toBe(true);

    useVersionStore.getState().closeAboutModal();
    expect(useVersionStore.getState().isAboutModalOpen).toBe(false);
  });
});
