import { useState, useId, useEffect, useMemo, type FormEvent, type CSSProperties } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  FiMail,
  FiLock,
  FiUser,
  FiUserPlus,
  FiLogIn,
  FiEye,
  FiEyeOff,
  FiCheck,
  FiAlertCircle,
  FiLogOut,
  FiCopy,
  FiShield,
  FiCheckCircle,
  FiZap,
  FiSettings,
  FiArrowRight,
  FiChevronLeft,
  FiSun,
  FiMoon,
} from 'react-icons/fi';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePageTransition } from '@/hooks/usePageTransition';
import { useTheme } from '@/app/providers/ThemeProvider';
import { usePersonalSettingsStore } from '@/stores/usePersonalSettingsStore';
import AnimatedLogo from '@/components/layout/AnimatedLogo';
import OAuthButtons from './OAuthButtons';
import { ProgressSubmitButton, type SubmitButtonStatus } from '@/components/ui/ProgressSubmitButton';

type AuthMode = 'signin' | 'signup' | 'forgot';

// 密码强度评估辅助函数
function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (pwd.length >= 8 && /[0-9]/.test(pwd)) score += 1;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
  if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;

  if (score <= 1) return { score: 1, label: '较弱', color: '#f87171' };
  if (score === 2) return { score: 2, label: '中等', color: '#fbbf24' };
  if (score === 3) return { score: 3, label: '良好', color: '#34d399' };
  return { score: 4, label: '安全', color: '#10b981' };
}

