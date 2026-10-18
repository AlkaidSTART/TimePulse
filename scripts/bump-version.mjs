#!/usr/bin/env node
/**
 * 自动计算并递增 TimePulse 版本号脚本
 *
 * 用法:
 *   node scripts/bump-version.mjs              # 自动根据 git commits 判断 patch/minor/major 并递增
 *   node scripts/bump-version.mjs --auto       # 同上
 *   node scripts/bump-version.mjs --type patch # 强制 patch 递增 (0.7.0 -> 0.7.1)
 *   node scripts/bump-version.mjs --type minor # 强制 minor 递增 (0.7.0 -> 0.8.0)
 *   node scripts/bump-version.mjs --type major # 强制 major 递增 (0.7.0 -> 1.0.0)
 *   node scripts/bump-version.mjs --version 0.8.0 # 强制指定版本号
 *   node scripts/bump-version.mjs --dry-run    # 仅预演输出，不写文件
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 简易 SemVer 解析与比较
export function parseSemver(str) {
  if (!str) return null;
  const match = str.trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || '',
  };
}

export function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return 0;
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  if (pa.patch !== pb.patch) return pa.patch - pb.patch;
  return 0;
}

export function detectBumpTypeFromCommits(commitLog) {
  if (!commitLog) return 'patch';
  if (/BREAKING[ -]CHANGE/i.test(commitLog) || /^[a-z]+(\([^\)]+\))?!:/m.test(commitLog)) {
    return 'major';
  }
  if (/^feat(\([^\)]+\))?:/m.test(commitLog)) {
    return 'minor';
  }
  return 'patch';
}

export function calculateNextVersion(currentVersion, bumpType) {
  const parsed = parseSemver(currentVersion);
  if (!parsed) throw new Error(`Invalid semver: ${currentVersion}`);
  if (bumpType === 'major') {
    return `${parsed.major + 1}.0.0`;
  }
  if (bumpType === 'minor') {
    return `${parsed.major}.${parsed.minor + 1}.0`;
  }
  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
}

function runGit(cmd) {
  try {
    return execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

export function main() {
  // 解析命令行参数
  const args = process.argv.slice(2);
  let forcedType = null;
  let forcedVersion = null;
  let isDryRun = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      isDryRun = true;
    } else if (arg === '--patch') {
      forcedType = 'patch';
    } else if (arg === '--minor') {
      forcedType = 'minor';
    } else if (arg === '--major') {
      forcedType = 'major';
    } else if (arg === '--auto') {
      forcedType = null;
    } else if (arg === '--type' && args[i + 1]) {
      const nextArg = args[++i];
      forcedType = nextArg === 'auto' ? null : nextArg;
    } else if (arg === '--version' && args[i + 1]) {
      forcedVersion = args[++i];
    }
  }

  // 1. 获取当前 package.json 版本
  const pkgPath = resolve(root, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const currentVersion = pkg.version;
  const parsedCurrent = parseSemver(currentVersion);

  if (!parsedCurrent) {
    console.error(`[bump-version] package.json 中的版本号不合法: "${currentVersion}"`);
    process.exit(1);
  }

  // 2. 获取最新 Git Tag (如 v0.7.0)
  const latestTag = runGit("git tag -l 'v*' --sort=-version:refname | head -n1") || 'none';
  const cleanTagVersion = latestTag !== 'none' ? latestTag.replace(/^v/i, '') : null;

  // 3. 检查当前是否为自动化发布的提交，避免循环触发
  const headCommitMsg = runGit('git log -1 --pretty=format:%B') || '';
  if (headCommitMsg.includes('[skip ci]') || headCommitMsg.startsWith('chore(release):')) {
    console.log('[bump-version] 当前提交为自动发布提交或带有 [skip ci]，跳过版本升级。');
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, `is_bumped=false\nversion=v${currentVersion}\nnew_version=${currentVersion}\nold_version=${currentVersion}\nneeds_commit=false\n`);
    }
    process.exit(0);
  }

  // 4. 判定是否已经手动更新了版本号
  let bumpType = forcedType || 'patch';
  let newVersion = '';

  if (forcedVersion) {
    const parsed = parseSemver(forcedVersion);
    if (!parsed) {
      console.error(`[bump-version] 提供的 --version 不合法: "${forcedVersion}"`);
      process.exit(1);
    }
    newVersion = forcedVersion.replace(/^v/i, '');
    bumpType = 'manual';
  } else if (
    !forcedType &&
    cleanTagVersion &&
    compareSemver(currentVersion, cleanTagVersion) > 0
  ) {
    // package.json 里的版本已大于最新 git tag，说明开发者在 PR 中手动更新了版本号
    console.log(`[bump-version] 检测到 package.json 中已有更新版本 (${currentVersion} > ${cleanTagVersion})，保留手动指定的版本。`);
    newVersion = currentVersion;
    bumpType = 'manual';
  } else {
    // 5. 自动根据 Commit 信息分析升级类型
    if (!forcedType) {
      let commitLog = '';
      if (latestTag !== 'none') {
        commitLog = runGit(`git log ${latestTag}..HEAD --pretty=format:%B`);
      }
      if (!commitLog) {
        commitLog = runGit('git log -n 10 --pretty=format:%B');
      }
      bumpType = detectBumpTypeFromCommits(commitLog);
    }

    newVersion = calculateNextVersion(currentVersion, bumpType);
  }

  console.log(`----------------------------------------`);
  console.log(`TimePulse 版本更新计算:`);
  console.log(`  当前版本 (package.json): ${currentVersion}`);
  console.log(`  最新 Git Tag:           ${latestTag}`);
  console.log(`  升级类型:               ${bumpType}`);
  console.log(`  目标新版本:             ${newVersion} (v${newVersion})`);
  console.log(`----------------------------------------`);

  if (isDryRun) {
    console.log('[bump-version] --dry-run 模式，未修改任何文件。');
    return;
  }

  let hasChanges = false;

  // 1) 更新 package.json
  if (pkg.version !== newVersion) {
    pkg.version = newVersion;
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
    console.log(`[bump-version] 已更新 package.json -> ${newVersion}`);
    hasChanges = true;
  }

  // 2) 更新 src/constants/version.ts
  const versionTsPath = resolve(root, 'src/constants/version.ts');
  if (existsSync(versionTsPath)) {
    const tsContent = readFileSync(versionTsPath, 'utf8');
    const appVersionPattern = /export const APP_VERSION = '[^']*';/;
    if (appVersionPattern.test(tsContent)) {
      const updatedTs = tsContent.replace(appVersionPattern, `export const APP_VERSION = '${newVersion}';`);
      if (updatedTs !== tsContent) {
        writeFileSync(versionTsPath, updatedTs);
        console.log(`[bump-version] 已更新 src/constants/version.ts -> ${newVersion}`);
        hasChanges = true;
      }
    }
  }

  // 3) 更新 src-tauri/tauri.conf.json
  const tauriConfPath = resolve(root, 'src-tauri/tauri.conf.json');
  if (existsSync(tauriConfPath)) {
    const conf = JSON.parse(readFileSync(tauriConfPath, 'utf8'));
    if (conf.version !== newVersion) {
      conf.version = newVersion;
      writeFileSync(tauriConfPath, `${JSON.stringify(conf, null, 2)}\n`);
      console.log(`[bump-version] 已更新 src-tauri/tauri.conf.json -> ${newVersion}`);
      hasChanges = true;
    }
  }

  // 4) 更新 src-tauri/Cargo.toml
  const cargoPath = resolve(root, 'src-tauri/Cargo.toml');
  if (existsSync(cargoPath)) {
    const cargo = readFileSync(cargoPath, 'utf8');
    const libIndex = cargo.indexOf('[lib]');
    if (libIndex !== -1) {
      const head = cargo.slice(0, libIndex);
      const versionPattern = /^version = "[^"]*"$/m;
      if (versionPattern.test(head)) {
        const updatedHead = head.replace(versionPattern, `version = "${newVersion}"`);
        if (updatedHead !== head) {
          writeFileSync(cargoPath, updatedHead + cargo.slice(libIndex));
          console.log(`[bump-version] 已更新 src-tauri/Cargo.toml -> ${newVersion}`);
          hasChanges = true;
        }
      }
    }
  }

  // 5) 更新 src-tauri/Cargo.lock (锁定 time-pulse 包的版本)
  const lockPath = resolve(root, 'src-tauri/Cargo.lock');
  if (existsSync(lockPath)) {
    const lock = readFileSync(lockPath, 'utf8');
    const lockPattern = /(\[\[package\]\]\s+name = "time-pulse"\s+version = )"[^"]*"/;
    if (lockPattern.test(lock)) {
      const updatedLock = lock.replace(lockPattern, `$1"${newVersion}"`);
      if (updatedLock !== lock) {
        writeFileSync(lockPath, updatedLock);
        console.log(`[bump-version] 已更新 src-tauri/Cargo.lock -> ${newVersion}`);
        hasChanges = true;
      }
    }
  }

  // 6) 输出到 GITHUB_OUTPUT 供 GitHub Actions 下续步骤调用
  if (process.env.GITHUB_OUTPUT) {
    const outputs = [
      `is_bumped=true`,
      `version=v${newVersion}`,
      `new_version=${newVersion}`,
      `old_version=${currentVersion}`,
      `bump_type=${bumpType}`,
      `previous_tag=${latestTag}`,
      `needs_commit=${hasChanges ? 'true' : 'false'}`,
    ].join('\n');
    appendFileSync(process.env.GITHUB_OUTPUT, `${outputs}\n`);
    console.log(`[bump-version] 已写入 GITHUB_OUTPUT:`);
    console.log(outputs);
  }

  console.log(`[bump-version] 版本更新完成: ${currentVersion} -> ${newVersion} (hasChanges=${hasChanges})`);
}

// 直接运行模式
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
