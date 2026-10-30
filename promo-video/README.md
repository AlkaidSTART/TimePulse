# TimePulse 产品级发布片 (huashu-motion)

基于 [huashu-motion](https://github.com/alchaincyf/huashu-motion) 规则体系构建的 TimePulse 30秒 16:9 官方产品发布视频工程。

---

## 快速预览与播放

### 方式一：双击直接在浏览器中打开 (零门槛)
直接在 Chrome、Safari 或 Edge 中打开本目录下的 `index.html`：
- **自带完整音画**：内置 Web Audio 声音合成引擎 + 实时中文语音旁白（无需配置任何外部服务）。
- **交互控制条**：支持空格键暂停/播放、拖拽时间轴进度条（Scrubber）、快捷跳至 6 大核心场景、全屏（F键）播放。
- **纯代码驱动**：基于 GSAP 3 物理缓动与精准图层矩阵，画质无损放大至 4K。

### 方式二：使用 huashu-motion Studio (指着画面改)
在 TimePulse 根目录下执行：

```bash
# 启动本地可视化编辑器
npx huashu-motion studio promo-video
```

- 在浏览器编辑器中按 `C` 键点击画面任意元素，输入修改意见，AI 即可定位到源码位置并精确修改。
- 右侧属性面板可直接微调倒数日数值、番茄钟时长、主题强调色与结尾停留时间。

### 方式三：导出为 4K / 1080P MP4 视频
```bash
# 执行无损视频渲染输出至 promo-video/out/
npx huashu-motion render promo-video --fps 30

# 开启亚像素动态模糊（推荐用于高品质终版发布）
npx huashu-motion render promo-video --blur
```

---

## 工程结构目录

```
promo-video/
├── treatment.md       # 导演案：包含分镜大纲、旁白口播稿、118 BPM 节拍单与连续性链路
├── index.html         # 核心合成工程（符合 huashu-motion 规范，包含 ABC 乐谱与图层）
├── assets/            # 高清产品截图与 Logo 原图
│   ├── logo.png
│   ├── 01-cheer-greeting.png
│   ├── 02-timer-countdown.png
│   ├── 03-timer-short-pomodoro.png
│   ├── 04-todo-checklist.png
│   ├── 09-fullscreen-zen.png
│   ├── 10-mobile-responsive.png
│   └── 12-auth-cloud-sync.png
└── vendor/            # huashu-motion 运行时核心与 GSAP 引擎
    ├── gsap.min.js
    └── om.js
```

---

## 视频分镜与节奏设计 (118 BPM)

| 场景标记 | 时段 | 核心画面与动作 | 音效 (SFX) 与旁白 |
|---|---|---|---|
| `scene:hook` | 00.0s - 03.5s | 深色虚空，TimePulse 发光时间环聚拢，标语浮起 | 气流呼啸 + 机械钟表滴答，「时间，不该只是冰冷的数字流逝」 |
| `scene:timers` | 03.5s - 08.6s | 3D 卡片透视推入：长期倒数日推进至 64.8%，番茄钟翡翠绿光环转动 | 科技重低音 + 气泡弹跳，「长期倒数日精准锚定每一个重要节点，短期番茄钟沉浸聚焦当下每一分钟」 |
| `scene:cheer` | 08.6s - 11.2s | 农历节气卡片（霜降）与每日名言展开，元气打气交互跳动 | 清脆风铃声，「农历节气与晨昏温润问候」 |
| `scene:todo` | 11.2s - 14.5s | 三色优先级清单自动打勾，整体收缩为右下角常驻悬浮微挂件（Widget） | 磁吸落位音，「三色优先级待办清单，一键收纳为桌面常驻悬浮挂件」 |
| `scene:zen` | 14.5s - 21.0s | 周围元素如呼吸般散去，巨幅极简数字时钟防烧屏微漂移 | 空灵吸气音，音乐短暂停顿留白，「一键进入纯净禅模式，隐去所有干扰，让桌面回归最专注的宁静」 |
| `scene:ecosystem`| 21.0s - 25.5s | macOS / Windows / Android 三端视窗并排，Supabase 云同步点亮 | 能量爆发重音，「双轨存储与云端增量同步，macOS、Windows、Android，多端原生奔跑」 |
| `scene:hero` | 25.5s - 30.5s | Logo 居中爆发定格，终极标语与开源体验标签沉淀 | 终曲撞击音，「TimePulse —— 优雅掌控时间，沉浸陪伴每一个当下」 |
