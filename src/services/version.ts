import {
  APP_VERSION,
  GITHUB_RELEASES_URL,
  GITHUB_LATEST_RELEASE_API,
  VERSION_STORAGE_KEYS,
} from '@/constants/version';

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface ReleaseInfo {
  tagName: string;
  version: string;
  name: string;
  body: string;
  publishedAt: string;
  htmlUrl: string;
  assets?: ReleaseAsset[];
}

export interface VersionParts {
  major: number;
  minor: number;
  patch: number;
  prerelease: string;
}

export interface VersionCheckResult {
  success: boolean;
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  shouldNotify: boolean;
  releaseInfo?: ReleaseInfo;
  downloadUrl: string;
  error?: string;
}

/**
 * 解析语义化版本号字符串，提取 major, minor, patch 与预发布标签
 * 支持格式：'0.7.0'、'v0.7.0'、'v1.0.0-beta.1' 等
 */
export function parseVersion(versionStr: string): VersionParts {
  if (!versionStr || typeof versionStr !== 'string') {
    return { major: 0, minor: 0, patch: 0, prerelease: '' };
  }

  // 去除前导 'v' 或 'V' 以及空白
  const trimmed = versionStr.trim().replace(/^[vV]/, '');
  const [mainPart, prerelease = ''] = trimmed.split('-');
  const [majorStr = '0', minorStr = '0', patchStr = '0'] = mainPart.split('.');

  return {
    major: parseInt(majorStr, 10) || 0,
    minor: parseInt(minorStr, 10) || 0,
    patch: parseInt(patchStr, 10) || 0,
    prerelease,
  };
}

/**
 * 语义化版本比较
 * @returns > 0 如果 v1 > v2; < 0 如果 v1 < v2; 0 如果 v1 == v2
 */
export function compareVersions(v1: string, v2: string): number {
  const p1 = parseVersion(v1);
  const p2 = parseVersion(v2);

  if (p1.major !== p2.major) return p1.major > p2.major ? 1 : -1;
  if (p1.minor !== p2.minor) return p1.minor > p2.minor ? 1 : -1;
  if (p1.patch !== p2.patch) return p1.patch > p2.patch ? 1 : -1;

  // 正式版本大于预发布版本，例如 1.0.0 > 1.0.0-beta
  if (!p1.prerelease && p2.prerelease) return 1;
  if (p1.prerelease && !p2.prerelease) return -1;
  if (p1.prerelease && p2.prerelease) {
    return p1.prerelease.localeCompare(p2.prerelease);
  }

  return 0;
}

/**
 * 判断远程版本是否高于本地当前版本
 */
export function isNewerVersion(remoteVersion: string, currentVersion: string = APP_VERSION): boolean {
  return compareVersions(remoteVersion, currentVersion) > 0;
}

/**
 * 标准化版本号（移除开头的 v/V 前缀与多余空格）
 */
export function normalizeVersion(version: string): string {
  if (!version) return '';
  return version.trim().replace(/^[vV]/, '');
}

/**
 * 获取上次已乐观提醒过的版本号
 */
export function getLastNotifiedVersion(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(VERSION_STORAGE_KEYS.lastNotifiedVersion);
    return stored ? normalizeVersion(stored) : null;
  } catch (e) {
    console.warn('[Version] 读取已提醒版本失败:', e);
    return null;
  }
}

/**
 * 记录该版本已提醒过用户（确保每个新版本只提醒一次）
 */
export function markVersionAsNotified(version: string): void {
  if (typeof window === 'undefined' || !version) return;
  try {
    localStorage.setItem(VERSION_STORAGE_KEYS.lastNotifiedVersion, normalizeVersion(version));
  } catch (e) {
    console.warn('[Version] 保存已提醒版本失败:', e);
  }
}

/**
 * 清除已提醒版本记录（供测试或手动重置使用）
 */
export function clearNotifiedVersion(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(VERSION_STORAGE_KEYS.lastNotifiedVersion);
  } catch (e) {
    console.warn('[Version] 清除已提醒版本失败:', e);
  }
}

/**
 * 从 GitHub 获取最新发布信息
 */
export async function fetchLatestRelease(
  apiUrl: string = GITHUB_LATEST_RELEASE_API,
  timeoutMs = 8000
): Promise<ReleaseInfo> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      throw new Error(`GitHub Releases API 响应错误: HTTP ${res.status}`);
    }

    const data = await res.json();
    const tagName = data.tag_name || '';
    const version = normalizeVersion(tagName);

    return {
      tagName,
      version,
      name: data.name || `Release ${tagName}`,
      body: data.body || '',
      publishedAt: data.published_at || '',
      htmlUrl: data.html_url || GITHUB_RELEASES_URL,
      assets: data.assets,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 检查应用版本更新，并结合本地历史判断是否需要乐观提醒（只提醒一次）
 */
export async function checkAppUpdate(options?: {
  currentVersion?: string;
  apiUrl?: string;
  timeoutMs?: number;
}): Promise<VersionCheckResult> {
  const currentVersion = options?.currentVersion ?? APP_VERSION;
  const normalizedCurrent = normalizeVersion(currentVersion);

  try {
    const releaseInfo = await fetchLatestRelease(options?.apiUrl, options?.timeoutMs);
    const normalizedLatest = normalizeVersion(releaseInfo.version);
    const hasUpdate = isNewerVersion(normalizedLatest, normalizedCurrent);
    const lastNotified = getLastNotifiedVersion();
    // 只有当有新版本，且该版本未曾提醒过时，才触发乐观提醒（只提醒一次）
    const shouldNotify = hasUpdate && lastNotified !== normalizedLatest;

    return {
      success: true,
      currentVersion: normalizedCurrent,
      latestVersion: normalizedLatest,
      hasUpdate,
      shouldNotify,
      releaseInfo,
      downloadUrl: GITHUB_RELEASES_URL,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      currentVersion: normalizedCurrent,
      latestVersion: normalizedCurrent,
      hasUpdate: false,
      shouldNotify: false,
      downloadUrl: GITHUB_RELEASES_URL,
      error: errorMessage,
    };
  }
}
