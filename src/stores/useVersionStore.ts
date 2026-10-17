import { create } from 'zustand';
import { APP_VERSION, GITHUB_RELEASES_URL } from '@/constants/version';
import {
  checkAppUpdate,
  markVersionAsNotified,
  type ReleaseInfo,
  type VersionCheckResult,
} from '@/services/version';

export interface VersionStoreState {
  currentVersion: string;
  latestVersion: string | null;
  hasUpdate: boolean;
  isChecking: boolean;
  lastCheckError: string | null;
  lastCheckedTime: number | null;
  releaseInfo: ReleaseInfo | null;
  downloadUrl: string;

  // 乐观提醒浮窗（Toast/Banner）可见性
  isBannerVisible: boolean;
  // 关于 / 版本管理弹窗可见性
  isAboutModalOpen: boolean;

  // Actions
  checkUpdate: (options?: { manual?: boolean; timeoutMs?: number }) => Promise<VersionCheckResult>;
  dismissBanner: () => void;
  openAboutModal: () => void;
  closeAboutModal: () => void;
}

export const useVersionStore = create<VersionStoreState>((set, get) => ({
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

  checkUpdate: async (options) => {
    set({ isChecking: true, lastCheckError: null });

    try {
      const result = await checkAppUpdate({
        currentVersion: get().currentVersion,
        timeoutMs: options?.timeoutMs,
      });

      set({
        isChecking: false,
        lastCheckedTime: Date.now(),
        latestVersion: result.latestVersion,
        hasUpdate: result.hasUpdate,
        releaseInfo: result.releaseInfo ?? null,
        downloadUrl: result.downloadUrl || GITHUB_RELEASES_URL,
        lastCheckError: result.error ?? null,
      });

      // 如果需要乐观提醒（当前有新版本，且该新版本未曾提醒过）
      if (result.shouldNotify) {
        set({ isBannerVisible: true });
        // 记录已针对该版本提醒过，确保只提醒一次
        markVersionAsNotified(result.latestVersion);
      }

      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({
        isChecking: false,
        lastCheckError: msg,
      });
      return {
        success: false,
        currentVersion: get().currentVersion,
        latestVersion: get().currentVersion,
        hasUpdate: false,
        shouldNotify: false,
        downloadUrl: GITHUB_RELEASES_URL,
        error: msg,
      };
    }
  },

  dismissBanner: () => {
    const { latestVersion } = get();
    if (latestVersion) {
      markVersionAsNotified(latestVersion);
    }
    set({ isBannerVisible: false });
  },

  openAboutModal: () => {
    set({ isAboutModalOpen: true });
    if (typeof window !== 'undefined' && window.location.hash !== '#version' && window.location.hash !== '#about') {
      window.location.hash = 'version';
    }
  },

  closeAboutModal: () => {
    set({ isAboutModalOpen: false });
    if (typeof window !== 'undefined' && (window.location.hash === '#version' || window.location.hash === '#about')) {
      window.location.hash = '';
    }
  },
}));

// 监听 URL hash 变化以统一控制版本关于弹窗状态
if (typeof window !== 'undefined') {
  const handleHashChange = () => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'version' || hash === 'about') {
      useVersionStore.getState().openAboutModal();
    }
  };

  window.addEventListener('hashchange', handleHashChange);
  handleHashChange();
}
