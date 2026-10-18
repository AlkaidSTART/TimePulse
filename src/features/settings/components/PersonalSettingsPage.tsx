import { useState, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  FiArrowLeft,
  FiSun,
  FiRotateCcw,
  FiRotateCw,
  FiGlobe,
  FiCoffee,
  FiChevronRight,
  FiInfo,
  FiImage,
  FiLogIn,
  FiLogOut,
  FiShield,
  FiCheckCircle,
  FiCheck,
  FiUploadCloud,
  FiTrash2,
} from 'react-icons/fi';
import { SiWechat } from 'react-icons/si';
import { LuPalette } from 'react-icons/lu';
import { usePageTransition } from '@/hooks/usePageTransition';
import { useOrientation } from '@/hooks/useOrientation';
import { useTheme } from '@/app/providers/ThemeProvider';
import { usePersonalSettingsStore } from '@/stores/usePersonalSettingsStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useVersionStore } from '@/stores/useVersionStore';
import { UserAvatar } from '@/components/composed/UserAvatar';
import { getEffectiveAvatarUrl } from '@/utils/avatar';
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

  const nickname = usePersonalSettingsStore((s) => s.nickname);
  const avatar = usePersonalSettingsStore((s) => s.avatar);
  const resetSettings = usePersonalSettingsStore((s) => s.resetSettings);
  const uploadAvatar = useAuthStore((s) => s.uploadAvatar);
  const removeAvatar = useAuthStore((s) => s.removeAvatar);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarFeedback, setAvatarFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const settingsFileInputRef = useRef<HTMLInputElement>(null);

  const userDisplayName = user?.user_metadata?.nickname || (nickname === '阳光旅人' ? '' : nickname) || (user?.email ? user.email.split('@')[0] : t('personalSettings.memberDefaultName', 'TimePulse 会员'));
  const userAvatarUrl = getEffectiveAvatarUrl(user, avatar);

  const handleAvatarUpload = async (file: File) => {
    setIsUploadingAvatar(true);
    setAvatarFeedback(null);

    if (!user) {
      setIsUploadingAvatar(false);
      setAvatarFeedback({
        type: 'error',
        message: t('personalSettings.avatarLoginRequired', '云端存储空间仅 5MB，请先登录账号后再上传专属头像'),
      });
      setTimeout(() => setAvatarFeedback(null), 4500);
      return;
    }

    const res = await uploadAvatar(file);
    setIsUploadingAvatar(false);
    if (res.success) {
      setAvatarFeedback({ type: 'success', message: t('personalSettings.avatarUploadSuccess', '头像已自动优化至轻量 WebP 并同步至云端！') });
      setTimeout(() => setAvatarFeedback(null), 3500);
    } else {
      setAvatarFeedback({ type: 'error', message: res.error || t('personalSettings.avatarUploadFailed', '头像上传失败，请稍后重试') });
      setTimeout(() => setAvatarFeedback(null), 4500);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm(t('personalSettings.avatarResetConfirm', '确定要恢复默认头像吗？'))) return;
    setIsUploadingAvatar(true);
    setAvatarFeedback(null);
    const res = await removeAvatar();
    setIsUploadingAvatar(false);
    if (res.success) {
      setAvatarFeedback({ type: 'success', message: t('personalSettings.avatarResetSuccess', '已恢复默认头像') });
      setTimeout(() => setAvatarFeedback(null), 3000);
    } else {
      setAvatarFeedback({ type: 'error', message: res.error || t('personalSettings.avatarResetFailed', '重置头像失败') });
      setTimeout(() => setAvatarFeedback(null), 4000);
    }
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
              className="glass-circle-button size-10 sm:size-11 shrink-0"
              title={t('common.back', '返回')}
            >
              <FiArrowLeft className="size-4.5 sm:size-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-950 dark:text-white cream:text-[#26211e]">
                {t('personalSettings.title', '个人设置中心')}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 cream:text-[#786e63] mt-0.5">
                {t('personalSettings.subtitle', '定制主题外观、语言偏好与系统设置')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (window.confirm(t('personalSettings.resetConfirm', '确定要恢复默认设置吗？已记录的打气数据将重置。'))) {
                resetSettings();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 cream:text-[#786e63] cream:hover:text-red-600 transition-colors"
          >
            <FiRotateCcw className="size-3.5" />
            <span className="hidden sm:inline">{t('personalSettings.resetDefault', '恢复默认')}</span>
          </button>
        </div>

        {/* 0. 云端账号卡片 (Supabase BaaS) */}
        <section className="rounded-2xl border border-black/[0.06] dark:border-white/10 cream:border-[#dfd3c0] bg-white/85 dark:bg-white/[0.05] cream:bg-[#faf5ea]/90 p-5 sm:p-6 backdrop-blur-xl shadow-xs cream:shadow-[0_4px_20px_-2px_rgba(120,95,65,0.06)]">
          {user ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <UserAvatar
                  avatarUrl={userAvatarUrl}
                  name={userDisplayName}
                  size="lg"
                  editable
                  isUploading={isUploadingAvatar}
                  onUpload={handleAvatarUpload}
                  accentColor={accentColor || '#10A37F'}
                  showOnlineIndicator
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-white cream:text-[#26211e] truncate">
                      {userDisplayName}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      <FiCheckCircle className="size-2.5" /> {t('personalSettings.signedIn', '已登录')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 cream:text-[#786e63] truncate mt-0.5">
                    {user.email}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-gray-500 dark:text-gray-400 cream:text-[#786e63]">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-mono text-[10px]">
                      {t('personalSettings.quota5MB', '5MB 配额')}
                    </span>
                    <span>{t('personalSettings.avatarSpecs', '限 JPG/PNG/WEBP · 单图 ≤ 2MB · 自动优化为 256×256 WebP · 覆盖防冗余')}</span>
                  </div>
                  {avatarFeedback && (
                    <p className={`text-xs mt-1.5 font-medium ${avatarFeedback.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      {avatarFeedback.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => settingsFileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/15 cream:border-[#d5c7b3] bg-white/80 hover:bg-white dark:bg-white/[0.06] cream:bg-[#eee4d4] dark:hover:bg-white/[0.12] cream:hover:bg-[#e4d9c7] text-xs font-semibold text-gray-800 dark:text-gray-200 cream:text-[#26211e] shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  title={t('personalSettings.changeAvatarTitle', '上传自定义头像（自动压缩并覆盖旧头像）')}
                >
                  <FiUploadCloud className="size-3.5 text-primary-500" />
                  <span>{isUploadingAvatar ? t('personalSettings.uploading', '上传中...') : t('personalSettings.changeAvatar', '更换头像')}</span>
                </button>
                {userAvatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
                    title={t('personalSettings.removeAvatar', '移除')}
                  >
                    <FiTrash2 className="size-3.5" />
                    <span>{t('personalSettings.removeAvatar', '移除')}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => transitionTo('auth')}
                  className="px-3.5 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/15 cream:border-[#d5c7b3] bg-white/80 hover:bg-white dark:bg-white/[0.06] cream:bg-[#eee4d4] dark:hover:bg-white/[0.12] cream:hover:bg-[#e4d9c7] text-xs font-semibold text-gray-800 dark:text-gray-200 cream:text-[#26211e] shadow-2xs transition-colors cursor-pointer"
                >
                  {t('personalSettings.manageAccount', '管理账号')}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <FiLogOut className="size-3.5" />
                  <span>{t('personalSettings.signOut', '退出')}</span>
                </button>
              </div>

              {/* 隐藏的文件输入组件 */}
              <input
                ref={settingsFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleAvatarUpload(file);
                  e.target.value = '';
                }}
                aria-hidden="true"
              />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <UserAvatar
                  avatarUrl={userAvatarUrl}
                  name={userDisplayName}
                  size="lg"
                  editable
                  isUploading={isUploadingAvatar}
                  onUpload={() => {
                    setAvatarFeedback({
                      type: 'error',
                      message: t('personalSettings.avatarLoginRequired', '云端存储空间仅 5MB，请先登录账号后再上传专属头像'),
                    });
                    setTimeout(() => transitionTo('auth'), 800);
                  }}
                  accentColor={accentColor || '#10A37F'}
                />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white cream:text-[#26211e]">
                    {t('personalSettings.signInPrompt', '登录 / 注册 TimePulse 账号')}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 cream:text-[#786e63] mt-0.5">
                    {t('personalSettings.signInPromptDesc', '基于 Supabase BaaS 云端身份认证，数据安全有保障')}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 cream:text-[#8a7f72] mt-0.5">
                    {t('personalSettings.avatarSpecsTip', '登录后可上传个人专属云端头像（配额 5MB，单图≤2MB，覆盖防冗余）')}
                  </p>
                  {avatarFeedback && (
                    <p className={`text-xs mt-1.5 font-medium ${avatarFeedback.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      {avatarFeedback.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => {
                    setAvatarFeedback({
                      type: 'error',
                      message: t('personalSettings.avatarLoginRequired', '云端存储空间仅 5MB，请先登录账号后再上传专属头像'),
                    });
                    setTimeout(() => transitionTo('auth'), 800);
                  }}
                  disabled={isUploadingAvatar}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-black/[0.08] dark:border-white/15 cream:border-[#d5c7b3] bg-white/80 hover:bg-white dark:bg-white/[0.06] cream:bg-[#eee4d4] dark:hover:bg-white/[0.12] cream:hover:bg-[#e4d9c7] text-gray-800 dark:text-gray-200 cream:text-[#26211e] transition-colors cursor-pointer disabled:opacity-50"
                  title={t('personalSettings.uploadAvatarTitle', '登录后上传自定义头像到 Supabase touxiang 存储桶')}
                >
                  <FiUploadCloud className="size-4 text-primary-500" />
                  <span>{isUploadingAvatar ? t('personalSettings.uploading', '上传中...') : t('personalSettings.uploadAvatar', '上传头像')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => transitionTo('auth')}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-xs transition-opacity hover:opacity-90 cursor-pointer"
                  style={{ backgroundColor: accentColor || '#10A37F' }}
                >
                  <FiLogIn className="size-4" />
                  <span>{t('personalSettings.signInNow', '立即登录 / 注册')}</span>
                </button>
              </div>

              {/* 隐藏的文件输入组件 */}
              <input
                ref={settingsFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleAvatarUpload(file);
                  e.target.value = '';
                }}
                aria-hidden="true"
              />
            </div>
          )}
        </section>

        {/* 1. 外观主题与色彩 */}
        <section className="rounded-2xl border border-black/[0.06] dark:border-white/10 cream:border-[#dfd3c0] bg-white/85 dark:bg-white/[0.05] cream:bg-[#faf5ea]/90 p-5 sm:p-6 backdrop-blur-xl shadow-xs cream:shadow-[0_4px_20px_-2px_rgba(120,95,65,0.06)] space-y-4">
          <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-gray-900 dark:text-white cream:text-[#26211e]">
            <LuPalette className="size-4 text-teal-500" />
            <span>{t('personalSettings.appearance', '外观主题与色彩')}</span>
          </div>

          {/* 主题明暗模式 */}
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 cream:text-[#3d362f]">
              {t('personalSettings.themeMode', '界面模式')}：{theme === 'cream' ? t('personalSettings.themeCream', '米白模式') : t('personalSettings.themeLight', '白色模式')}
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/15 cream:border-[#d5c7b3] bg-white/80 hover:bg-white dark:bg-white/[0.06] cream:bg-[#eee4d4] dark:hover:bg-white/[0.12] cream:hover:bg-[#e4d9c7] text-xs font-semibold text-gray-800 dark:text-gray-200 cream:text-[#26211e] shadow-2xs transition-colors cursor-pointer"
            >
              <FiSun className="size-3.5 text-amber-500" />
              <span>{t('personalSettings.toggleMode', '切换模式')}</span>
            </button>
          </div>

          {/* 常用预设强调色 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 cream:text-[#52493f]">
              {t('personalSettings.accentColor', '快速点选应用强调色 (Accent Color)')}
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
                      isSelected ? 'scale-115 border-gray-900 dark:border-white cream:border-[#26211e] shadow-xs' : 'border-transparent hover:scale-105'
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
          <div className="flex items-center justify-between pt-2 border-t border-black/[0.05] dark:border-white/10 cream:border-[#dfd3c0]/60">
            <div className="flex items-center gap-2">
              <FiGlobe className="size-4 sm:size-4.5 text-sky-500" />
              <div>
                <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 cream:text-[#26211e]">
                  {t('mobile.language', '语言偏好 / Language')}
                </span>
                <p className="text-[11px] sm:text-xs text-gray-400 cream:text-[#8a7f72]">
                  {currentLang === 'zh-CN' ? t('personalSettings.currentChinese', '当前：简体中文') : t('personalSettings.currentEnglish', 'Current: English')}
                </p>
              </div>
            </div>
            <div className="flex items-center p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] cream:bg-[#eae0cf] text-xs sm:text-sm font-semibold shrink-0 border border-black/[0.04] dark:border-white/[0.04] cream:border-[#d9cbba]">
              <button
                type="button"
                onClick={() => currentLang !== 'zh-CN' && changeLanguage('zh-CN')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer active:scale-95 ${
                  currentLang === 'zh-CN'
                    ? 'bg-white dark:bg-white/[0.16] cream:bg-[#faf6ee] text-gray-900 dark:text-white cream:text-[#26211e] shadow-xs font-bold'
                    : 'text-gray-500 dark:text-gray-400 cream:text-[#7d7164] hover:text-gray-900 dark:hover:text-white cream:hover:text-[#26211e]'
                }`}
              >
                {t('personalSettings.chinese', '中文')}
              </button>
              <button
                type="button"
                onClick={() => currentLang !== 'en-US' && changeLanguage('en-US')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-sans active:scale-95 ${
                  currentLang === 'en-US'
                    ? 'bg-white dark:bg-white/[0.16] cream:bg-[#faf6ee] text-gray-900 dark:text-white cream:text-[#26211e] shadow-xs font-bold'
                    : 'text-gray-500 dark:text-gray-400 cream:text-[#7d7164] hover:text-gray-900 dark:hover:text-white cream:hover:text-[#26211e]'
                }`}
              >
                {t('personalSettings.english', 'EN')}
              </button>
            </div>
          </div>

          {/* 背景壁纸与毛玻璃 */}
          <div className="flex items-center justify-between pt-2 border-t border-black/[0.05] dark:border-white/10 cream:border-[#dfd3c0]/60">
            <div className="flex items-center gap-2">
              <FiImage className="size-4 text-purple-500" />
              <div>
                <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 cream:text-[#26211e]">
                  {t('mobile.wallpaper', '背景壁纸与氛围')}
                </span>
                <p className="text-[11px] text-gray-400 cream:text-[#8a7f72]">
                  {t('mobile.wallpaperDesc', '渐变配色、自定义壁纸与毛玻璃模糊度')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.hash = 'background';
              }}
              className="px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/15 cream:border-[#d5c7b3] bg-white/80 hover:bg-white dark:bg-white/[0.06] cream:bg-[#eee4d4] dark:hover:bg-white/[0.12] cream:hover:bg-[#e4d9c7] text-xs font-semibold text-primary-600 dark:text-primary-400 cream:text-primary-700 shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <span>{t('mobile.customize', '定制')}</span>
              <FiChevronRight className="size-3.5" />
            </button>
          </div>

          {/* 移动端横竖屏与显示模式 */}
          <div className="flex items-center justify-between pt-2 border-t border-black/[0.05] dark:border-white/10 cream:border-[#dfd3c0]/60">
            <div className="flex items-center gap-2">
              <FiRotateCw className={`size-4 text-emerald-500 transition-transform duration-300 ${isLandscape ? 'rotate-90' : ''}`} />
              <div>
                <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 cream:text-[#26211e]">
                  {t('mobile.orientation', '横竖屏与显示')}
                </span>
                <p className="text-[11px] text-gray-400 cream:text-[#8a7f72]">
                  {isLandscape
                    ? t('mobile.orientationLandscape', '横屏模式 · StandBy 桌面时钟')
                    : t('mobile.orientationPortrait', '竖屏模式 · 支持重力感应自适应')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void toggleOrientation()}
              className="px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/15 cream:border-[#d5c7b3] bg-white/80 hover:bg-white dark:bg-white/[0.06] cream:bg-[#eee4d4] dark:hover:bg-white/[0.12] cream:hover:bg-[#e4d9c7] text-xs font-semibold text-primary-600 dark:text-primary-400 cream:text-primary-700 shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <span>{isLandscape ? t('header.rotateToPortrait', '切换竖屏') : t('header.rotateToLandscape', '切换横屏')}</span>
              <FiChevronRight className="size-3.5" />
            </button>
          </div>
        </section>

        {/* 3. 支持与联系作者 (Buy Me a Coffee & Contact Author) */}
        <section className="rounded-2xl border border-black/[0.06] dark:border-white/10 cream:border-[#dfd3c0] bg-white/85 dark:bg-white/[0.05] cream:bg-[#faf5ea]/90 p-5 sm:p-6 backdrop-blur-xl shadow-xs cream:shadow-[0_4px_20px_-2px_rgba(120,95,65,0.06)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-gray-900 dark:text-white cream:text-[#26211e]">
              <FiCoffee className="size-4 text-amber-500" />
              <span>{t('personalSettings.supportSection', '支持与联系作者')}</span>
            </div>
            <span className="text-xs text-gray-400 cream:text-[#8a7f72]">TimePulse · Alkaid</span>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 cream:text-[#52493f] leading-relaxed">
            {t('personalSettings.supportDesc', 'TimePulse 专为专注与沉浸流而生。如果这款应用给你的工作和日常带来了陪伴与便利，欢迎支持作者或交流反馈！')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => openAboutModal('coffee')}
              className="flex items-center justify-between p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 cream:bg-amber-600/[0.08] cream:border-amber-700/30 cream:hover:bg-amber-600/[0.14] text-gray-800 dark:text-gray-100 cream:text-[#26211e] transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <FiCoffee className="size-5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-gray-900 dark:text-white cream:text-[#26211e]">
                    {t('version.buyMeACoffee', '请作者喝咖啡')}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 cream:text-[#786e63]">
                    {t('personalSettings.buyMeACoffeeSubtitle', 'Buy Me a Coffee · 赞赏码')}
                  </div>
                </div>
              </div>
              <FiChevronRight className="size-4 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              type="button"
              onClick={() => openAboutModal('contact')}
              className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 cream:bg-emerald-600/[0.08] cream:border-emerald-700/30 cream:hover:bg-emerald-600/[0.14] text-gray-800 dark:text-gray-100 cream:text-[#26211e] transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <SiWechat className="size-5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-gray-900 dark:text-white cream:text-[#26211e]">
                    {t('version.contactAuthor', '联系作者')}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 cream:text-[#786e63]">
                    {t('personalSettings.contactAuthorSubtitle', '微信扫码 · 交流反馈')}
                  </div>
                </div>
              </div>
              <FiChevronRight className="size-4 text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* 版本与更新卡片 */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-black/[0.06] dark:border-white/10 cream:border-[#d8cabb] bg-black/[0.02] dark:bg-white/[0.03] cream:bg-[#f4ebe0]/75 mt-2">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-neutral-500/10 text-neutral-600 dark:bg-white/10 dark:text-neutral-300 cream:bg-stone-500/15 cream:text-stone-700 flex items-center justify-center shrink-0">
                <FiInfo className="size-5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-gray-900 dark:text-white cream:text-[#26211e] flex items-center gap-2">
                  <span>{t('version.title', '版本与更新')}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 cream:bg-[#e5d9ca] text-gray-600 dark:text-gray-300 cream:text-[#52493f]">
                    v{currentVersion}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 cream:text-[#786e63]">
                  {hasUpdate ? t('version.hasNewVersion', '发现新版本可供升级') : t('version.upToDate', '当前已是最新版本')}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openAboutModal('version')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400 cream:bg-primary-500/20 cream:text-primary-700 hover:bg-primary-500/25 transition-colors cursor-pointer"
            >
              {hasUpdate ? t('personalSettings.upgradeNow', '立即升级') : t('personalSettings.viewDetails', '查看详情')}
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
