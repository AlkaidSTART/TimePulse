#!/usr/bin/env node
// 将 package.json 的版本号同步到 Tauri 配置，保证桌面/移动安装包版本与前端版本一致。
// 用法: node scripts/sync-tauri-version.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`[sync-tauri-version] package.json 中的版本号不合法: "${version}"`);
  process.exit(1);
}

// 1) src-tauri/tauri.conf.json
const confPath = resolve(root, 'src-tauri/tauri.conf.json');
const conf = JSON.parse(readFileSync(confPath, 'utf8'));
if (conf.version !== version) {
  conf.version = version;
  writeFileSync(confPath, `${JSON.stringify(conf, null, 2)}\n`);
  console.log(`[sync-tauri-version] src-tauri/tauri.conf.json -> ${version}`);
} else {
  console.log(`[sync-tauri-version] src-tauri/tauri.conf.json 已是 ${version}`);
}

// 2) src-tauri/Cargo.toml（只改 [package] 段的 version）
const cargoPath = resolve(root, 'src-tauri/Cargo.toml');
const cargo = readFileSync(cargoPath, 'utf8');
const libIndex = cargo.indexOf('[lib]');
if (libIndex === -1) {
  console.error('[sync-tauri-version] src-tauri/Cargo.toml 中未找到 [lib] 段');
  process.exit(1);
}
const head = cargo.slice(0, libIndex);
const versionPattern = /^version = "[^"]*"$/m;
if (!versionPattern.test(head)) {
  console.error('[sync-tauri-version] src-tauri/Cargo.toml 的 [package] 段中未找到 version 字段');
  process.exit(1);
}
const updatedHead = head.replace(versionPattern, `version = "${version}"`);
if (updatedHead !== head) {
  writeFileSync(cargoPath, updatedHead + cargo.slice(libIndex));
  console.log(`[sync-tauri-version] src-tauri/Cargo.toml -> ${version}`);
} else {
  console.log(`[sync-tauri-version] src-tauri/Cargo.toml 已是 ${version}`);
}
