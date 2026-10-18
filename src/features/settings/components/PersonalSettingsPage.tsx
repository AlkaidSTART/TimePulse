import { useState, useEffect, useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  FiArrowLeft,
  FiUser,
  FiSun,
  FiCheck,
  FiRotateCcw,
  FiRotateCw,
  FiSave,
  FiGlobe,
  FiCoffee,
  FiChevronRight,
  FiInfo,
  FiImage,
  FiLogIn,
  FiLogOut,
  FiShield,
  FiCheckCircle,
} from 'react-icons/fi';
import { SiWechat } from 'react-icons/si';
import { LuPalette } from 'react-icons/lu';
import { usePageTransition } from '@/hooks/usePageTransition';
import { useOrientation } from '@/hooks/useOrientation';
import { useTheme } from '@/app/providers/ThemeProvider';
import { usePersonalSettingsStore } from '@/stores/usePersonalSettingsStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useVersionStore } from '@/stores/useVersionStore';
import { CHATGPT_THEME_PRESETS } from '@/constants/colors';
import { useTranslation } from '@/i18n/useTranslation';
import type { Language } from '@/i18n/types';

export default function PersonalSettingsPage() {
  const shouldReduceMotion = useReducedMotion();
  const { transitionTo } = usePageTransition();
  const { isLandscape, toggleOrientation } = useOrientation();
  const { theme, toggleTheme, accentColor, updateAccentColor, setThemePreset } = useTheme();
  const { t, currentLang, changeLanguage } = useTranslation();
  const openAboutModal = useVersionStore((s) => s.openAboutModal);
  const currentVersion = useVersionStore((s) => s.currentVersion);
  const hasUpdate = useVersionStore((s) => s.hasUpdate);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const {
    nickname,
    customMotto,
    updateSettings,
    resetSettings,
  } = usePersonalSettingsStore();

  const cleanInitialNickname = nickname === '阳光旅人' ? '' : nickname;

  const [inputNickname, setInputNickname] = useState(cleanInitialNickname);
  const [inputMotto, setInputMotto] = useState(customMotto);
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    if (nickname === '阳光旅人') {
      updateSettings({ nickname: '' });
      setInputNickname('');
    }
  }, [nickname, updateSettings]);

  const nicknameInputId = useId();
  const mottoInputId = useId();

  // 保存个人资料修改
  const handleSaveProfile = () => {
    updateSettings({
      nickname: inputNickname.trim(),
      customMotto: inputMotto.trim(),
    });
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  return (
    <div
      data-page-view="settings"
      className="personal-settings-page relative flex h-full w-full flex-col overflow-y-auto px-4 md:px-8 select-none"
      style={{
        paddingTop: 'var(--settings-pt, max(4.5rem, calc(3.75rem + env(safe-area-inset-top, 0px))))',
        paddingBottom: 'var(--settings-pb, max(6.5rem, calc(5.5rem + env(safe-area-inset-bottom, 0px))))',
        paddingLeft: 'max(1rem, var(--tp-safe-left, env(safe-area-inset-left, 0px)))',
        paddingRight: 'max(1rem, var(--tp-safe-right, env(safe-area-inset-right, 0px)))',
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
              className="flex items-center justify-center size-10 sm:size-11 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 transition-colors active:scale-95 cursor-pointer"
              title="返回"
            >
              <FiArrowLeft className="size-4.5 sm:size-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-950 dark:text-white">
                个人设置中心
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                定制你的称呼、专属座右铭与主题外观
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
            <span>设置保存成功！个人资料已实时同步更新。</span>
          </motion.div>
        )}

        {/* 0. 云端账号卡片 (Supabase BaaS) */}
        <section className="rounded-2xl border border-black/[0.08] dark:border-white/10 bg-white/70 dark:bg-white/[0.05] p-5 sm:p-6 backdrop-blur-xl shadow-xs">
          {user ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/30 ring-2 ring-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-base">
                  {(user.user_metadata?.nickname || user.email || 'U').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                      {user.user_metadata?.nickname || 'TimePulse 会员'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      <FiCheckCircle className="size-2.5" /> 已登录
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => transitionTo('auth')}
                  className="px-3.5 py-1.5 rounded-xl border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.12] text-xs font-semibold text-gray-800 dark:text-gray-200 transition-colors"
                >
                  管理账号
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1"
                >
                  <FiLogOut className="size-3.5" />
                  <span>退出</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-black/[0.05] dark:bg-white/[0.08] text-gray-600 dark:text-gray-300">
                  <FiShield className="size-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                    登录 / 注册 TimePulse 账号
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    基于 Supabase BaaS 云端身份认证，数据安全有保障
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => transitionTo('auth')}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-xs transition-opacity hover:opacity-90 self-start sm:self-center"
                style={{ backgroundColor: accentColor || '#10A37F' }}
              >
                <FiLogIn className="size-4" />
                <span>立即登录 / 注册</span>
              </button>
            </div>
          )}
        </section>

        {/* 1. 个人形象与称呼资料 */}
        <section className="rounded-2xl border border-black/[0.08] dark:border-white/10 bg-white/70 dark:bg-white/[0.05] p-5 sm:p-6 backdrop-blur-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-gray-900 dark:text-white">
              <FiUser className="size-4 text-primary-500" />
              <span>个人称谓与签名</span>
            </div>
            <span className="text-xs text-gray-400">用于在问候卡片中称呼你</span>
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

        {/* 2. 外观主题与色彩 */}
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
            <div className="flex items-center gap-2.5 pt-1 overflow-x-auto scrollbar-hide py-1">
              {CHATGPT_THEME_PRESETS.map((preset) => {
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
                    className={`size-9 sm:size-10 rounded-full border-2 transition-transform flex items-center justify-center shrink-0 active:scale-95 cursor-pointer ${
                      isSelected ? 'scale-115 border-gray-900 dark:border-white shadow-xs' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset.color }}
                  >
                    {isSelected && <FiCheck className="size-4 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 界面语言偏好 */}
          <div className="flex items-center justify-between pt-2 border-t border-black/[0.05] dark:border-white/10">
            <div className="flex items-center gap-2">
              <FiGlobe className="size-4 sm:size-4.5 text-sky-500" />
              <div>
                <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">
                  {t('mobile.language', '语言偏好 / Language')}
                </span>
                <p className="text-[11px] sm:text-xs text-gray-400">
                  {currentLang === 'zh-CN' ? '当前：简体中文' : 'Current: English'}
                </p>
              </div>
            </div>
            <div className="flex items-center p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] text-xs sm:text-sm font-semibold shrink-0 border border-black/[0.04] dark:border-white/[0.04]">
              <button
                type="button"
                onClick={() => currentLang !== 'zh-CN' && changeLanguage('zh-CN')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer active:scale-95 ${
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
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-sans active:scale-95 ${
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

          {/* 移动端横竖屏与显示模式 */}
          <div className="flex items-center justify-between pt-2 border-t border-black/[0.05] dark:border-white/10">
            <div className="flex items-center gap-2">
              <FiRotateCw className={`size-4 text-emerald-500 transition-transform duration-300 ${isLandscape ? 'rotate-90' : ''}`} />
              <div>
                <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">
                  {t('mobile.orientation', '横竖屏与显示')}
                </span>
                <p className="text-[11px] text-gray-400">
                  {isLandscape
                    ? t('mobile.orientationLandscape', '横屏模式 · StandBy 桌面时钟')
                    : t('mobile.orientationPortrait', '竖屏模式 · 支持重力感应自适应')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void toggleOrientation()}
              className="px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.12] text-xs font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1 cursor-pointer"
            >
              <span>{isLandscape ? t('header.rotateToPortrait', '切换竖屏') : t('header.rotateToLandscape', '切换横屏')}</span>
              <FiChevronRight className="size-3.5" />
            </button>
          </div>
        </section>

        {/* 3. 支持与联系作者 (Buy Me a Coffee & Contact Author) */}
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
