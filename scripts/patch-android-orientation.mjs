#!/usr/bin/env node
// 确保 `tauri android init` 生成的 AndroidManifest.xml 支持横竖屏全向旋转与动态配置变更
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(root, 'src-tauri/gen/android/app/src/main/AndroidManifest.xml');

if (!existsSync(manifestPath)) {
  console.log('[patch-android-orientation] 未找到 AndroidManifest.xml（当前尚未初始化 Android 工程，跳过）');
  process.exit(0);
}

let content = readFileSync(manifestPath, 'utf8');

if (content.includes('android:screenOrientation="fullSensor"')) {
  console.log('[patch-android-orientation] 已包含 fullSensor 横竖屏传感器支持，跳过');
  process.exit(0);
}

if (content.includes('android:screenOrientation="portrait"')) {
  content = content.replace('android:screenOrientation="portrait"', 'android:screenOrientation="fullSensor"');
  console.log('[patch-android-orientation] 已将 android:screenOrientation 由 portrait 改为 fullSensor');
} else if (!content.includes('android:screenOrientation=')) {
  content = content.replace(
    /(<activity[\s\S]*?)(android:name="\.MainActivity")/,
    '$1android:screenOrientation="fullSensor"\n            $2',
  );
  console.log('[patch-android-orientation] 已在 MainActivity 注入 android:screenOrientation="fullSensor"');
}

if (content.includes('android:configChanges="')) {
  const configChangesRegex = /android:configChanges="([^"]*)"/;
  const match = content.match(configChangesRegex);
  if (match) {
    const flags = match[1].split('|');
    const requiredFlags = ['orientation', 'screenSize', 'screenLayout', 'smallestScreenSize', 'keyboard', 'keyboardHidden'];
    for (const flag of requiredFlags) {
      if (!flags.includes(flag)) {
        flags.push(flag);
      }
    }
    const newConfigChanges = `android:configChanges="${flags.join('|')}"`;
    content = content.replace(configChangesRegex, newConfigChanges);
  }
}

// 确保 Android 虚拟软键盘弹出时平滑压缩视口高度，配合 CSS safe-area 避让输入焦点
if (content.includes('android:windowSoftInputMode="')) {
  content = content.replace(/android:windowSoftInputMode="[^"]*"/, 'android:windowSoftInputMode="adjustResize"');
  console.log('[patch-android-orientation] 已将 android:windowSoftInputMode 设置为 adjustResize');
} else {
  content = content.replace(
    /(<activity[\s\S]*?)(android:name="\.MainActivity")/,
    '$1android:windowSoftInputMode="adjustResize"\n            $2',
  );
  console.log('[patch-android-orientation] 已在 MainActivity 注入 android:windowSoftInputMode="adjustResize"');
}

writeFileSync(manifestPath, content);
console.log('[patch-android-orientation] 成功更新 AndroidManifest.xml 以全面支持移动端横竖屏自适应切换');
