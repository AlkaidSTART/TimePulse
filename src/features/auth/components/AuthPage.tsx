import { useState, useId, useEffect, useMemo, type FormEvent, type CSSProperties } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  FiArrowLeft,
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
  FiClock,
  FiCheckCircle,
  FiZap,
  FiSettings,
  FiArrowRight,
  FiChevronLeft,
} from 'react-icons/fi';
import { LuSparkles } from 'react-icons/lu';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePageTransition } from '@/hooks/usePageTransition';
import { useTheme } from '@/app/providers/ThemeProvider';
import { usePersonalSettingsStore } from '@/stores/usePersonalSettingsStore';
import AnimatedLogo from '@/components/layout/AnimatedLogo';

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

// 亮点特色介绍
const SHOWCASE_FEATURES = [
  {
    icon: FiClock,
    title: '精准计时与番茄钟',
    desc: '正倒计时、番茄工作法与极简禅意沉浸空间',
  },
  {
    icon: FiZap,
    title: '云端无缝多端同步',
    desc: '计时任务与个人偏好即时云端接续，换端不掉线',
  },
  {
    icon: LuSparkles,
    title: '禅意声景与个性色彩',
    desc: '丰富环境白噪音、灵动主题配色与温暖打气寄语',
  },
] as const;

export default function AuthPage() {
  const shouldReduceMotion = useReducedMotion();
  const { transitionTo } = usePageTransition();
  const { accentColor } = useTheme();

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
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setLocalValidation('请输入格式有效的电子邮箱地址');
      return;
    }

    if (mode === 'forgot') {
      await resetPassword(trimmedEmail);
      return;
    }

    if (!password) {
      setLocalValidation('请输入密码');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setLocalValidation('密码长度至少需要 6 个字符');
        return;
      }
      if (password !== confirmPassword) {
        setLocalValidation('两次输入的密码不一致，请核对');
        return;
      }

      const res = await signUpWithEmail(trimmedEmail, password, {
        nickname: signUpNickname.trim() || undefined,
      });

      if (res.success && res.session) {
        setTimeout(() => {
          transitionTo('main');
        }, 800);
      }
    } else if (mode === 'signin') {
      const res = await signInWithEmail(trimmedEmail, password);
      if (res.success) {
        setTimeout(() => {
          transitionTo('main');
        }, 600);
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
  const userDisplayName = user?.user_metadata?.nickname || nickname || 'TimePulse 会员';
  const avatarLetter = (userDisplayName.trim().charAt(0) || user?.email?.charAt(0) || 'T').toUpperCase();

  return (
    <div
      data-page-view="auth"
      className="auth-page relative flex h-full min-h-0 w-full flex-col overflow-y-auto overscroll-contain px-3 sm:px-6 lg:px-8 select-none"
      style={{
        paddingTop: 'var(--auth-pt, max(1.25rem, calc(0.75rem + env(safe-area-inset-top, 0px))))',
        paddingBottom: 'var(--auth-pb, max(6.5rem, calc(5.5rem + env(safe-area-inset-bottom, 0px))))',
        paddingLeft: 'max(0.75rem, var(--tp-safe-left, env(safe-area-inset-left, 0px)))',
        paddingRight: 'max(0.75rem, var(--tp-safe-right, env(safe-area-inset-right, 0px)))',
      }}
    >
      {/* 优雅的环境氛围流光背景 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[600px] h-[550px] rounded-full blur-[130px] opacity-25 dark:opacity-20 cream:opacity-20 transition-all duration-700"
          style={{ backgroundColor: activeColor }}
        />
        <div
          className="absolute -bottom-[10%] -left-[10%] w-[450px] h-[450px] rounded-full blur-[120px] opacity-15 dark:opacity-10 cream:opacity-15 transition-all duration-700"
          style={{ backgroundColor: activeColor }}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-start my-0 lg:my-auto lg:justify-center py-2 sm:py-4 lg:py-6">
        
        {/* 顶部全局导航栏 */}
        <div className="w-full flex items-center justify-between mb-3 sm:mb-5">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                window.history.back();
              } else {
                transitionTo('main');
              }
            }}
            className="group inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-white/70 dark:bg-white/10 cream:bg-white/80 hover:bg-white/95 dark:hover:bg-white/20 border border-black/[0.06] dark:border-white/10 backdrop-blur-md shadow-xs text-xs font-medium text-gray-700 dark:text-gray-200 transition-all duration-200 hover:-translate-x-0.5 active:scale-95 cursor-pointer"
            title="返回上一页"
          >
            <FiArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>返回</span>
          </button>

          {/* 状态徽章：TLS 安全加密认证 */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/60 dark:bg-white/[0.06] cream:bg-white/70 backdrop-blur-md border border-black/[0.06] dark:border-white/10 text-[10px] sm:text-[11px] font-medium text-gray-600 dark:text-gray-300 shadow-2xs">
            <span className="relative flex size-2 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="font-semibold text-gray-800 dark:text-gray-200 hidden xs:inline">Supabase BaaS 驱动</span>
            <span className="text-gray-300 dark:text-gray-600 hidden xs:inline">|</span>
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 font-mono text-[10px]">
              <FiShield className="size-3 text-emerald-500" />
              <span>TLS 加密认证</span>
            </span>
          </div>
        </div>

        {/* 已登录状态：优雅会员与个人云端控制中心 */}
        {user ? (
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: 'easeOut' }}
            className="w-full max-w-xl mx-auto rounded-2xl sm:rounded-3xl border border-black/[0.08] dark:border-white/10 cream:border-amber-900/10 bg-white/80 dark:bg-zinc-900/80 cream:bg-[#fcf9f2]/85 p-4 sm:p-7 md:p-9 backdrop-blur-2xl shadow-xl shadow-black/5 dark:shadow-black/30 relative overflow-hidden space-y-4 sm:space-y-6"
          >
            {/* 头像与身份 */}
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3">
              <div className="relative">
                <div
                  className="flex size-16 sm:size-20 md:size-24 items-center justify-center rounded-full text-xl sm:text-2xl font-bold text-white shadow-lg transition-transform duration-300 hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${activeColor}, color-mix(in srgb, ${activeColor} 60%, black))`,
                    boxShadow: `0 10px 25px -5px ${activeColor}55`,
                  }}
                >
                  {avatarLetter}
                </div>
                <div
                  className="absolute -bottom-0.5 -right-0.5 size-6 sm:size-7 rounded-full bg-white dark:bg-zinc-900 p-0.5 shadow-sm flex items-center justify-center"
                  title="云端认证已同步"
                >
                  <FiCheckCircle className="size-4 sm:size-5 text-emerald-500" />
                </div>
              </div>

              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-gray-950 dark:text-white">
                  {userDisplayName}
                </h2>
                <div className="flex items-center justify-center gap-2 mt-0.5 sm:mt-1">
                  <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-black/[0.04] dark:bg-white/[0.06] text-gray-600 dark:text-gray-300">
                    <FiMail className="size-3 text-gray-400" />
                    <span>{user.email}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 云端数据详情指标卡片组 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div className="rounded-xl sm:rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] cream:bg-amber-100/20 p-3 sm:p-4 border border-black/[0.05] dark:border-white/[0.06] flex items-center gap-2.5 sm:gap-3">
                <div
                  className="flex size-8.5 sm:size-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl"
                  style={{ backgroundColor: `${activeColor}15`, color: activeColor }}
                >
                  <FiShield className="size-4 sm:size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500">认证状态</div>
                  <div className="text-[11px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>已安全连接</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl sm:rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] cream:bg-amber-100/20 p-3 sm:p-4 border border-black/[0.05] dark:border-white/[0.06] flex items-center gap-2.5 sm:gap-3">
                <div
                  className="flex size-8.5 sm:size-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl"
                  style={{ backgroundColor: `${activeColor}15`, color: activeColor }}
                >
                  <FiClock className="size-4 sm:size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500">最近活跃</div>
                  <div className="text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleString()
                      : '本次会话'}
                  </div>
                </div>
              </div>
            </div>

            {/* UID 一键复制与安全凭证条 */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] text-xs">
              <span className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500">账号标识 UID</span>
              <button
                type="button"
                onClick={() => handleCopyId(user.id)}
                className="group flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] text-gray-600 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white transition-colors cursor-pointer"
                title="点击复制 UID"
              >
                <span>{user.id.slice(0, 8)}...{user.id.slice(-4)}</span>
                <FiCopy className="size-3 text-gray-400 group-hover:text-current transition-colors" />
                {copiedId && (
                  <span className="text-emerald-500 font-sans text-[10px] sm:text-[11px] font-medium ml-1">已复制</span>
                )}
              </button>
            </div>

            {/* 云端同步专属提醒卡 */}
            <div className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
              <FiCheckCircle className="size-3.5 sm:size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                您的专属计时器、番茄钟及待办清单数据已自动加密同步至云端，换设备登录即可随时无缝接力。
              </div>
            </div>

            {/* 操作跳转与退出登录 */}
            <div className="space-y-2.5 sm:space-y-3 pt-1 sm:pt-2">
              <button
                type="button"
                onClick={() => transitionTo('main')}
                className="w-full py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold text-white shadow-md transition-all duration-200 hover:opacity-95 hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  backgroundColor: activeColor,
                  boxShadow: `0 6px 20px -4px ${activeColor}55`,
                }}
              >
                <span>返回主页计时器</span>
                <FiArrowRight className="size-3.5 sm:size-4" />
              </button>

              <button
                type="button"
                onClick={() => transitionTo('settings')}
                className="w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium border border-black/10 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-gray-700 dark:text-gray-200 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer"
              >
                <FiSettings className="size-3 sm:size-3.5" />
                <span>前往个人设置中心</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await signOut();
                }}
                disabled={isLoading}
                className="w-full py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                <FiLogOut className="size-3 sm:size-3.5" />
                <span>退出当前账号</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* 未登录状态：双栏优雅设计 (桌面双栏，移动单栏自适应) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:items-center">
            
            {/* 桌面端左侧品牌与禅意氛围展示面板 */}
            <motion.div
              initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.4, ease: 'easeOut' }}
              className="hidden lg:flex lg:col-span-5 flex-col justify-between p-8 rounded-3xl bg-gradient-to-br from-white/60 to-white/20 dark:from-white/[0.06] dark:to-transparent cream:from-amber-100/50 cream:to-transparent border border-black/[0.06] dark:border-white/10 backdrop-blur-xl relative overflow-hidden shadow-sm min-h-[520px]"
            >
              {/* 装饰光斑 */}
              <div
                className="absolute -top-16 -right-16 size-48 rounded-full blur-3xl opacity-20 pointer-events-none"
                style={{ backgroundColor: activeColor }}
              />

              {/* 顶部品牌 */}
              <div className="space-y-3">
                <AnimatedLogo accentColor={activeColor} size="lg" />
                <p className="text-xs text-gray-500 dark:text-gray-400 tracking-wide font-medium">
                  极简专注 · 温暖打气 · 随时掌握时光脉搏
                </p>
              </div>

              {/* 中间核心价值亮点 */}
              <div className="space-y-4 my-8">
                {SHOWCASE_FEATURES.map((feature, idx) => {
                  const Icon = feature.icon;
                  return (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * (idx + 1), duration: 0.3 }}
                      className="flex items-start gap-3.5 p-3 rounded-2xl bg-white/40 dark:bg-white/[0.03] cream:bg-white/60 border border-black/[0.04] dark:border-white/[0.06] backdrop-blur-sm"
                    >
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: `${activeColor}15`,
                          color: activeColor,
                        }}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                          {feature.title}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                          {feature.desc}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* 底部禅意寄语 */}
              <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
                <p className="text-[11px] text-gray-400 dark:text-gray-500 italic">
                  「让每一个专注的瞬间，都如星光般闪烁。」
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-gray-400 font-mono">
                    TimePulse Cloud Services · 24/7 在线
                  </span>
                </div>
              </div>
            </motion.div>

            {/* 右侧交互表单卡片 */}
            <motion.div
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: 'easeOut' }}
              className="col-span-12 lg:col-span-7 w-full max-w-lg mx-auto rounded-2xl sm:rounded-3xl border border-black/[0.08] dark:border-white/10 cream:border-amber-900/10 bg-white/85 dark:bg-zinc-900/85 cream:bg-[#fcf9f2]/90 p-4 sm:p-6 md:p-8 backdrop-blur-2xl shadow-xl shadow-black/5 dark:shadow-black/30 relative overflow-hidden"
            >
              {/* 移动端简洁 Logo 头部 */}
              <div className="lg:hidden flex justify-center mb-2 sm:mb-3">
                <AnimatedLogo accentColor={activeColor} size="sm" />
              </div>

              <div className="space-y-3 sm:space-y-4 md:space-y-5">
                
                {/* 标题与欢迎语 */}
                <div className="text-center space-y-0.5 sm:space-y-1">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-gray-950 dark:text-white">
                    {mode === 'forgot'
                      ? '重置登录密码'
                      : mode === 'signup'
                      ? '注册 TimePulse 账号'
                      : '登录 TimePulse'}
                  </h1>
                  <p className="text-[11px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400">
                    {mode === 'forgot'
                      ? '验证邮箱后即可重新设置您的账号密码'
                      : mode === 'signup'
                      ? '创建专属云端账号，开启极简时光之旅'
                      : '极简专注 · 温暖打气 · 随时掌握时光脉搏'}
                  </p>
                </div>

                {/* 登录 / 注册 滑动分段切换按钮 */}
                {mode !== 'forgot' ? (
                  <div className="relative flex rounded-xl sm:rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] cream:bg-black/[0.03] p-0.5 sm:p-1 border border-black/[0.05] dark:border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => handleModeChange('signin')}
                      className={`relative flex-1 py-1.5 sm:py-2 text-xs font-semibold rounded-lg sm:rounded-xl transition-colors duration-200 z-10 flex items-center justify-center gap-1.5 cursor-pointer ${
                        mode === 'signin'
                          ? 'text-gray-950 dark:text-white font-bold'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                      }`}
                    >
                      <FiLogIn className="size-3 sm:size-3.5" />
                      <span>登录账号</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeChange('signup')}
                      className={`relative flex-1 py-1.5 sm:py-2 text-xs font-semibold rounded-lg sm:rounded-xl transition-colors duration-200 z-10 flex items-center justify-center gap-1.5 cursor-pointer ${
                        mode === 'signup'
                          ? 'text-gray-950 dark:text-white font-bold'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                      }`}
                    >
                      <FiUserPlus className="size-3 sm:size-3.5" />
                      <span>免费注册</span>
                    </button>

                    <motion.div
                      layoutId="auth-tab-pill"
                      initial={false}
                      transition={{
                        type: 'spring',
                        stiffness: 450,
                        damping: 35,
                      }}
                      className="absolute inset-y-0.5 sm:inset-y-1 rounded-lg sm:rounded-xl bg-white dark:bg-zinc-800 shadow-sm"
                      style={{
                        left: mode === 'signin' ? '2px' : '50%',
                        right: mode === 'signin' ? '50%' : '2px',
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between pb-0.5">
                    <button
                      type="button"
                      onClick={() => handleModeChange('signin')}
                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <FiChevronLeft className="size-3.5" />
                      <span>返回账号登录</span>
                    </button>
                    <span className="text-[11px] text-gray-400">重置向导</span>
                  </div>
                )}

                {/* 异常反馈提示 Banner */}
                <AnimatePresence>
                  {(error || localValidation) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -6 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-xl sm:rounded-2xl border border-red-500/25 bg-red-500/10 px-3 py-2 sm:px-4 sm:py-2.5 text-xs text-red-600 dark:text-red-400 flex items-start gap-2 backdrop-blur-sm shadow-xs"
                    >
                      <FiAlertCircle className="size-4 shrink-0 mt-0.5 text-red-500" />
                      <span className="flex-1 leading-relaxed">{error || localValidation}</span>
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
                      className="rounded-xl sm:rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 sm:px-4 sm:py-2.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2 backdrop-blur-sm shadow-xs"
                    >
                      <FiCheckCircle className="size-4 shrink-0 mt-0.5 text-emerald-500" />
                      <span className="flex-1 leading-relaxed">{successMessage}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 表单输入域 */}
                <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3.5">
                  
                  {/* 注册时可选的称谓/昵称 */}
                  {mode === 'signup' && (
                    <div className="space-y-1 text-left">
                      <label
                        htmlFor={nicknameInputId}
                        className="block text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300"
                      >
                        个性称呼 / 昵称 <span className="text-gray-400 font-normal">(选填)</span>
                      </label>
                      <div
                        className={`relative flex items-center rounded-xl sm:rounded-2xl border transition-all duration-200 ${
                          focusedField === 'nickname'
                            ? 'bg-transparent ring-2'
                            : 'bg-black/[0.02] dark:bg-white/[0.03] cream:bg-amber-100/20 border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                        }`}
                        style={{
                          borderColor: focusedField === 'nickname' ? activeColor : undefined,
                          boxShadow: focusedField === 'nickname' ? `0 0 0 3px ${activeColor}22` : undefined,
                        }}
                      >
                        <FiUser
                          className="pointer-events-none absolute left-3 sm:left-3.5 size-3.5 sm:size-4 transition-colors duration-200"
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
                          className="w-full bg-transparent py-2 sm:py-2.5 md:py-3 pl-8.5 sm:pl-10 pr-3 text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
                        />
                      </div>
                    </div>
                  )}

                  {/* 电子邮箱 */}
                  <div className="space-y-1 text-left">
                    <label
                      htmlFor={emailInputId}
                      className="block text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300"
                    >
                      电子邮箱地址
                    </label>
                    <div
                      className={`relative flex items-center rounded-xl sm:rounded-2xl border transition-all duration-200 ${
                        focusedField === 'email'
                          ? 'bg-transparent ring-2'
                          : 'bg-black/[0.02] dark:bg-white/[0.03] cream:bg-amber-100/20 border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                      }`}
                      style={{
                        borderColor: focusedField === 'email' ? activeColor : undefined,
                        boxShadow: focusedField === 'email' ? `0 0 0 3px ${activeColor}22` : undefined,
                      }}
                    >
                      <FiMail
                        className="pointer-events-none absolute left-3 sm:left-3.5 size-3.5 sm:size-4 transition-colors duration-200"
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
                        className="w-full bg-transparent py-2 sm:py-2.5 md:py-3 pl-8.5 sm:pl-10 pr-3 text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* 密码输入框（找回密码模式无需密码输入） */}
                  {mode !== 'forgot' && (
                    <div className="space-y-1 text-left">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor={passwordInputId}
                          className="block text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300"
                        >
                          {mode === 'signup' ? '设置登录密码' : '登录密码'}
                        </label>
                        {mode === 'signin' && (
                          <button
                            type="button"
                            onClick={() => handleModeChange('forgot')}
                            className="text-[10px] sm:text-[11px] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                          >
                            忘记密码？
                          </button>
                        )}
                      </div>
                      <div
                        className={`relative flex items-center rounded-xl sm:rounded-2xl border transition-all duration-200 ${
                          focusedField === 'password'
                            ? 'bg-transparent ring-2'
                            : 'bg-black/[0.02] dark:bg-white/[0.03] cream:bg-amber-100/20 border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                        }`}
                        style={{
                          borderColor: focusedField === 'password' ? activeColor : undefined,
                          boxShadow: focusedField === 'password' ? `0 0 0 3px ${activeColor}22` : undefined,
                        }}
                      >
                        <FiLock
                          className="pointer-events-none absolute left-3 sm:left-3.5 size-3.5 sm:size-4 transition-colors duration-200"
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
                          className="w-full bg-transparent py-2 sm:py-2.5 md:py-3 pl-8.5 sm:pl-10 pr-9 text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 sm:right-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                          title={showPassword ? '隐藏密码' : '显示密码'}
                        >
                          {showPassword ? <FiEyeOff className="size-3.5 sm:size-4" /> : <FiEye className="size-3.5 sm:size-4" />}
                        </button>
                      </div>

                      {/* 注册时的密码强度指引条 */}
                      {mode === 'signup' && password.length > 0 && (
                        <div className="pt-0.5 sm:pt-1 space-y-0.5 sm:space-y-1">
                          <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                            <span className="text-gray-400">密码强度</span>
                            <span style={{ color: pwdStrength.color }} className="font-semibold">
                              {pwdStrength.label}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-1 h-0.5 sm:h-1">
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
                        </div>
                      )}
                    </div>
                  )}

                  {/* 注册时确认密码 */}
                  {mode === 'signup' && (
                    <div className="space-y-1 text-left">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor={confirmPasswordInputId}
                          className="block text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300"
                        >
                          确认登录密码
                        </label>
                        {confirmPassword && password === confirmPassword && (
                          <span className="text-[10px] sm:text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                            <FiCheck className="size-3" /> 密码一致
                          </span>
                        )}
                      </div>
                      <div
                        className={`relative flex items-center rounded-xl sm:rounded-2xl border transition-all duration-200 ${
                          focusedField === 'confirmPassword'
                            ? 'bg-transparent ring-2'
                            : 'bg-black/[0.02] dark:bg-white/[0.03] cream:bg-amber-100/20 border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                        }`}
                        style={{
                          borderColor: focusedField === 'confirmPassword' ? activeColor : undefined,
                          boxShadow: focusedField === 'confirmPassword' ? `0 0 0 3px ${activeColor}22` : undefined,
                        }}
                      >
                        <FiLock
                          className="pointer-events-none absolute left-3 sm:left-3.5 size-3.5 sm:size-4 transition-colors duration-200"
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
                          required
                          disabled={isLoading}
                          className="w-full bg-transparent py-2 sm:py-2.5 md:py-3 pl-8.5 sm:pl-10 pr-3 text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
                        />
                      </div>
                    </div>
                  )}

                  {/* 主操作提交按钮 */}
                  <div className="pt-1 sm:pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 sm:py-3 md:py-3.5 px-4 sm:px-5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold text-white shadow-md transition-all duration-200 hover:opacity-95 hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: activeColor,
                        boxShadow: `0 8px 20px -4px ${activeColor}55`,
                      }}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="size-3.5 sm:size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          <span>正在处理中...</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 sm:gap-2">
                          <span>
                            {mode === 'forgot'
                              ? '发送重置密码邮件'
                              : mode === 'signup'
                              ? '注册账号'
                              : '立即登录'}
                          </span>
                          <FiArrowRight className="size-3.5 sm:size-4" />
                        </span>
                      )}
                    </button>
                  </div>
                </form>

                {/* 找回密码模式下的返回登录切换 */}
                {mode === 'forgot' && (
                  <div className="text-center pt-1 sm:pt-2">
                    <button
                      type="button"
                      onClick={() => handleModeChange('signin')}
                      className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      记起密码了？返回登录
                    </button>
                  </div>
                )}

                {/* 隐私与安全说明 */}
                <div className="text-center pt-2 sm:pt-3 border-t border-black/[0.05] dark:border-white/[0.06]">
                  <p className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">
                    <FiShield className="size-3 text-emerald-500 shrink-0" />
                    <span>数据均通过行业级 TLS 加密传输，由 Supabase 提供安全认证支持</span>
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
