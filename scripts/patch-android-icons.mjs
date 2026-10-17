#!/usr/bin/env node
// 替换 `tauri android init` 生成的默认 Tauri 图标为项目自定义图标：
// 1. 删除 template 自带的矢量图 (drawable-v24/ic_launcher_foreground.xml, drawable/ic_launcher_background.xml)
// 2. 将 src-tauri/icons/android/ 下的所有 mipmap 图标、自适应图标配置与背景颜色拷贝至 gen/android/app/src/main/res/
// 用法: node scripts/patch-android-icons.mjs (需先运行 pnpm tauri android init)
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const androidResPath = resolve(root, 'src-tauri/gen/android/app/src/main/res');
const iconsSourcePath = resolve(root, 'src-tauri/icons/android');

if (!existsSync(androidResPath)) {
  console.error(
    `[patch-android-icons] 未找到 ${androidResPath}，请先运行 "pnpm tauri android init"`,
  );
  process.exit(1);
}

if (!existsSync(iconsSourcePath)) {
  console.error(
    `[patch-android-icons] 未找到图标源目录 ${iconsSourcePath}`,
  );
  process.exit(1);
}

// 1. 删除 Tauri 默认模板生成的矢量前景/背景（否则 API 24+ 会优先加载 Tauri 默认矢量图标）
const staleVectorFiles = [
  resolve(androidResPath, 'drawable-v24/ic_launcher_foreground.xml'),
  resolve(androidResPath, 'drawable/ic_launcher_background.xml'),
];

for (const file of staleVectorFiles) {
  if (existsSync(file)) {
    rmSync(file, { force: true });
    console.log(`[patch-android-icons] 已删除默认矢量文件: ${file}`);
  }
}

const drawableV24Dir = resolve(androidResPath, 'drawable-v24');
if (existsSync(drawableV24Dir) && readdirSync(drawableV24Dir).length === 0) {
  rmSync(drawableV24Dir, { recursive: true, force: true });
}

// 2. 递归拷贝自定义 Android 图标与资源配置到 Android 工程
cpSync(iconsSourcePath, androidResPath, { recursive: true, force: true });

console.log('[patch-android-icons] 成功将自定义应用图标应用到 Android 工程 (src-tauri/gen/android/app/src/main/res)');
