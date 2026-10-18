import { useState, useId, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  FiArrowLeft,
  FiMail,
  FiLock,
  FiUser,
  FiEye,
  FiEyeOff,
  FiCheck,
  FiAlertCircle,
  FiLogOut,
  FiCopy,
  FiShield,
  FiClock,
  FiCheckCircle,
} from 'react-icons/fi';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePageTransition } from '@/hooks/usePageTransition';
import { useTheme } from '@/app/providers/ThemeProvider';
import { usePersonalSettingsStore } from '@/stores/usePersonalSettingsStore';

type AuthMode = 'signin' | 'signup' | 'forgot';

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
  const updateSettings = usePersonalSettingsStore((s) => s.updateSettings);

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signUpNickname, setSignUpNickname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [localValidation, setLocalValidation] = useState<string | null>(null);

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
        // 如果注册后直接获得 session，自动跳转至主页
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

  return (
    <div
      data-page-view="auth"
      className="auth-page relative flex h-full w-full flex-col overflow-y-auto px-4 select-none"
      style={{
        paddingTop: 'var(--settings-pt, max(4.5rem, calc(3.75rem + env(safe-area-inset-top, 0px))))',
        paddingBottom: 'var(--settings-pb, max(6.5rem, calc(5.5rem + env(safe-area-inset-bottom, 0px))))',
        paddingLeft: 'max(1rem, var(--tp-safe-left, env(safe-area-inset-left, 0px)))',
        paddingRight: 'max(1rem, var(--tp-safe-right, env(safe-area-inset-right, 0px)))',
      }}
    >
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center my-auto py-6">
        
        {/* 顶部返回导航 */}
        <div className="w-full flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                window.history.back();
              } else {
                transitionTo('main');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-xs font-medium text-gray-700 dark:text-gray-200 transition-colors"
            title="返回上一页"
          >
            <FiArrowLeft className="size-3.5" />
            <span>返回</span>
          </button>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Supabase BaaS 驱动</span>
          </span>
        </div>

        {/* 核心卡片容器：极简磨砂玻璃风格 */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
          className="w-full rounded-3xl border border-black/[0.08] dark:border-white/10 bg-white/75 dark:bg-[#18181b]/80 cream:bg-amber-50/70 p-6 sm:p-8 backdrop-blur-2xl shadow-xl space-y-6"
        >
          {/* 已登录状态展示 */}
          {user ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-500/30 ring-4 ring-emerald-500/20">
                <FiUser className="size-10 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {user.user_metadata?.nickname || nickname || 'TimePulse 会员'}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {user.email}
                </p>
              </div>

              {/* 账号详细信息 */}
              <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] p-4 text-left text-xs space-y-2.5 border border-black/[0.05] dark:border-white/[0.06]">
                <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                  <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                    <FiShield className="size-3.5" />
                    <span>认证状态</span>
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <FiCheckCircle className="size-3" /> 已安全连接
                  </span>
                </div>

                <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                  <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                    <FiClock className="size-3.5" />
                    <span>上次登录</span>
                  </span>
                  <span>
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleString()
                      : '本次会话'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-gray-600 dark:text-gray-300 pt-1 border-t border-black/[0.05] dark:border-white/[0.05]">
                  <span className="text-gray-400">账号标识 UID</span>
                  <button
                    type="button"
                    onClick={() => handleCopyId(user.id)}
                    className="flex items-center gap-1 font-mono text-[10px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    title="点击复制 UID"
                  >
                    <span>{user.id.slice(0, 8)}...{user.id.slice(-4)}</span>
                    <FiCopy className="size-3" />
                    {copiedId && <span className="text-emerald-500 font-sans">已复制</span>}
                  </button>
                </div>
              </div>

              {/* 快捷跳转与退出登录操作 */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => transitionTo('main')}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white shadow-xs transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ backgroundColor: activeColor }}
                >
                  <span>返回主页计时器</span>
                </button>

                <button
                  type="button"
                  onClick={() => transitionTo('settings')}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-medium border border-black/10 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-gray-700 dark:text-gray-200 transition-colors"
                >
                  前往个人设置中心
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                  }}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <FiLogOut className="size-3.5" />
                  <span>退出当前账号</span>
                </button>
              </div>
            </div>
          ) : (
            /* 未登录状态：登录/注册/找回密码表单 */
            <div className="space-y-6">
              
              {/* 头部标题与简介 */}
              <div className="text-center space-y-1">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-950 dark:text-white">
                  {mode === 'forgot'
                    ? '重置登录密码'
                    : mode === 'signup'
                    ? '注册 TimePulse 账号'
                    : '登录 TimePulse'}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {mode === 'forgot'
                    ? '验证邮箱后即可重新设置您的账号密码'
                    : mode === 'signup'
                    ? '创建专属云端账号，开启极简时光之旅'
                    : '极简专注 · 温暖打气 · 随时掌握时光脉搏'}
                </p>
              </div>

              {/* 登录 / 注册 滑动分段切换按钮 */}
              {mode !== 'forgot' && (
                <div className="relative flex rounded-full bg-black/[0.04] dark:bg-white/[0.06] p-1 border border-black/[0.06] dark:border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => handleModeChange('signin')}
                    className={`relative flex-1 py-1.5 text-xs font-semibold rounded-full transition-colors z-10 ${
                      mode === 'signin'
                        ? 'text-gray-950 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    登录账号
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('signup')}
                    className={`relative flex-1 py-1.5 text-xs font-semibold rounded-full transition-colors z-10 ${
                      mode === 'signup'
                        ? 'text-gray-950 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    免费注册
                  </button>

                  <motion.div
                    layoutId="auth-tab-pill"
                    initial={false}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 35,
                    }}
                    className="absolute inset-y-1 rounded-full bg-white dark:bg-[#27272a] shadow-xs"
                    style={{
                      left: mode === 'signin' ? '4px' : '50%',
                      right: mode === 'signin' ? '50%' : '4px',
                    }}
                  />
                </div>
              )}

              {/* 异常反馈提示 Banner */}
              <AnimatePresence>
                {(error || localValidation) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -6 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -6 }}
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-600 dark:text-red-400 flex items-start gap-2"
                  >
                    <FiAlertCircle className="size-4 shrink-0 mt-0.5 text-red-500" />
                    <span className="flex-1">{error || localValidation}</span>
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
                    className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2"
                  >
                    <FiCheck className="size-4 shrink-0 mt-0.5 text-emerald-500" />
                    <span className="flex-1">{successMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 表单输入域 */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* 注册时可选的称谓/昵称 */}
                {mode === 'signup' && (
                  <div className="space-y-1.5 text-left">
                    <label
                      htmlFor={nicknameInputId}
                      className="block text-xs font-medium text-gray-700 dark:text-gray-300"
                    >
                      个性称呼 / 昵称 <span className="text-gray-400 font-normal">(选填)</span>
                    </label>
                    <div className="relative flex items-center">
                      <FiUser className="pointer-events-none absolute left-3.5 size-4 text-gray-400" />
                      <input
                        id={nicknameInputId}
                        type="text"
                        value={signUpNickname}
                        onChange={(e) => setSignUpNickname(e.target.value)}
                        placeholder="例如：阳光旅人"
                        disabled={isLoading}
                        className="w-full rounded-xl border border-black/10 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.04] py-2.5 pl-10 pr-3.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>
                )}

                {/* 电子邮箱 */}
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor={emailInputId}
                    className="block text-xs font-medium text-gray-700 dark:text-gray-300"
                  >
                    电子邮箱地址
                  </label>
                  <div className="relative flex items-center">
                    <FiMail className="pointer-events-none absolute left-3.5 size-4 text-gray-400" />
                    <input
                      id={emailInputId}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      autoComplete="email"
                      required
                      disabled={isLoading}
                      className="w-full rounded-xl border border-black/10 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.04] py-2.5 pl-10 pr-3.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* 密码输入框（找回密码模式无需密码输入） */}
                {mode !== 'forgot' && (
                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor={passwordInputId}
                        className="block text-xs font-medium text-gray-700 dark:text-gray-300"
                      >
                        {mode === 'signup' ? '设置登录密码' : '登录密码'}
                      </label>
                      {mode === 'signin' && (
                        <button
                          type="button"
                          onClick={() => handleModeChange('forgot')}
                          className="text-[11px] text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                        >
                          忘记密码？
                        </button>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <FiLock className="pointer-events-none absolute left-3.5 size-4 text-gray-400" />
                      <input
                        id={passwordInputId}
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={mode === 'signup' ? '至少包含 6 位字符' : '请输入密码'}
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        required
                        disabled={isLoading}
                        className="w-full rounded-xl border border-black/10 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.04] py-2.5 pl-10 pr-10 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
                        title={showPassword ? '隐藏密码' : '显示密码'}
                      >
                        {showPassword ? <FiEyeOff className="size-4" /> : <FiEye className="size-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* 注册时确认密码 */}
                {mode === 'signup' && (
                  <div className="space-y-1.5 text-left">
                    <label
                      htmlFor={confirmPasswordInputId}
                      className="block text-xs font-medium text-gray-700 dark:text-gray-300"
                    >
                      确认登录密码
                    </label>
                    <div className="relative flex items-center">
                      <FiLock className="pointer-events-none absolute left-3.5 size-4 text-gray-400" />
                      <input
                        id={confirmPasswordInputId}
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="再次输入刚才设置的密码"
                        autoComplete="new-password"
                        required
                        disabled={isLoading}
                        className="w-full rounded-xl border border-black/10 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.04] py-2.5 pl-10 pr-3.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>
                )}

                {/* 主操作提交按钮 */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white shadow-xs transition-all hover:opacity-95 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ backgroundColor: activeColor }}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>正在处理中...</span>
                      </span>
                    ) : (
                      <span>
                        {mode === 'forgot'
                          ? '发送重置密码邮件'
                          : mode === 'signup'
                          ? '注册账号'
                          : '立即登录'}
                      </span>
                    )}
                  </button>
                </div>
              </form>

              {/* 找回密码模式下的返回登录切换 */}
              {mode === 'forgot' && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => handleModeChange('signin')}
                    className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    记起密码了？返回登录
                  </button>
                </div>
              )}

              {/* 隐私与安全说明 */}
              <div className="text-center pt-2 border-t border-black/[0.05] dark:border-white/[0.05]">
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  数据均通过行业级 TLS 加密传输，由 Supabase 提供安全认证支持
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
