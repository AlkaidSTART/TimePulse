import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  parseVersion,
  compareVersions,
  isNewerVersion,
  normalizeVersion,
  getLastNotifiedVersion,
  markVersionAsNotified,
  clearNotifiedVersion,
  checkAppUpdate,
  fetchLatestRelease,
} from './version';
import { APP_VERSION, GITHUB_RELEASES_URL } from '@/constants/version';
import packageJson from '../../package.json';

describe('Version Management & Check Service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('APP_VERSION should match package.json version', () => {
    expect(APP_VERSION).toBe(packageJson.version);
  });

  describe('parseVersion', () => {
    it('correctly parses standard semver numbers', () => {
      expect(parseVersion('0.7.0')).toEqual({
        major: 0,
        minor: 7,
        patch: 0,
        prerelease: '',
      });
    });

    it('handles leading "v" or "V" and whitespace', () => {
      expect(parseVersion('  v1.2.3  ')).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: '',
      });
      expect(parseVersion('V2.0.1')).toEqual({
        major: 2,
        minor: 0,
        patch: 1,
        prerelease: '',
      });
    });

    it('parses prerelease tags', () => {
      expect(parseVersion('v0.8.0-beta.1')).toEqual({
        major: 0,
        minor: 8,
        patch: 0,
        prerelease: 'beta.1',
      });
    });

    it('handles empty or malformed strings safely', () => {
      expect(parseVersion('')).toEqual({
        major: 0,
        minor: 0,
        patch: 0,
        prerelease: '',
      });
    });
  });

  describe('compareVersions', () => {
    it('returns positive when v1 > v2', () => {
      expect(compareVersions('0.8.0', '0.7.0')).toBeGreaterThan(0);
      expect(compareVersions('1.0.0', '0.9.9')).toBeGreaterThan(0);
      expect(compareVersions('0.7.1', '0.7.0')).toBeGreaterThan(0);
      expect(compareVersions('v0.7.1', '0.7.0')).toBeGreaterThan(0);
    });

    it('returns negative when v1 < v2', () => {
      expect(compareVersions('0.7.0', '0.8.0')).toBeLessThan(0);
      expect(compareVersions('0.6.9', '0.7.0')).toBeLessThan(0);
      expect(compareVersions('0.7.0', '0.7.1')).toBeLessThan(0);
    });

    it('returns 0 when versions are equal', () => {
      expect(compareVersions('0.7.0', '0.7.0')).toBe(0);
      expect(compareVersions('v0.7.0', '0.7.0')).toBe(0);
      expect(compareVersions('v0.7.0', 'v0.7.0')).toBe(0);
    });

    it('prioritizes release versions over pre-release versions', () => {
      expect(compareVersions('0.8.0', '0.8.0-beta.1')).toBeGreaterThan(0);
      expect(compareVersions('0.8.0-beta.1', '0.8.0')).toBeLessThan(0);
    });
  });

  describe('isNewerVersion', () => {
    it('detects newer version correctly', () => {
      expect(isNewerVersion('0.8.0', '0.7.0')).toBe(true);
      expect(isNewerVersion('0.7.1', '0.7.0')).toBe(true);
      expect(isNewerVersion('0.7.0', '0.7.0')).toBe(false);
      expect(isNewerVersion('0.6.9', '0.7.0')).toBe(false);
    });
  });

  describe('normalizeVersion', () => {
    it('strips "v" and trims whitespace', () => {
      expect(normalizeVersion(' v0.8.0 ')).toBe('0.8.0');
      expect(normalizeVersion('V1.0.0')).toBe('1.0.0');
      expect(normalizeVersion('0.7.0')).toBe('0.7.0');
    });
  });

  describe('Notification History ("只提醒一次"机制)', () => {
    it('starts with null when not notified yet', () => {
      expect(getLastNotifiedVersion()).toBeNull();
    });

    it('stores and retrieves notified version normalized', () => {
      markVersionAsNotified('v0.8.0');
      expect(getLastNotifiedVersion()).toBe('0.8.0');
    });

    it('clears notified version when requested', () => {
      markVersionAsNotified('0.8.0');
      expect(getLastNotifiedVersion()).toBe('0.8.0');
      clearNotifiedVersion();
      expect(getLastNotifiedVersion()).toBeNull();
    });
  });

  describe('fetchLatestRelease', () => {
    it('parses GitHub release response properly', async () => {
      const mockResponse = {
        tag_name: 'v0.8.0',
        name: 'Release v0.8.0',
        body: '### New features\n- Awesome additions',
        published_at: '2026-10-18T00:00:00Z',
        html_url: 'https://github.com/AlkaidSTART/TimePulse/releases/tag/v0.8.0',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const release = await fetchLatestRelease('https://mock-api.github.com');
      expect(release.version).toBe('0.8.0');
      expect(release.tagName).toBe('v0.8.0');
      expect(release.name).toBe('Release v0.8.0');
      expect(release.body).toContain('Awesome additions');
    });

    it('throws error when response status is not ok', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(fetchLatestRelease('https://mock-api.github.com')).rejects.toThrow(
        'GitHub Releases API 响应错误: HTTP 404'
      );
    });
  });

  describe('checkAppUpdate', () => {
    it('prompts optimistic notification when a new version is released and not notified yet', async () => {
      const mockResponse = {
        tag_name: 'v0.8.0',
        name: 'Release v0.8.0',
        body: 'Update notes',
        published_at: '2026-10-18T00:00:00Z',
        html_url: 'https://github.com/AlkaidSTART/TimePulse/releases/tag/v0.8.0',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await checkAppUpdate({ currentVersion: '0.7.0' });
      expect(result.success).toBe(true);
      expect(result.hasUpdate).toBe(true);
      expect(result.shouldNotify).toBe(true); // 首次检测到新版，应当提醒
      expect(result.latestVersion).toBe('0.8.0');
      expect(result.downloadUrl).toBe(GITHUB_RELEASES_URL);
    });

    it('does NOT prompt notification if already notified for that version ("只提醒一次")', async () => {
      markVersionAsNotified('0.8.0'); // 模拟之前已经提醒过 0.8.0

      const mockResponse = {
        tag_name: 'v0.8.0',
        name: 'Release v0.8.0',
        body: 'Update notes',
        published_at: '2026-10-18T00:00:00Z',
        html_url: 'https://github.com/AlkaidSTART/TimePulse/releases/tag/v0.8.0',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await checkAppUpdate({ currentVersion: '0.7.0' });
      expect(result.success).toBe(true);
      expect(result.hasUpdate).toBe(true);
      expect(result.shouldNotify).toBe(false); // 已经提醒过，不再重复弹窗打扰！
    });

    it('prompts again when a subsequent, newer version is released', async () => {
      markVersionAsNotified('0.8.0'); // 已提醒过 0.8.0

      // 但现在发布了 0.9.0
      const mockResponse = {
        tag_name: 'v0.9.0',
        name: 'Release v0.9.0',
        body: 'New release',
        published_at: '2026-11-01T00:00:00Z',
        html_url: 'https://github.com/AlkaidSTART/TimePulse/releases/tag/v0.9.0',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await checkAppUpdate({ currentVersion: '0.7.0' });
      expect(result.success).toBe(true);
      expect(result.hasUpdate).toBe(true);
      expect(result.shouldNotify).toBe(true); // 针对 0.9.0 是第一次，应当提醒一次！
      expect(result.latestVersion).toBe('0.9.0');
    });

    it('reports no update when local version is up-to-date or newer', async () => {
      const mockResponse = {
        tag_name: 'v0.7.0',
        name: 'Release v0.7.0',
        body: 'Current release',
        published_at: '2026-10-17T00:00:00Z',
        html_url: 'https://github.com/AlkaidSTART/TimePulse/releases/tag/v0.7.0',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await checkAppUpdate({ currentVersion: '0.7.0' });
      expect(result.success).toBe(true);
      expect(result.hasUpdate).toBe(false);
      expect(result.shouldNotify).toBe(false);
      expect(result.latestVersion).toBe('0.7.0');
    });

    it('handles network failure gracefully without crashing', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network offline'));

      const result = await checkAppUpdate({ currentVersion: '0.7.0' });
      expect(result.success).toBe(false);
      expect(result.hasUpdate).toBe(false);
      expect(result.shouldNotify).toBe(false);
      expect(result.error).toContain('Network offline');
      expect(result.downloadUrl).toBe(GITHUB_RELEASES_URL);
    });
  });
});
