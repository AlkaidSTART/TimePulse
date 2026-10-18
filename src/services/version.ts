import {
  APP_VERSION,
  GITHUB_RELEASES_URL,
  GITHUB_LATEST_RELEASE_API,
  APP_VERSIONS_TABLE,
  VERSION_STORAGE_KEYS,
} from '@/constants/version';

type SupabaseModule = typeof import('@/lib/supabase');
let supabaseModulePromise: Promise<SupabaseModule | null> | null = null;

function getSupabaseModule(): Promise<SupabaseModule | null> {
  supabaseModulePromise ??= import('@/lib/supabase').catch((err) => {
    console.warn('[Version] 动态加载 Supabase 模块失败:', err);
    return null;
  });
  return supabaseModulePromise;
}

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
  source?: 'database' | 'github';
}

export interface AppVersionRecord {
  id?: string;
  version: string;
  title: string;
  release_notes?: string | null;
  download_url?: string;
  is_latest?: boolean;
  min_version?: string | null;
  force_update?: boolean;
  published_at?: string;
  created_at?: string;
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
  source?: 'database' | 'github';
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
 * 从云端 Supabase 数据库 app_versions 表读取最新版本信息
 */
export async function fetchLatestReleaseFromDatabase(timeoutMs = 6000): Promise<ReleaseInfo | null> {
  const sb = await getSupabaseModule();
  if (!sb || !sb.isSupabaseConfigured) {
    return null;
  }
  const { supabase } = sb;

  const timeoutPromise = new Promise<null>((_, reject) => {
    const timer = setTimeout(() => {
      clearTimeout(timer);
      reject(new Error('云端数据库版本请求超时'));
    }, timeoutMs);
  });

  const queryPromise = (async (): Promise<ReleaseInfo | null> => {
    try {
      const { data, error } = await supabase
        .from(APP_VERSIONS_TABLE)
        .select('*')
        .order('published_at', { ascending: false })
        .limit(10);

      if (error) {
        console.warn('[Version] 从云端数据库读取版本信息失败:', error.message);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      // 优先根据语义化版本大小排序，选出最高的版本；若有相同版本则以 published_at 降序为准
      const records = (data as AppVersionRecord[]).slice();
      records.sort((a, b) => compareVersions(b.version, a.version));
      const latest = records[0];

      return {
        tagName: `v${normalizeVersion(latest.version)}`,
        version: normalizeVersion(latest.version),
        name: latest.title || `TimePulse v${normalizeVersion(latest.version)}`,
        body: latest.release_notes || '',
        publishedAt: latest.published_at || '',
        htmlUrl: latest.download_url || GITHUB_RELEASES_URL,
        source: 'database',
      };
    } catch (err) {
      console.warn('[Version] 数据库查询出现异常:', err);
      return null;
    }
  })();

  return Promise.race([queryPromise, timeoutPromise]);
}

/**
 * 将指定版本号记录落库到 Supabase 数据库（用于发布新版本时同步落库）
 */
export async function recordAppVersion(versionData: {
  version: string;
  title?: string;
  releaseNotes?: string;
  downloadUrl?: string;
  isLatest?: boolean;
}): Promise<boolean> {
  const sb = await getSupabaseModule();
  if (!sb || !sb.isSupabaseConfigured) {
    return false;
  }
  const { supabase } = sb;

  try {
    const payload = {
      version: normalizeVersion(versionData.version),
      title: versionData.title || `TimePulse ${normalizeVersion(versionData.version)}`,
      release_notes: versionData.releaseNotes || '',
      download_url: versionData.downloadUrl || GITHUB_RELEASES_URL,
      is_latest: versionData.isLatest ?? true,
      published_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from(APP_VERSIONS_TABLE)
      .upsert(payload, { onConflict: 'version' });

    if (error) {
      console.warn('[Version] 版本落库失败:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[Version] 版本落库异常:', err);
    return false;
  }
}

/**
 * 自动从 GitHub 抓取最新 Release 并同步落库到数据库（双向打通）
 */
export async function syncLatestReleaseFromGitHub(): Promise<boolean> {
  try {
    const release = await fetchLatestRelease();
    if (!release || !release.version) return false;
    return await recordAppVersion({
      version: release.version,
      title: release.name,
      releaseNotes: release.body,
      downloadUrl: release.htmlUrl || GITHUB_RELEASES_URL,
      isLatest: true,
    });
  } catch (err) {
    console.warn('[Version] 从 GitHub 抓取并落库失败:', err);
    return false;
  }
}


/**
 * 从 GitHub 获取最新发布信息（作为灾备降级）
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
      source: 'github',
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 检查应用版本更新
 * 优先从云端数据库 app_versions 表自检最新版本；
 * 若云端数据库未配置或获取失败，自动平滑回退至 GitHub Releases API。
 * 结合本地历史判断是否需要乐观提醒（只提醒一次）。
 */
export async function checkAppUpdate(options?: {
  currentVersion?: string;
  apiUrl?: string;
  timeoutMs?: number;
  preferSource?: 'database' | 'github' | 'auto';
}): Promise<VersionCheckResult> {
  const currentVersion = options?.currentVersion ?? APP_VERSION;
  const normalizedCurrent = normalizeVersion(currentVersion);
  // 当显式指定 apiUrl 时，默认为 GitHub 来源以满足特定测试与调用需求
  const preferSource = options?.preferSource ?? (options?.apiUrl ? 'github' : 'auto');

  try {
    let releaseInfo: ReleaseInfo | null = null;
    let usedSource: 'database' | 'github' = 'database';

    // 1. 若优先数据库源且非指定 GitHub，首先从云端数据库读取
    if (preferSource !== 'github') {
      try {
        releaseInfo = await fetchLatestReleaseFromDatabase(options?.timeoutMs ?? 6000);
      } catch (dbErr) {
        console.warn('[Version] 云端数据库检测失败，将尝试 GitHub API 回退:', dbErr);
      }
    }

    // 2. 若数据库无记录或不可用，回退至 GitHub Releases API
    if (!releaseInfo) {
      usedSource = 'github';
      releaseInfo = await fetchLatestRelease(options?.apiUrl, options?.timeoutMs);
    }

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
      downloadUrl: releaseInfo.htmlUrl || GITHUB_RELEASES_URL,
      source: usedSource,
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

