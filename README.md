# TimePulse - 现代化计时器应用

致力于成为最漂亮的计时器应用。

> 本仓库是 [RavelloH/TimePulse](https://github.com/RavelloH/TimePulse) 的独立二次开发版本（非官方）。

TimePulse 是一个具有现代化 UI 和交互的计时器网页应用，支持多计时器管理、数据分享、全屏展示等功能，可进行倒计时、正计时和显示世界时钟。采用玻璃态设计和流畅动画效果，提供极佳的视觉体验。

在线体验: [TimePulse](https://time-pulse-two.vercel.app/)

<div align="center">
  <img src="public/website-qr.png" alt="TimePulse 网站访问二维码" width="160" />
  <p><em>手机扫码即可直接访问 TimePulse 在线网页</em></p>
</div>

![image](https://raw.ravelloh.top/20250323/image.2obow0upmh.webp)
![image](https://raw.ravelloh.top/20250323/image.7zqlgqhqss.webp)
![image](https://raw.ravelloh.top/20250323/image.26ln7ftxqc.webp)
![image](https://raw.ravelloh.top/20250323/image.9nzydxa4pj.webp)
![image](https://raw.ravelloh.top/20250323/image.83a7egcmsx.webp)
![image](https://raw.ravelloh.top/20250323/image.9dd4kru4xb.webp)
![image](https://raw.ravelloh.top/20250323/image.51ebd8a4jh.webp)
![image](https://raw.ravelloh.top/20250323/image.6wqw5umcp8.webp)
![image](https://raw.ravelloh.top/20250323/image.6f0zcpvm6r.webp)
<img width="2492" height="1415" alt="image" src="https://github.com/user-attachments/assets/4b53171c-e8aa-4cec-ae39-e302a982242a" />


## 特点

### 核心功能
- 支持多个计时器的创建和管理
- 数据本地存储
- 支持生成分享链接和二维码
- 支持全屏展示模式
- 智能识别常用节假日
- 支持PWA，可安装到主屏幕并离线使用
- 国际化支持，提供中英双语
- 支持倒计时通知提醒
- 自定义背景

### 视觉和交互
- 精美的玻璃态设计和流畅动效
- 自适应模糊渐变背景，随主题色变化
- 米白/浅色主题自由切换
- 完全响应式设计，适配各种设备

## 技术栈

- Vite - 前端构建工具
- React + TypeScript - 类型安全的 UI 开发
- Radix UI / shadcn 风格源码组件 - 可维护的交互原语
- Framer Motion - 高级动画库
- Tailwind CSS - 实用工具优先的 CSS 框架
- IndexedDB - 本地数据持久化（计时器数据）
- Tauri 2 - 桌面（macOS / Windows）与移动（Android）安装包封装

## 快速开始
> 作为 Vite 构建的纯前端项目，可以在任何静态托管服务上部署。
>
> 另外，你也可以下载 [Releases](https://github.com/AlkaidSTART/TimePulse/releases) 中的静态预构建资源（形如site-vx.x.x.zip），将其部署在Github Pages、Cloudflare Pages或其他任何静态托管服务商上

### Vercel一键部署
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FAlkaidSTART%2FTimePulse)

### 本地运行

1. 克隆仓库
```bash
git clone https://github.com/AlkaidSTART/TimePulse.git
cd TimePulse
```

2. 安装依赖
```bash
pnpm install
```

3. 启动开发服务器
```bash
pnpm dev
```

4. 构建生产版本
```bash
pnpm build
```

### 桌面 / 移动安装包（Tauri）

推送代码到 `main` 分支（或手动触发 `Build Installers` workflow）后，GitHub Actions 会自动构建安装包并附加到对应版本号的 [Releases](https://github.com/AlkaidSTART/TimePulse/releases)：

- macOS：`TimePulse_x.x.x_universal.dmg`（同时支持 Apple Silicon 与 Intel）
- Windows：`TimePulse_x.x.x_x64-setup.exe`（NSIS 安装程序）
- Android：`TimePulse_x.x.x_android-arm64.apk`（arm64 真机通用）

本地构建（需安装 [Rust](https://rustup.rs/) 及对应平台工具链）：

```bash
pnpm install
pnpm tauri build                    # 当前平台的桌面安装包
pnpm tauri android build --apk      # Android APK（需 Android SDK / NDK）
```

> 说明：
> - CI 产出的 macOS / Windows 安装包未使用商业代码签名证书（macOS 使用 ad-hoc 签名），首次打开时可能需要在系统设置中允许，或右键选择"打开"。
> - Android APK 默认使用一次性 CI 密钥签名；如需固定签名（便于覆盖安装/上架），在仓库 Secrets 中配置 `ANDROID_KEYSTORE_BASE64`（keystore 文件的 base64）、`ANDROID_KEY_ALIAS`、`ANDROID_KEY_PASSWORD` 即可自动启用。
> - 安装包版本号来自 `package.json`，CI 构建前会自动同步到 `src-tauri/tauri.conf.json` 与 `src-tauri/Cargo.toml`。

## 使用说明

- 点击右下角"+"按钮创建新的倒计时
- 点击左下角分享按钮分享倒计时
- 点击右上角菜单切换主题或编辑计时器
- 点击右上角全屏按钮进入全屏模式
- 向下滚动可查看更多信息和运行日志

## 浏览器兼容性

- Chrome/Edge/Safari/Firefox 最新版本
- 支持大多数现代移动浏览器
- 不支持 IE11 及以下版本

## 贡献指南

欢迎提交 Pull Request 或 Issue 来帮助改进 TimePulse。

## 许可证

本项目基于 [MIT License](LICENSE) 开源。二次开发源自 [RavelloH/TimePulse](https://github.com/RavelloH/TimePulse)。
