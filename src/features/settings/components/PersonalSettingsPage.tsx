import { useState, useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  FiArrowLeft,
  FiUser,
  FiSmile,
  FiZap,
  FiLayout,
  FiSliders,
  FiSun,
  FiMoon,
  FiCheck,
  FiTrash2,
  FiRotateCcw,
  FiSave,
  FiHeart,
  FiGlobe,
  FiSmartphone,
  FiCoffee,
  FiChevronRight,
  FiInfo,
  FiImage,
} from 'react-icons/fi';
import { SiWechat } from 'react-icons/si';
import { LuSparkles, LuPalette } from 'react-icons/lu';
import { usePageTransition } from '@/hooks/usePageTransition';
import { useTheme } from '@/app/providers/ThemeProvider';
import { usePersonalSettingsStore, type CheerStyle, type DefaultStartPage } from '@/stores/usePersonalSettingsStore';
import { useVersionStore } from '@/stores/useVersionStore';
import { CHATGPT_THEME_PRESETS } from '@/constants/colors';
import { useTranslation } from '@/i18n/useTranslation';
import type { Language } from '@/i18n/types';

const AVATAR_PRESETS = ['专注', '自律', '沉静', '晨曦', '漫步', '远航', '求索', '笃行'];

export default function PersonalSettingsPage() {
  const shouldReduceMotion = useReducedMotion();
  const { transitionTo } = usePageTransition();
  const { theme, toggleTheme, accentColor, updateAccentColor, setThemePreset } = useTheme();
  const { t, currentLang, changeLanguage } = useTranslation();
  const openAboutModal = useVersionStore((s) => s.openAboutModal);
  const currentVersion = useVersionStore((s) => s.currentVersion);
  const hasUpdate = useVersionStore((s) => s.hasUpdate);

  const {
    nickname,
    avatar,
    customMotto,
    cheerStyle,
    defaultStartPage,
    cheerCount,
    cheerNotes,
    vibrationEnabled,
    updateSettings,
    addCheerNote,
    removeCheerNote,
    resetSettings,
  } = usePersonalSettingsStore();

  const [inputNickname, setInputNickname] = useState(nickname);
  const [inputMotto, setInputMotto] = useState(customMotto);
  const [selectedAvatar, setSelectedAvatar] = useState(avatar);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [saveToast, setSaveToast] = useState(false);

  const nicknameInputId = useId();
  const mottoInputId = useId();
  const customAvatarInputId = useId();
  const noteInputId = useId();

  // 保存个人资料修改
  const handleSaveProfile = () => {
    updateSettings({
      nickname: inputNickname.trim(),
      avatar: selectedAvatar,
      customMotto: inputMotto.trim(),
    });
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  // 添加打气心得
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    addCheerNote(newNoteContent.trim(), selectedAvatar);
    setNewNoteContent('');
  };

  return (
    <div
      data-page-view="settings"
      className="relative flex h-full w-full flex-col overflow-y-auto px-4 py-6 md:px-8 lg:py-10 select-none pb-28 lg:pb-24"
      style={{
        paddingTop: 'max(4.25rem, calc(3.5rem + env(safe-area-inset-top, 0px)))',
        paddingBottom: 'max(6.5rem, calc(5.5rem + env(safe-area-inset-bottom, 0px)))',
      }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">

        {/* 顶部标题栏与返回按钮 */}
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.08] dark:border-white/10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  window.history.back();
                } else {
                  transitionTo('main');
                }
              }}
              className="flex items-center justify-center size-9 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 transition-colors"
              title="返回"
            >
              <FiArrowLeft className="size-4" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-950 dark:text-white flex items-center gap-2">
                <span>个人设置中心</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-600 dark:text-primary-400 font-semibold">
                  Profile & Settings
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                定制你的称呼、打气问候偏好、主题外观与启动模式
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('确定要恢复默认设置吗？已记录的打气数据将重置。')) {
                resetSettings();
                setInputNickname('');
                setInputMotto('心怀热爱，奔赴每一个灿烂的日子');
                setSelectedAvatar('');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <FiRotateCcw className="size-3.5" />
            <span className="hidden sm:inline">恢复默认</span>
          </button>
        </div>

        {/* 保存反馈气泡 */}
        {saveToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-semibold"
          >
            <FiCheck className="size-4 text-emerald-500" />
            <span>设置保存成功！打气路由和问候称呼已实时同步更新。</span>
          </motion.div>
        )}

        {/* 1. 个人形象与称呼资料 */}
        <section className="rounded-2xl border border-black/[0.08] dark:border-white/10 bg-white/70 dark:bg-white/[0.05] p-5 sm:p-6 backdrop-blur-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-gray-900 dark:text-white">
              <FiUser className="size-4 text-primary-500" />
              <span>个人称谓与风格</span>
            </div>
            <span className="text-xs text-gray-400">用于在问候卡片中称呼你</span>
          </div>

          {/* 风格标签快捷选择 */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
              选择专注风格标签
            </label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_PRESETS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedAvatar(selectedAvatar === tag ? '' : tag)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    selectedAvatar === tag
                      ? 'bg-primary-500 text-white shadow-xs'
                      : 'bg-black/[0.04] dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 hover:bg-black/[0.08] dark:hover:bg-white/[0.12]'
                  }`}
                >
                  {tag}
                </button>
              ))}
              <input
                id={customAvatarInputId}
                type="text"
                maxLength={4}
                value={selectedAvatar}
                onChange={(e) => setSelectedAvatar(e.target.value)}
                placeholder=""
                aria-label="自定义标签"
                className="w-20 px-2.5 py-1.5 rounded-xl text-center text-xs bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/15 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* 昵称与座右铭输入 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label htmlFor={nicknameInputId} className="text-xs font-medium text-gray-600 dark:text-gray-300">
                你的称呼 / 昵称
              </label>
              <input
                id={nicknameInputId}
                type="text"
                value={inputNickname}
                onChange={(e) => setInputNickname(e.target.value)}
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/10 dark:border-white/15 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor={mottoInputId} className="text-xs font-medium text-gray-600 dark:text-gray-300">
                个性座右铭 / 专属签名
              </label>
              <input
                id={mottoInputId}
                type="text"
                value={inputMotto}
                onChange={(e) => setInputMotto(e.target.value)}
                placeholder="例如：心怀热爱，奔赴每一个灿烂的日子"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/10 dark:border-white/15 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveProfile}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-xs transition-opacity hover:opacity-90"
              style={{ backgroundColor: accentColor || '#10A37F' }}
            >
              <FiSave className="size-4" />
              <span>保存个人资料</span>
            </button>
          </div>
        </section>

        {/* 2. 打气偏好与问候风格 */}
        <section className="rounded-2xl border border-black/[0.08] dark:border-white/10 bg-white/70 dark:bg-white/[0.05] p-5 sm:p-6 backdrop-blur-xl shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-gray-900 dark:text-white">
            <FiSmile className="size-4 text-amber-500" />
            <span>打气问候语气与风格</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: 'energetic' as CheerStyle, label: '元气活力', desc: '斗志满满，激情冲锋' },
              { id: 'warm' as CheerStyle, label: '温柔治愈', desc: '体贴从容，暖胃暖心' },
              { id: 'poetic' as CheerStyle, label: '诗意浪漫', desc: '山海星辰，文字唯美' },
              { id: 'funny' as CheerStyle, label: '轻松幽默', desc: '逗趣解压，快乐干饭' },
            ].map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => updateSettings({ cheerStyle: style.id })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  cheerStyle === style.id
                    ? 'border-primary-500 bg-primary-500/10 shadow-xs'
                    : 'border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                    {style.label}
                  </span>
                  {cheerStyle === style.id && <FiCheck className="size-3.5 text-primary-500" />}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  {style.desc}
                </p>
              </button>
            ))}
          </div>

          {/* 启动首屏偏好 */}
          <div className="pt-2 border-t border-black/[0.05] dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <FiLayout className="size-3.5 text-sky-500" />
                  <span>应用打开默认进入页面</span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  默认已按您的要求设置为打气路由，您也可以随时切换为时钟或待办
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cheer' as DefaultStartPage, label: '元气打气 (推荐)', badge: '当前默认' },
                { id: 'main' as DefaultStartPage, label: '当前时钟与计时', badge: '第二站' },
                { id: 'todo' as DefaultStartPage, label: '待办任务清单', badge: '清单' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => updateSettings({ defaultStartPage: item.id })}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    defaultStartPage === item.id
                      ? 'border-primary-500 bg-primary-500/10 font-bold text-gray-900 dark:text-white'
                      : 'border-black/[0.06] dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="text-xs block">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 触感震动反馈 */}
          <div className="pt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiSmartphone className="size-4 text-purple-500" />
              <div>
                <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">
                  触感与打气震动反馈
                </span>
                <p className="text-[11px] text-gray-400">点击打气或完成任务时给予轻微触觉反馈</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ vibrationEnabled: !vibrationEnabled })}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                vibrationEnabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <div
                className={`size-5 rounded-full bg-white transition-transform ${
                  vibrationEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </section>

        {/* 3. 外观主题与色彩 */}
        <section className="rounded-2xl border border-black/[0.08] dark:border-white/10 bg-white/70 dark:bg-white/[0.05] p-5 sm:p-6 backdrop-blur-xl shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-gray-900 dark:text-white">
            <LuPalette className="size-4 text-teal-500" />
            <span>外观主题与色彩</span>
          </div>

          {/* 主题明暗模式 */}
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
              界面模式：{theme === 'cream' ? '米白模式' : '浅白模式'}
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.12] text-xs font-semibold text-gray-800 dark:text-gray-200"
            >
              <FiSun className="size-3.5 text-amber-500" />
              <span>切换模式</span>
            </button>
          </div>

          {/* 常用预设强调色 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              快速点选应用强调色 (Accent Color)
            </label>
            <div className="flex flex-wrap gap-2.5 pt-1">
              {CHATGPT_THEME_PRESETS.slice(0, 8).map((preset) => {
                const isSelected = accentColor.toLowerCase() === preset.color.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      updateAccentColor(preset.color);
                      setThemePreset(preset.id, preset.color);
                    }}
                    title={preset.name}
                    className={`size-8 rounded-full border-2 transition-transform flex items-center justify-center ${
                      isSelected ? 'scale-115 border-gray-900 dark:border-white' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset.color }}
                  >
                    {isSelected && <FiCheck className="size-3.5 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 界面语言偏好 */}
          <div className="flex items-center justify-between pt-2 border-t border-black/[0.05] dark:border-white/10">
            <div className="flex items-center gap-2">
              <FiGlobe className="size-4 text-sky-500" />
              <div>
                <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">
                  {t('mobile.language', '语言偏好 / Language')}
                </span>
                <p className="text-[11px] text-gray-400">
                  {currentLang === 'zh-CN' ? '当前：简体中文' : 'Current: English'}
                </p>
              </div>
            </div>
            <div className="flex items-center p-0.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] text-xs font-semibold shrink-0 border border-black/[0.04] dark:border-white/[0.04]">
              <button
                type="button"
                onClick={() => currentLang !== 'zh-CN' && changeLanguage('zh-CN')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  currentLang === 'zh-CN'
                    ? 'bg-white dark:bg-white/[0.16] text-gray-900 dark:text-white shadow-xs font-bold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                中文
              </button>
              <button
                type="button"
                onClick={() => currentLang !== 'en-US' && changeLanguage('en-US')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-sans ${
                  currentLang === 'en-US'
                    ? 'bg-white dark:bg-white/[0.16] text-gray-900 dark:text-white shadow-xs font-bold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {/* 背景壁纸与毛玻璃 */}
          <div className="flex items-center justify-between pt-2 border-t border-black/[0.05] dark:border-white/10">
            <div className="flex items-center gap-2">
              <FiImage className="size-4 text-purple-500" />
              <div>
                <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">
                  {t('mobile.wallpaper', '背景壁纸与氛围')}
                </span>
                <p className="text-[11px] text-gray-400">
                  {t('mobile.wallpaperDesc', '渐变配色、自定义壁纸与毛玻璃模糊度')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.hash = 'background';
              }}
              className="px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.12] text-xs font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1 cursor-pointer"
            >
              <span>{t('mobile.customize', '定制')}</span>
              <FiChevronRight className="size-3.5" />
            </button>
          </div>
        </section>

        {/* 4. 今日打气心得与心情足迹 */}
        <section className="rounded-2xl border border-black/[0.08] dark:border-white/10 bg-white/70 dark:bg-white/[0.05] p-5 sm:p-6 backdrop-blur-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-gray-900 dark:text-white">
              <FiHeart className="size-4 text-rose-500" />
              <span>今日打气心得记录</span>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 font-mono font-bold">
              今日已打气 {cheerCount} 次
            </span>
          </div>

          <form onSubmit={handleAddNote} className="flex gap-2">
            <input
              id={noteInputId}
              type="text"
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="记录一句给自己的鼓励或心得..."
              aria-label="输入鼓励心得"
              className="flex-1 px-3.5 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/10 dark:border-white/15 text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="submit"
              disabled={!newNoteContent.trim()}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: accentColor || '#10A37F' }}
            >
              记录
            </button>
          </form>

          {cheerNotes.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {cheerNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="size-1.5 rounded-full bg-primary-500 shrink-0" />
                    <span className="truncate text-gray-800 dark:text-gray-200">{note.content}</span>
                    <span className="shrink-0 text-[10px] text-gray-400">{note.date} {note.time}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCheerNote(note.id)}
                    className="p-1 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors ml-2"
                    title="删除此记录"
                  >
                    <FiTrash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-xs text-gray-400">
              暂无心得记录，在上方写下你今天的一句加油感悟吧～
            </p>
          )}
        </section>

        {/* 5. 支持与联系作者 (Buy Me a Coffee & Contact Author) */}
        <section className="rounded-2xl border border-black/[0.08] dark:border-white/10 bg-white/70 dark:bg-white/[0.05] p-5 sm:p-6 backdrop-blur-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-gray-900 dark:text-white">
              <FiCoffee className="size-4 text-amber-500" />
              <span>{t('version.supportAuthor', '支持与联系作者')}</span>
            </div>
            <span className="text-xs text-gray-400">TimePulse · Alkaid</span>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            TimePulse 专为专注与沉浸流而生。如果这款应用给你的工作和日常带来了陪伴与便利，欢迎支持作者或交流反馈！
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => openAboutModal('coffee')}
              className="flex items-center justify-between p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-gray-800 dark:text-gray-100 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <FiCoffee className="size-5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-gray-900 dark:text-white">
                    {t('version.buyMeACoffee', '请作者喝咖啡')}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    Buy Me a Coffee · 赞赏码
                  </div>
                </div>
              </div>
              <FiChevronRight className="size-4 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              type="button"
              onClick={() => openAboutModal('contact')}
              className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-gray-800 dark:text-gray-100 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <SiWechat className="size-5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-gray-900 dark:text-white">
                    {t('version.contactAuthor', '联系作者')}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    微信扫码 · 交流反馈
                  </div>
                </div>
              </div>
              <FiChevronRight className="size-4 text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* 版本与更新卡片 */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] mt-2">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-neutral-500/10 text-neutral-600 dark:bg-white/10 dark:text-neutral-300 flex items-center justify-center shrink-0">
                <FiInfo className="size-5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>{t('version.title', '版本与更新')}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                    v{currentVersion}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  {hasUpdate ? t('version.hasNewVersion', '发现新版本可供升级') : t('version.upToDate', '当前已是最新版本')}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openAboutModal('version')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400 hover:bg-primary-500/20 transition-colors cursor-pointer"
            >
              {hasUpdate ? '立即升级' : '查看详情'}
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
