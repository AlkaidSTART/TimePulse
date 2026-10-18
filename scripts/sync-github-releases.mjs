#!/usr/bin/env node
/**
 * 自动从 GitHub 抓取 AlkaidSTART/TimePulse 仓库的 Releases 发布信息，并同步落库到 Supabase 数据库
 * 用法:
 *   node scripts/sync-github-releases.mjs
 * 可选环境变量:
 *   GITHUB_TOKEN: GitHub Personal Access Token (可选，用于提高 API 限频上限)
 *   SUPABASE_URL / VITE_SUPABASE_URL
 *   SUPABASE_SECRET_KEY: 具备写权限的 Supabase 密钥 (优先使用)
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

// 加载 .env 与 .env.local 中的环境变量作为兜底
function loadEnv() {
  const envFiles = [resolve(root, '.env'), resolve(root, '.env.local')];
  for (const file of envFiles) {
    if (!existsSync(file)) continue;
    try {
      const content = readFileSync(file, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    } catch {
      // 忽略单个文件读取异常
    }
  }
}

loadEnv();

const GITHUB_REPO = process.env.GITHUB_REPO || 'AlkaidSTART/TimePulse';
const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases`;
const DEFAULT_DOWNLOAD_URL = `https://github.com/${GITHUB_REPO}/releases`;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[Sync Releases] 错误: 未找到 SUPABASE_URL 或 SUPABASE_SECRET_KEY 配置');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function normalizeVersion(v) {
  if (!v) return '';
  return String(v).trim().replace(/^[vV]/, '');
}

function parseSemver(v) {
  const clean = normalizeVersion(v);
  const [main, prerelease = ''] = clean.split('-');
  const [major = '0', minor = '0', patch = '0'] = main.split('.');
  return {
    major: parseInt(major, 10) || 0,
    minor: parseInt(minor, 10) || 0,
    patch: parseInt(patch, 10) || 0,
    prerelease,
  };
}

function compareSemver(v1, v2) {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);
  if (p1.major !== p2.major) return p1.major > p2.major ? 1 : -1;
  if (p1.minor !== p2.minor) return p1.minor > p2.minor ? 1 : -1;
  if (p1.patch !== p2.patch) return p1.patch > p2.patch ? 1 : -1;
  if (!p1.prerelease && p2.prerelease) return 1;
  if (p1.prerelease && !p2.prerelease) return -1;
  return 0;
}

async function fetchGitHubReleases() {
  console.log(`[Sync Releases] 正在从 GitHub 抓取仓库发布记录: ${GITHUB_REPO}...`);
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'TimePulse-Release-Sync-Bot',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(GITHUB_RELEASES_API, { headers });
  if (!res.ok) {
    throw new Error(`请求 GitHub Releases API 失败: HTTP ${res.status} ${res.statusText}`);
  }

  const list = await res.json();
  if (!Array.isArray(list)) {
    throw new Error(`GitHub 返回数据非数组: ${JSON.stringify(list)}`);
  }

  return list;
}

async function syncReleasesToSupabase() {
  try {
    const releases = await fetchGitHubReleases();
    if (releases.length === 0) {
      console.log('[Sync Releases] GitHub 仓库暂无 Release，尝试抓取 Tags 兜底...');
      // 若 releases 为空，可尝试从 tags 兜底
      return;
    }

    console.log(`[Sync Releases] 成功抓取到 ${releases.length} 个 Release 记录`);

    // 过滤出有效版本，并根据语义化版本降序排列
    const validReleases = releases
      .filter((r) => r.tag_name)
      .map((r) => {
        const ver = normalizeVersion(r.tag_name);
        return {
          original: r,
          version: ver,
          title: r.name || `TimePulse v${ver}`,
          release_notes: r.body || '',
          download_url: DEFAULT_DOWNLOAD_URL,
          published_at: r.published_at || new Date().toISOString(),
        };
      })
      .sort((a, b) => compareSemver(b.version, a.version));

    if (validReleases.length === 0) {
      console.log('[Sync Releases] 未解析到有效语义化版本');
      return;
    }

    const latestVersion = validReleases[0].version;
    console.log(`[Sync Releases] 解析到当前最新版本: v${latestVersion}`);

    // 将其他历史版本的 is_latest 重置为 false，确保唯一最新标识
    const { error: resetError } = await supabase
      .from('app_versions')
      .update({ is_latest: false })
      .neq('version', '__dummy_impossible__');

    if (resetError) {
      console.warn('[Sync Releases] 重置历史 is_latest 标识提示:', resetError.message);
    }

    // 逐个落库 upsert
    for (const item of validReleases) {
      const isLatest = item.version === latestVersion;
      const payload = {
        version: item.version,
        title: item.title,
        release_notes: item.release_notes,
        download_url: item.download_url,
        is_latest: isLatest,
        published_at: item.published_at,
      };

      const { data, error } = await supabase
        .from('app_versions')
        .upsert(payload, { onConflict: 'version' })
        .select();

      if (error) {
        console.error(`[Sync Releases] 版本 v${item.version} 落库失败:`, error.message);
      } else {
        console.log(
          `[Sync Releases] ✅ 版本 v${item.version} 成功落库 (is_latest: ${isLatest}, title: "${item.title}")`
        );
      }
    }

    console.log('[Sync Releases] 全部版本同步落库完成！');
  } catch (err) {
    console.error('[Sync Releases] 同步过程出现异常:', err);
    process.exit(1);
  }
}

syncReleasesToSupabase();