export default function AuthPage() {
  const shouldReduceMotion = useReducedMotion();
  const { transitionTo } = usePageTransition();
  const { theme, toggleTheme, accentColor } = useTheme();

  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const successMessage = useAuthStore((s) => s.successMessage);
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const signOut = useAuthStore((s) => s.signOut);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const clearError = useAuthStore((s) => s.clearError);
  const clearSuccessMessage = useAuthStore((s) => s.clearSuccessMessage);

  const nickname = usePersonalSettingsStore((s) => s.nickname);

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signUpNickname, setSignUpNickname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [localValidation, setLocalValidation] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<SubmitButtonStatus>('idle');

  // 监听外部 error 改变，若报错则触发按钮震颤并复位
  useEffect(() => {
    if (error) {
      setSubmitStatus('error');
      const timer = setTimeout(() => {
        setSubmitStatus('idle');
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // 聚焦状态高亮控制
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const emailInputId = useId();
  const passwordInputId = useId();
  const confirmPasswordInputId = useId();
  const nicknameInputId = useId();

  // 监听 URL hash 默认定位到登录或注册
  useEffect(() => {
    const rawHash = window.location.hash.toLowerCase().replace(/^#\/?/, '');
    if (rawHash === 'register' || rawHash === 'signup') {
      setMode('signup');
    } else if (rawHash === 'forgot') {
      setMode('forgot');
    } else {
      setMode('signin');
    }
  }, []);

  // 模式切换时清理错误和消息
  const handleModeChange = (newMode: AuthMode) => {
    clearError();
    clearSuccessMessage();
    setLocalValidation(null);
    setSubmitStatus('idle');
    setMode(newMode);
  };

  // 提交处理
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    clearSuccessMessage();
    setLocalValidation(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalValidation('请输入电子邮箱');
      setSubmitStatus('idle');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setLocalValidation('请输入格式有效的电子邮箱地址');
      setSubmitStatus('idle');
      return;
    }

    if (mode === 'forgot') {
      setSubmitStatus('loading');
      const res = await resetPassword(trimmedEmail);
      if (res.success) {
        setSubmitStatus('success');
      } else {
        setSubmitStatus('error');
      }
      return;
    }

    if (!password) {
      setLocalValidation('请输入密码');
      setSubmitStatus('idle');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setLocalValidation('密码长度至少需要 6 个字符');
        setSubmitStatus('idle');
        return;
      }
      if (password !== confirmPassword) {
        setLocalValidation('两次输入的密码不一致，请核对');
        setSubmitStatus('idle');
        return;
      }

      setSubmitStatus('loading');
      const res = await signUpWithEmail(trimmedEmail, password, {
        nickname: signUpNickname.trim() || undefined,
      });

      if (res.success) {
        setSubmitStatus('success');
      } else {
        setSubmitStatus('error');
      }
    } else if (mode === 'signin') {
      setSubmitStatus('loading');
      const res = await signInWithEmail(trimmedEmail, password);
      if (res.success) {
        setSubmitStatus('success');
      } else {
        setSubmitStatus('error');
      }
    }
  };

  // 成功状态（包括 border 双向滚动动画播放完成）后触发平滑页面跳转
  const handleSuccessComplete = () => {
    if (mode === 'signin') {
      transitionTo('main');
    } else if (mode === 'signup') {
      if (useAuthStore.getState().session) {
        transitionTo('main');
      }
    }
  };

  // 复制用户 ID
  const handleCopyId = (id: string) => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const activeColor = accentColor || '#10A37F';
  const pwdStrength = useMemo(() => getPasswordStrength(password), [password]);

  // 头像缩写提取
  const userDisplayName = user?.user_metadata?.nickname || nickname || '时光守护者';
  const avatarLetter = (userDisplayName.trim().charAt(0) || user?.email?.charAt(0) || 'T').toUpperCase();

  return (
    <div
      data-page-view="auth"
      className="auth-page relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden overflow-y-auto select-none bg-background-light dark:bg-background-dark cream:bg-background-cream text-gray-900 dark:text-gray-100 transition-colors duration-500"
      style={{
        paddingLeft: 'max(1rem, var(--tp-safe-left, env(safe-area-inset-left, 0px)))',
        paddingRight: 'max(1rem, var(--tp-safe-right, env(safe-area-inset-right, 0px)))',
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* 1. 梦幻温润的动态流光背景 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            x: [0, 20, 0],
            y: [0, -25, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -top-[12%] -left-[10%] w-[580px] h-[580px] rounded-full blur-[140px] opacity-25 dark:opacity-20 cream:opacity-20 transition-all duration-700"
          style={{ backgroundColor: activeColor }}
        />
        <motion.div
          animate={{
            scale: [1.1, 1, 1.1],
            x: [0, -30, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -bottom-[15%] -right-[10%] w-[650px] h-[650px] rounded-full blur-[160px] opacity-20 dark:opacity-15 cream:opacity-25 transition-all duration-700"
          style={{ backgroundColor: activeColor }}
        />
        {/* 精致的微光星点与时间细丝纹理 */}
        <div className="absolute inset-0 bg-[radial-gradient(#888_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.04] dark:opacity-[0.03]" />
      </div>

      {/* 2. 独立路由顶部专属导航栏 */}
      <header className="relative z-20 w-full max-w-6xl mx-auto flex items-center justify-between py-2 sm:py-3 px-2 sm:px-4">
        {/* 左侧品牌 */}
        <div className="flex items-center">
          <AnimatedLogo
            accentColor={activeColor}
            size="sm"
            onClick={() => {
              if (user) transitionTo('main');
            }}
            onLinkClick={(e) => {
              if (user) {
                e.preventDefault();
                transitionTo('main');
              }
            }}
          />
        </div>

        {/* 右侧环境控制台：主题切换 + TLS安全徽章 + 登录态跳转 */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 主题切换开关 */}
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/70 dark:bg-white/10 cream:bg-white/80 hover:bg-white/95 dark:hover:bg-white/20 border border-black/[0.08] dark:border-white/15 backdrop-blur-md text-xs font-medium text-gray-700 dark:text-gray-200 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
            title={`切换主题（当前：${theme === 'cream' ? '羊脂米白' : '纯净白'}）`}
          >
            {theme === 'cream' ? (
              <>
                <FiSun className="size-3.5 text-amber-500" />
                <span className="hidden xs:inline text-[11px]">米白</span>
              </>
            ) : (
              <>
                <FiMoon className="size-3.5 text-sky-500" />
                <span className="hidden xs:inline text-[11px]">白色</span>
              </>
            )}
          </button>

          {/* TLS 安全认证徽章 */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/60 dark:bg-white/[0.06] cream:bg-white/70 backdrop-blur-md border border-black/[0.06] dark:border-white/10 text-[10px] sm:text-[11px] font-medium text-gray-600 dark:text-gray-300 shadow-2xs">
            <span className="font-semibold text-gray-800 dark:text-gray-200 hidden sm:inline">
              Supabase BaaS 驱动
            </span>
            <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">|</span>
            <span className="text-gray-600 dark:text-gray-300 flex items-center gap-1 font-mono text-[10px] sm:text-[11px]">
              <FiShield className="size-3 text-emerald-500" />
              <span>TLS 加密认证</span>
            </span>
          </div>

          {/* 如果已登录，提供直达主页按钮 */}
          {user && (
            <button
              type="button"
              onClick={() => transitionTo('main')}
              className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-xs font-semibold text-white shadow-xs transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              style={{ backgroundColor: activeColor }}
            >
              <span>进入主页</span>
              <FiArrowRight className="size-3" />
            </button>
          )}
        </div>
      </header>

      {/* 3. 核心内容区域：桌面端奢华双栏，移动端聚焦卡片 */}
      <main className="relative z-10 w-full max-w-6xl mx-auto flex-1 flex flex-col justify-center py-4 sm:py-8 lg:py-10">
        {user ? (
          /* =================================================== */
          /* 已登录状态：尊享云端会员与个人管理面板 */
          /* =================================================== */
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: 'easeOut' }}
            className="w-full max-w-xl mx-auto rounded-3xl border border-black/[0.08] dark:border-white/10 cream:border-amber-900/10 bg-white/80 dark:bg-zinc-900/80 cream:bg-[#fcf9f2]/85 p-6 sm:p-9 md:p-10 backdrop-blur-2xl shadow-2xl shadow-black/5 dark:shadow-black/40 relative overflow-hidden space-y-6"
          >
            {/* 头像与身份 */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="relative">
                <div
                  className="flex size-20 sm:size-24 items-center justify-center rounded-full text-2xl sm:text-3xl font-bold text-white shadow-xl transition-transform duration-300 hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${activeColor}, color-mix(in srgb, ${activeColor} 65%, black))`,
                    boxShadow: `0 12px 30px -6px ${activeColor}55`,
                  }}
                >
                  {avatarLetter}
                </div>
                <div
                  className="absolute -bottom-1 -right-1 size-7 rounded-full bg-white dark:bg-zinc-900 p-0.5 shadow-md flex items-center justify-center"
                  title="云端认证已同步"
                >
                  <FiCheckCircle className="size-5 text-emerald-500" />
                </div>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-950 dark:text-white">
                  {userDisplayName}
                </h2>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-black/[0.04] dark:bg-white/[0.06] text-gray-700 dark:text-gray-300">
                    <FiMail className="size-3 text-gray-400" />
                    <span>{user.email}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    已安全连接
                  </span>
                </div>
              </div>
            </div>

            {/* 云端数据详情指标卡片组 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] cream:bg-amber-100/20 p-4 border border-black/[0.05] dark:border-white/[0.06] flex items-center gap-3">
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${activeColor}15`, color: activeColor }}
                >
                  <FiShield className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">账号用户 ID</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-xs text-gray-800 dark:text-gray-200 truncate">
                      {user.id.slice(0, 14)}...
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyId(user.id)}
                      className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer transition-colors"
                      title="复制完整 ID"
                    >
                      {copiedId ? <FiCheck className="size-3 text-emerald-500" /> : <FiCopy className="size-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] cream:bg-amber-100/20 p-4 border border-black/[0.05] dark:border-white/[0.06] flex items-center gap-3">
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${activeColor}15`, color: activeColor }}
                >
                  <FiZap className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">云端同步状态</div>
                  <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span>秒级自动双向同步</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 云端说明 */}
            <div className="rounded-2xl border border-black/[0.05] dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.02] p-4 text-center">
              <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                您的专属计时器、番茄钟及待办清单数据已自动加密同步至云端，换设备登录即可随时无缝接力。
              </div>
            </div>

            {/* 操作跳转与退出登录 */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => transitionTo('main')}
                className="w-full py-3 px-5 rounded-2xl text-sm font-semibold text-white shadow-md transition-all duration-200 hover:opacity-95 hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  backgroundColor: activeColor,
                  boxShadow: `0 8px 25px -4px ${activeColor}55`,
                }}
              >
                <span>返回主页计时器</span>
                <FiArrowRight className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => transitionTo('settings')}
                className="w-full py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-medium border border-black/10 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-gray-700 dark:text-gray-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <FiSettings className="size-3.5" />
                <span>前往个人设置中心</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await signOut();
                }}
                disabled={isLoading}
                className="w-full py-2 px-4 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <FiLogOut className="size-3.5" />
                <span>退出当前账号</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* =================================================== */
          /* 未登录状态：登录 / 注册 / 找回密码 表单卡片 */
          /* =================================================== */
          <motion.div
            layout="position"
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.4,
              ease: 'easeOut',
              layout: { duration: 0.3, ease: [0.25, 1, 0.5, 1] },
            }}
            className="w-full max-w-lg mx-auto rounded-3xl border border-black/[0.08] dark:border-white/10 cream:border-amber-900/10 bg-white/85 dark:bg-zinc-900/85 cream:bg-[#fcf9f2]/90 p-5 sm:p-7 md:p-9 backdrop-blur-2xl shadow-2xl shadow-black/5 dark:shadow-black/30 relative overflow-hidden"
          >

              <div className="space-y-4 sm:space-y-5">
                {/* 标题与欢迎语 */}
                <div className="text-center space-y-1">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-gray-950 dark:text-white transition-opacity duration-200">
                    {mode === 'forgot'
                      ? '重置登录密码'
                      : mode === 'signup'
                      ? '注册 TimePulse 账号'
                      : '登录 TimePulse'}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 cream:text-[#887e72] transition-opacity duration-200">
                    {mode === 'forgot'
                      ? '验证邮箱后即可重新设置您的账号密码'
                      : mode === 'signup'
                      ? '创建专属云端账号，开启极简时光之旅'
                      : '极简专注 · 温暖打气 · 随时掌握时光脉搏'}
                  </p>
                </div>

                {/* 登录 / 注册 仿 Apple VisionOS 胶囊分段滑动切换器 */}
                {mode !== 'forgot' ? (
                  <div className="relative flex rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] cream:bg-black/[0.03] p-1 border border-black/[0.05] dark:border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => handleModeChange('signin')}
                      className={`relative flex-1 py-2 text-xs font-semibold rounded-xl transition-colors duration-200 z-10 flex items-center justify-center gap-1.5 cursor-pointer ${
                        mode === 'signin'
                          ? 'text-gray-950 dark:text-white font-bold'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                      }`}
                    >
                      <FiLogIn className="size-3.5" />
                      <span>登录账号</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeChange('signup')}
                      className={`relative flex-1 py-2 text-xs font-semibold rounded-xl transition-colors duration-200 z-10 flex items-center justify-center gap-1.5 cursor-pointer ${
                        mode === 'signup'
                          ? 'text-gray-950 dark:text-white font-bold'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                      }`}
                    >
                      <FiUserPlus className="size-3.5" />
                      <span>免费注册</span>
                    </button>

                    <motion.div
                      layoutId="auth-tab-pill"
                      initial={false}
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 32,
                      }}
                      className="absolute inset-y-1 rounded-xl bg-white dark:bg-zinc-800 shadow-sm"
                      style={{
                        left: mode === 'signin' ? '4px' : '50%',
                        right: mode === 'signin' ? '50%' : '4px',
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between pb-1">
                    <button
                      type="button"
                      onClick={() => handleModeChange('signin')}
                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <FiChevronLeft className="size-4" />
                      <span>返回账号登录</span>
                    </button>
                    <span className="text-[11px] text-gray-400 font-medium">重置指引向导</span>
                  </div>
                )}

                {/* 第三方 OAuth 快捷登录（Google / GitHub） */}
                {mode !== 'forgot' && <OAuthButtons />}

                {/* 异常反馈提示 Banner */}
                <AnimatePresence>
                  {(error || localValidation) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -6 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5 backdrop-blur-sm shadow-xs"
                    >
                      <FiAlertCircle className="size-4 shrink-0 mt-0.5 text-red-500" />
                      <span className="flex-1 leading-relaxed font-medium">{error || localValidation}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 成功反馈提示 Banner */}
                <AnimatePresence>
                  {successMessage && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -6 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5 backdrop-blur-sm shadow-xs"
                    >
                      <FiCheckCircle className="size-4 shrink-0 mt-0.5 text-emerald-500" />
                      <span className="flex-1 leading-relaxed font-medium">{successMessage}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 表单输入区域 */}
                <motion.form
                  layout
                  transition={{ layout: { duration: 0.3, ease: [0.25, 1, 0.5, 1] } }}
                  onSubmit={handleSubmit}
                  className="space-y-3.5"
                >
                  
                  {/* 注册模式下的昵称（柔和高度展开） */}
                  <AnimatePresence initial={false}>
                    {mode === 'signup' && (
                      <motion.div
                        key="signup-nickname"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
                        className="overflow-hidden space-y-1 text-left"
                      >
                        <label
                          htmlFor={nicknameInputId}
                          className="block text-xs font-semibold text-gray-700 dark:text-gray-300"
                        >
                          个性称呼 / 昵称 <span className="text-gray-400 font-normal">(选填)</span>
                        </label>
                        <div
                          className={`relative flex items-center rounded-2xl border overflow-hidden transition-all duration-200 bg-black/[0.02] dark:bg-white/[0.03] cream:bg-amber-100/15 ${
                            focusedField === 'nickname'
                              ? 'border-transparent'
                              : 'border-black/10 dark:border-white/10 cream:border-amber-900/15 hover:border-black/20 dark:hover:border-white/20'
                          }`}
                          style={{
                            borderColor: focusedField === 'nickname' ? activeColor : undefined,
                          }}
                        >
                          <FiUser
                            className="pointer-events-none absolute left-3.5 size-4 transition-colors duration-200"
                            style={{
                              color: focusedField === 'nickname' ? activeColor : undefined,
                            }}
                          />
                          <input
                            id={nicknameInputId}
                            type="text"
                            value={signUpNickname}
                            onFocus={() => setFocusedField('nickname')}
                            onBlur={() => setFocusedField(null)}
                            onChange={(e) => setSignUpNickname(e.target.value)}
                            placeholder="例如：阳光旅人"
                            disabled={isLoading}
                            className="w-full bg-transparent rounded-[inherit] py-2.5 sm:py-3 pl-10 pr-3 text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 电子邮箱输入域 */}
                  <div className="space-y-1 text-left">
                    <label
                      htmlFor={emailInputId}
                      className="block text-xs font-semibold text-gray-700 dark:text-gray-300"
                    >
                      电子邮箱地址
                    </label>
                    <div
                      className={`relative flex items-center rounded-2xl border overflow-hidden transition-all duration-200 bg-black/[0.02] dark:bg-white/[0.03] cream:bg-amber-100/15 ${
                        focusedField === 'email'
                          ? 'border-transparent'
                          : 'border-black/10 dark:border-white/10 cream:border-amber-900/15 hover:border-black/20 dark:hover:border-white/20'
                      }`}
                      style={{
                        borderColor: focusedField === 'email' ? activeColor : undefined,
                      }}
                    >
                      <FiMail
                        className="pointer-events-none absolute left-3.5 size-4 transition-colors duration-200"
                        style={{
                          color: focusedField === 'email' ? activeColor : undefined,
                        }}
                      />
                      <input
                        id={emailInputId}
                        type="email"
                        value={email}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        autoComplete="email"
                        required
                        disabled={isLoading}
                        className="w-full bg-transparent rounded-[inherit] py-2.5 sm:py-3 pl-10 pr-3 text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* 密码输入域（找回密码模式无需密码） */}
                  {mode !== 'forgot' && (
                    <div className="space-y-1 text-left">
                      <div className="flex items-center justify-between h-4">
                        <label
                          htmlFor={passwordInputId}
                          className="block text-xs font-semibold text-gray-700 dark:text-gray-300"
                        >
                          {mode === 'signup' ? '设置登录密码' : '登录密码'}
                        </label>
                        <AnimatePresence initial={false}>
                          {mode === 'signin' && (
                            <motion.button
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              type="button"
                              onClick={() => handleModeChange('forgot')}
                              className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                            >
                              忘记密码？
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                      <div
                        className={`relative flex items-center rounded-2xl border overflow-hidden transition-all duration-200 bg-black/[0.02] dark:bg-white/[0.03] cream:bg-amber-100/15 ${
                          focusedField === 'password'
                            ? 'border-transparent'
                            : 'border-black/10 dark:border-white/10 cream:border-amber-900/15 hover:border-black/20 dark:hover:border-white/20'
                        }`}
                        style={{
                          borderColor: focusedField === 'password' ? activeColor : undefined,
                        }}
                      >
                        <FiLock
                          className="pointer-events-none absolute left-3.5 size-4 transition-colors duration-200"
                          style={{
                            color: focusedField === 'password' ? activeColor : undefined,
                          }}
                        />
                        <input
                          id={passwordInputId}
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onFocus={() => setFocusedField('password')}
                          onBlur={() => setFocusedField(null)}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={mode === 'signup' ? '至少包含 6 位字符' : '请输入密码'}
                          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                          required
                          disabled={isLoading}
                          className="w-full bg-transparent rounded-[inherit] py-2.5 sm:py-3 pl-10 pr-10 text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                          title={showPassword ? '隐藏密码' : '显示密码'}
                        >
                          {showPassword ? <FiEyeOff className="size-4" /> : <FiEye className="size-4" />}
                        </button>
                      </div>

                      {/* 注册模式下的动态密码强度指引条（柔和淡入淡出） */}
                      <AnimatePresence initial={false}>
                        {mode === 'signup' && password.length > 0 && (
                          <motion.div
                            key="signup-password-strength"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                            className="overflow-hidden pt-1 space-y-1"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-gray-400">密码强度</span>
                              <span style={{ color: pwdStrength.color }} className="font-semibold">
                                {pwdStrength.label}
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5 h-1">
                              {[1, 2, 3, 4].map((step) => (
                                <div
                                  key={step}
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    backgroundColor:
                                      step <= pwdStrength.score
                                        ? pwdStrength.color
                                        : 'rgba(150, 150, 150, 0.2)',
                                  }}
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* 注册模式下的确认密码（柔和高度展开） */}
                  <AnimatePresence initial={false}>
                    {mode === 'signup' && (
                      <motion.div
                        key="signup-confirm-password"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
                        className="overflow-hidden space-y-1 text-left"
                      >
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor={confirmPasswordInputId}
                            className="block text-xs font-semibold text-gray-700 dark:text-gray-300"
                          >
                            确认登录密码
                          </label>
                          {confirmPassword && password === confirmPassword && (
                            <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                              <FiCheck className="size-3.5" /> 密码一致
                            </span>
                          )}
                        </div>
                        <div
                          className={`relative flex items-center rounded-2xl border overflow-hidden transition-all duration-200 bg-black/[0.02] dark:bg-white/[0.03] cream:bg-amber-100/15 ${
                            focusedField === 'confirmPassword'
                              ? 'border-transparent'
                              : 'border-black/10 dark:border-white/10 cream:border-amber-900/15 hover:border-black/20 dark:hover:border-white/20'
                          }`}
                          style={{
                            borderColor: focusedField === 'confirmPassword' ? activeColor : undefined,
                          }}
                        >
                          <FiLock
                            className="pointer-events-none absolute left-3.5 size-4 transition-colors duration-200"
                            style={{
                              color: focusedField === 'confirmPassword' ? activeColor : undefined,
                            }}
                          />
                          <input
                            id={confirmPasswordInputId}
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onFocus={() => setFocusedField('confirmPassword')}
                            onBlur={() => setFocusedField(null)}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="再次输入刚才设置的密码"
                            autoComplete="new-password"
                            required={mode === 'signup'}
                            disabled={isLoading}
                            className="w-full bg-transparent rounded-[inherit] py-2.5 sm:py-3 pl-10 pr-3 text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 提交主操作按钮：初始淡柔杏橙，提交后鲜艳蜜杏橙流光进度条填充，成功后立刻触发 border 双向滚动动画 */}
                  <div className="pt-2">
                    <ProgressSubmitButton
                      status={isLoading && submitStatus === 'idle' ? 'loading' : submitStatus}
                      accentColor="#FB923C"
                      progressColor="#FB923C"
                      idleText={
                        mode === 'forgot'
                          ? '发送重置密码邮件'
                          : mode === 'signup'
                          ? '注册账号'
                          : '立即登录'
                      }
                      loadingText={
                        mode === 'forgot'
                          ? '正在发送重置邮件...'
                          : mode === 'signup'
                          ? '正在创建专属账号...'
                          : '正在安全验证...'
                      }
                      successText={
                        mode === 'forgot'
                          ? '重置邮件已发送'
                          : mode === 'signup'
                          ? '注册成功，欢迎加入'
                          : '登录成功，欢迎回来'
                      }
                      icon={<FiArrowRight className="size-4" />}
                      onSuccessComplete={handleSuccessComplete}
                      successDuration={1300}
                    />
                  </div>
                </motion.form>

                {/* 找回密码模式下的返回登录切换 */}
                {mode === 'forgot' && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => handleModeChange('signin')}
                      className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      记起密码了？返回登录
                    </button>
                  </div>
                )}

                {/* 底部安全与加密承诺 */}
                <div className="text-center pt-3 border-t border-black/[0.05] dark:border-white/[0.06]">
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1.5 font-medium">
                    <FiShield className="size-3.5 text-emerald-500 shrink-0" />
                    <span>数据均通过行业级 TLS 加密传输，由 Supabase 提供安全认证支持</span>
                  </p>
                </div>
              </div>
            </motion.div>
        )}
      </main>

      {/* 4. 独立路由底部版权与极简理念 */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto py-3 px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 dark:text-gray-500 gap-2">
        <div className="flex items-center gap-2">
          <span>TimePulse · 时光脉搏</span>
          <span>·</span>
          <span>用专注丈量光阴</span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[11px]">
          <span>© {new Date().getFullYear()} TimePulse Project. 保留所有权利</span>
        </div>
      </footer>
    </div>
  );
}
