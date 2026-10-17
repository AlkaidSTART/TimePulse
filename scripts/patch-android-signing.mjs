#!/usr/bin/env node
// 为 `tauri android init` 生成的 Gradle 工程注入 release 签名配置:
// 读取 src-tauri/gen/android/keystore.properties（keyAlias / password / storeFile，见官方文档
// https://v2.tauri.app/distribute/sign/android/），使 assembleRelease 产出已签名 APK。
// keystore.properties 不存在时保持未签名构建，不影响本地开发。
// 用法: node scripts/patch-android-signing.mjs  (需先运行 pnpm tauri android init)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gradlePath = resolve(root, 'src-tauri/gen/android/app/build.gradle.kts');

if (!existsSync(gradlePath)) {
  console.error(
    `[patch-android-signing] 未找到 ${gradlePath}，请先运行 "pnpm tauri android init"`,
  );
  process.exit(1);
}

let content = readFileSync(gradlePath, 'utf8');

if (content.includes('keystore.properties')) {
  console.log('[patch-android-signing] 已包含签名配置，跳过');
  process.exit(0);
}

// 1) 引入 FileInputStream（Properties 已由模板引入）
if (!content.includes('import java.io.FileInputStream')) {
  content = `import java.io.FileInputStream\n${content}`;
}

// 2) 在 buildTypes 之前插入 signingConfigs 块（缩进跟随 buildTypes）
const buildTypesPattern = /^(\s*)buildTypes\s*\{/m;
const buildTypesMatch = content.match(buildTypesPattern);
if (!buildTypesMatch || buildTypesMatch.index === undefined) {
  console.error('[patch-android-signing] 未在 build.gradle.kts 中找到 buildTypes 块');
  process.exit(1);
}
const buildTypesIndent = buildTypesMatch[1];
const innerIndent = `${buildTypesIndent}    `;
const signingBlock = [
  `${buildTypesIndent}signingConfigs {`,
  `${innerIndent}create("release") {`,
  `${innerIndent}    val keystorePropertiesFile = rootProject.file("keystore.properties")`,
  `${innerIndent}    if (keystorePropertiesFile.exists()) {`,
  `${innerIndent}        val keystoreProperties = Properties()`,
  `${innerIndent}        keystoreProperties.load(FileInputStream(keystorePropertiesFile))`,
  `${innerIndent}        keyAlias = keystoreProperties["keyAlias"] as String`,
  `${innerIndent}        keyPassword = keystoreProperties["password"] as String`,
  `${innerIndent}        storeFile = file(keystoreProperties["storeFile"] as String)`,
  `${innerIndent}        storePassword = keystoreProperties["password"] as String`,
  `${innerIndent}    }`,
  `${innerIndent}}`,
  `${buildTypesIndent}}`,
  '',
].join('\n');
content =
  content.slice(0, buildTypesMatch.index) +
  signingBlock +
  content.slice(buildTypesMatch.index);

// 3) 在 buildTypes 内的 release 块中启用该签名配置
const buildTypesStart = content.indexOf(buildTypesMatch[0]);
const releaseBlockMatch = content
  .slice(buildTypesStart)
  .match(/^(\s*)(?:getByName\("release"\)|release)\s*\{/m);
if (!releaseBlockMatch || releaseBlockMatch.index === undefined) {
  console.error('[patch-android-signing] 未在 buildTypes 中找到 release 块');
  process.exit(1);
}
const releaseIndent = releaseBlockMatch[1];
const releaseInsertAt = buildTypesStart + releaseBlockMatch.index + releaseBlockMatch[0].length;
const signingConfigLines = [
  '',
  `${releaseIndent}    if (rootProject.file("keystore.properties").exists()) {`,
  `${releaseIndent}        signingConfig = signingConfigs.getByName("release")`,
  `${releaseIndent}    }`,
].join('\n');
content = content.slice(0, releaseInsertAt) + signingConfigLines + content.slice(releaseInsertAt);

writeFileSync(gradlePath, content);
console.log('[patch-android-signing] 已将 release 签名配置写入 src-tauri/gen/android/app/build.gradle.kts');
