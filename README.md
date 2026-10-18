# TimePulse - 现代化时光管理与多功能计时器

<p align="center">
  <strong>致力于成为最美观、优雅且沉浸的现代化多功能计时器与时光管理应用。</strong>
</p>

<p align="center">
  <a href="https://github.com/AlkaidSTART/TimePulse/releases"><img src="https://img.shields.io/github/v/release/AlkaidSTART/TimePulse?color=3b82f6&logo=github" alt="Release" /></a>
  <a href="https://time-pulse-two.vercel.app/"><img src="https://img.shields.io/badge/Demo-在线体验-10b981?logo=vercel" alt="Online Demo" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-amber.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/Tauri-v2-24c8db?logo=tauri" alt="Tauri v2" />
</p>

> 💡 本仓库是 [RavelloH/TimePulse](https://github.com/RavelloH/TimePulse) 的独立二次开发版本（非官方），深度重构并扩展了元气打气、短期番茄专注、待办清单挂件、禅模式沉浸全屏、个性化偏好中心及 Tauri 跨平台原生客户端支持。

---

## 🌟 在线体验 & 扫码访问

- **Web 在线体验**：[https://time-pulse-two.vercel.app/](https://time-pulse-two.vercel.app/)
- **桌面 / 移动端安装包**：前往 [Releases 页面](https://github.com/AlkaidSTART/TimePulse/releases) 下载适用于 macOS (`.dmg`)、Windows (`.exe`) 与 Android (`.apk`) 的原生安装包。

<div align="center">
  <img src="public/website-qr.png" alt="TimePulse 网站访问二维码" width="160" />
  <p><em>手机扫码即可直接访问 TimePulse 在线网页</em></p>
</div>

---

## 📸 界面与功能预览

### 1. 元气打气与时光问候 (Cheer & Daily Greeting)
公历与农历智能对照，结合每日灵感语录、时段问候、元气打气弹跳卡片与倒数提醒。

![元气打气与时光问候](docs/screenshots/01-cheer-greeting.png)

---

### 2. 多场景计时器矩阵 (Multi-Mode Timers)
支持多种计时形态，满足不同场景下的时光记录需求：

| 长期目标倒数日 (Countdown) | 短期专注番茄钟 (Pomodoro / Short Focus) |
| :---: | :---: |
| ![长期目标倒数日](docs/screenshots/02-timer-countdown.png) | ![短期专注番茄钟](docs/screenshots/03-timer-short-pomodoro.png) |
| 精确到天、时、分、秒，支持进度条与动态色彩 | 极简短时倒数，翡翠绿/玫瑰粉/经典蓝专属色彩主题 |

| 新建计时器向导 (Create Timer) | 沉浸极简禅模式 (Zen Fullscreen) |
| :---: | :---: |
| ![新建计时器向导](docs/screenshots/06-modal-add-timer.png) | ![沉浸极简禅模式](docs/screenshots/09-fullscreen-zen.png) |
| 支持短期倒计时、长期倒计时、秒表与世界时钟 | 一键隐藏全部工具栏与干扰元素，沉浸专注当下 |

---

### 3. 待办核对清单与挂件视图 (Todo & Checklist)
内置待办清单与高效核对工具，支持三级优先级色标、打卡划线与进度环比统计，并可无缝切换至紧凑常驻的挂件模式（Widget）。

![待办核对清单](docs/screenshots/04-todo-checklist.png)

---

### 4. 个性化美学定制与分享 (Personalization & Customization)

| 个人中心与偏好设置 | 自定义背景与毛玻璃微调 | 分享与实时二维码 |
| :---: | :---: | :---: |
| ![个人偏好设置](docs/screenshots/05-personal-settings.png) | ![自定义背景与毛玻璃微调](docs/screenshots/07-modal-background.png) | ![分享与实时二维码](docs/screenshots/08-modal-share.png) |
| 专属称谓、个性座右铭与强调色切换 | 本地壁纸上传、网络图床与模糊度调节 | 实时二维码生成、链接一键复制分享 |

---

### 5. 移动端原生触感与多端自适应 (Mobile & Responsive)
针对移动端小屏与手势触控全面深度调优，配备原生质感的底部浮动 TabBar，操作随心自如。

<div align="center">
  <img src="docs/screenshots/10-mobile-responsive.png" alt="移动端自适应与底部导航" width="480" />
</div>

---

## ✨ 核心特性

- **🕒 全能计时矩阵**：
  - **长期倒计时**：跨年、高考、发版、纪念日，天/时/分/秒流畅跳动，配备进度条。
  - **短期专注番茄钟**：专为番茄工作法与短时冲刺优化，支持分秒自定与专属主题色。
  - **正计时与秒表**：支持分秒累计与毫秒级精度，适合任务追踪与专注记录。
  - **世界时钟**：跨时区时间随时对照。
- **☀️ 元气打气与时光卡片**：
  - 智能感知公历、农历节气与中外传统节假日。
  - 灵感一言每日推送，支持手动随机换一换与动态元气鼓励弹跳。
  - 晨昏时段动态问候语（晨曦微露、午后惬意、暮色温柔、静谧深夜）。
- **📝 待办任务清单 (Todo Checklist)**：
  - 紧急（红）、优先（黄）、普通（绿）三级高辨识度色彩标签。
  - 完成打卡状态动效与实时完成率百分比进度。
  - 挂件模式（Widget）：可切换为主界面常驻紧凑微挂件，随时核对与勾选。
- **🧘 沉浸禅模式 (Zen Fullscreen)**：
  - 快捷进入纯净全屏时钟视图，自动淡出所有外部 Header 和 Dock。
  - 双击或轻触任意空白区域即刻唤醒退出。
- **🎨 现代高级视觉美学**：
  - 全界面精雕细琢的毛玻璃微质感（Glassmorphism）与光影层次。
  - 自由定制桌面壁纸（支持本地图片上传与图片 URL），自由调节背景透明度与高斯模糊度。
  - 支持玫瑰粉、翡翠绿、经典蓝、琥珀橙、紫罗兰等多套主题强调色。
- **💾 高可靠数据本地持久化**：
  - 按平台自适应数据库后端：Web 端使用 **IndexedDB**，Tauri 桌面 / 移动端使用 **SQLite**（`tauri-plugin-sql`）。
  - 计时器、待办清单与自定义背景壁纸统一入库，搭配 LocalStorage 多重容灾备份机制。
  - 纯本地运行，数据不出设备，保护个人隐私安全。
- **📱 跨平台与原生支持**：
  - **PWA (Progressive Web App)**：支持“添加到主屏幕”，离线即开即用。
  - **Tauri v2 原生应用封装**：跨平台输出 macOS (.dmg / Universal)、Windows (.exe / NSIS) 与 Android (.apk) 安装包。
  - 支持移动端触感反馈（Haptics）与系统级倒计时通知提醒。

---

## 🛠️ 技术栈

| 模块 | 核心技术 | 说明 |
| :--- | :--- | :--- |
| **基础框架** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) | 现代 React 架构与全类型安全保证 |
| **构建与样式** | [Vite 6](https://vitejs.dev/) + [Tailwind CSS v4](https://tailwindcss.com/) | 极致的构建速度与原子化现代样式引擎 |
| **动效库** | [Framer Motion 12](https://www.framer.com/motion/) + [@number-flow/react](https://number-flow.barvian.me/) | 细腻的物理弹性转场与平滑数字滚轮动效 |
| **交互原语** | Radix UI / shadcn 风格组件 | 高可访问性（a11y）与可维护的交互原语 |
| **持久化存储** | IndexedDB（Web）/ SQLite（Tauri）+ LocalStorage | 平台自适应数据库后端，双轨离线存储，数据持久稳固 |
| **跨平台客户端** | [Tauri v2](https://v2.tauri.app/) (Rust) | 超轻量级桌面（macOS / Windows）及移动端（Android）封装 |
| **日历与实用库** | `solarlunar`, `date-fns`, `qrcode.react`, `lucide-react` | 农历转换、时间计算、二维码生成与精美图标集 |

---

## 🚀 快速开始

### 前置环境要求
- **Node.js**：`>= 22.13.0`
- **pnpm**：`>= 11.0.0`
- *(可选)* **Rust & Cargo**：如需本地编译桌面或 Android 客户端安装包

### 本地运行

1. **克隆仓库**
   ```bash
   git clone https://github.com/AlkaidSTART/TimePulse.git
   cd TimePulse
   ```

2. **安装依赖**
   ```bash
   pnpm install
   ```

3. **启动开发服务器**
   ```bash
   pnpm dev
   ```
   浏览器访问 `http://localhost:5173` 即可开始使用。

4. **构建生产版本**
   ```bash
   pnpm build
   pnpm preview
   ```

### 自动化文档截图生成

项目提供了全自动化的无头浏览器截图脚本，确保文档截图始终与生产界面保持一致且无任何报错弹窗：

```bash
# 构建并自动截取高清文档大图到 docs/screenshots/
pnpm build
pnpm capture:screenshots
```

---

## 📦 桌面与移动端安装包构建 (Tauri v2)

TimePulse 支持通过 GitHub Actions 自动化流水线发布多端安装包，你可以在 [Releases](https://github.com/AlkaidSTART/TimePulse/releases) 页面直接下载：

- 🍏 **macOS**：`TimePulse_x.x.x_universal.dmg`（同时支持 Apple Silicon M系列 与 Intel 处理器）
- 🪟 **Windows**：`TimePulse_x.x.x_x64-setup.exe`（现代化 NSIS 安装程序）
- 🤖 **Android**：`TimePulse_x.x.x_android-arm64.apk`（Android arm64 真机安装包）

#### 本地手动构建：
```bash
# 构建当前桌面平台安装包
pnpm tauri build

# 构建 Android APK 安装包（需配置好 Android SDK / NDK 环境变量）
pnpm tauri android build --apk
```

> **说明**：
> - CI 产出的 macOS / Windows 安装包未使用商业付费代码签名证书（macOS 使用 ad-hoc 签名），首次打开时若提示未信任，只需在 macOS 系统设置 -> 隐私与安全性中点击“仍要打开”，或右键选择“打开”。
> - Android APK 默认由 CI 自动签名打包；在仓库 Secrets 中配置 `ANDROID_KEYSTORE_BASE64`、`ANDROID_KEY_ALIAS`、`ANDROID_KEY_PASSWORD` 即可启用专属发行签名。
> - 客户端版本号继承自根目录 `package.json`，在构建前会自动同步到 `src-tauri/tauri.conf.json` 与 `src-tauri/Cargo.toml`。

---

## 🌐 浏览器与系统兼容性

- **桌面端主流浏览器**：Google Chrome, Microsoft Edge, Safari, Mozilla Firefox 等现代浏览器最新版。
- **移动端浏览器**：iOS Safari, Chrome for Android, 以及支持现代 ES 标准的主流移动浏览器。
- **原生操作系统**：
  - macOS 11.0 (Big Sur) 及以上
  - Windows 10 / 11 64-bit
  - Android 8.0 (API Level 26) 及以上

---

## 🤝 贡献指南

欢迎任何形式的贡献！
- 提交 Bug 或新功能建议：欢迎在 [GitHub Issues](https://github.com/AlkaidSTART/TimePulse/issues) 中提出。
- 提交代码改进：欢迎 Fork 本仓库并提交 Pull Request。

---

## 📄 许可证

本项目遵循 [MIT 许可证](LICENSE) 开源。

二次开发源自开源项目 [RavelloH/TimePulse](https://github.com/RavelloH/TimePulse)，向原作者致敬。
