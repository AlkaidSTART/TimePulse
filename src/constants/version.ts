/**
 * TimePulse 应用版本与发布管理配置
 */

export const APP_VERSION = '0.8.0';

export const GITHUB_REPO = 'AlkaidSTART/TimePulse';

export const GITHUB_RELEASES_URL = 'https://github.com/AlkaidSTART/TimePulse/releases';

export const GITHUB_LATEST_RELEASE_API = 'https://api.github.com/repos/AlkaidSTART/TimePulse/releases/latest';

export const APP_VERSIONS_TABLE = 'app_versions';

export const VERSION_STORAGE_KEYS = {
  lastNotifiedVersion: 'timepulse_last_notified_version',
  lastCheckTimestamp: 'timepulse_last_version_check_time',
} as const;

