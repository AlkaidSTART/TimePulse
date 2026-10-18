import { useState, useId, useEffect, useMemo, useRef, type FormEvent, type CSSProperties } from 'react';
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
  FiUploadCloud,
  FiTrash2,
} from 'react-icons/fi';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePageTransition } from '@/hooks/usePageTransition';
import { useTheme } from '@/app/providers/ThemeProvider';
import { usePersonalSettingsStore } from '@/stores/usePersonalSettingsStore';
import AnimatedLogo from '@/components/layout/AnimatedLogo';
import OAuthButtons from './OAuthButtons';
import { ProgressSubmitButton, type SubmitButtonStatus } from '@/components/ui/ProgressSubmitButton';
import { FieldValidationTooltip } from '@/components/composed/FieldValidationTooltip';
import { UserAvatar } from '@/components/composed/UserAvatar';
import { useTranslation } from '@/i18n/useTranslation';

type AuthMode = 'signin' | 'signup' | 'forgot';

// 密码强度评估辅助函数
function getPasswordStrength(pwd: string, t?: (key: string, def?: string) => string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (pwd.length >= 8 && /[0-9]/.test(pwd)) score += 1;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
  if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;

  const translate = t || ((_k, d) => d || '');
  if (score <= 1) return { score: 1, label: translate('auth.strengthWeak', '较弱'), color: '#f87171' };
  if (score === 2) return { score: 2, label: translate('auth.strengthMedium', '中等'), color: '#fbbf24' };
  if (score === 3) return { score: 3, label: translate('auth.strengthGood', '良好'), color: '#34d399' };
  return { score: 4, label: translate('auth.strengthStrong', '安全'), color: '#10b981' };
}

export default function AuthPage() {
  const shouldReduceMotion = useReducedMotion();
  const { transitionTo } = usePageTransition();
  const { theme, toggleTheme, accentColor } = useTheme();
  const { t } = useTranslation();

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
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const uploadAvatar = useAuthStore((s) => s.uploadAvatar);
  const removeAvatar = useAuthStore((s) => s.removeAvatar);

  const nickname = usePersonalSettingsStore((s) => s.nickname);
  const customMotto = usePersonalSettingsStore((s) => s.customMotto);
  const avatar = usePersonalSettingsStore((s) => s.avatar);

  // 是否已在本地或当前环境注册过账号（未注册时默认强制注册，禁止切换到登录）
  const [hasRegistered, setHasRegistered] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (useAuthStore.getState().user) return true;
    try {
      return localStorage.getItem('timepulse_has_registered') === 'true';
    } catch {
      return false;
    }
  });

  const [unregisteredNotice, setUnregisteredNotice] = useState<string | null>(null);

  const [mode, setMode] = useState<AuthMode>(() => {
    if (typeof window === 'undefined') return 'signup';
    const rawHash = window.location.hash.toLowerCase().replace(/^#\/?/, '');
    let registered = false;
    try {
      registered = localStorage.getItem('timepulse_has_registered') === 'true' || Boolean(useAuthStore.getState().user);
    } catch {
      registered = false;
    }

    if (rawHash === 'forgot') return 'forgot';
    if (rawHash === 'signup' || rawHash === 'register') return 'signup';
    if (rawHash === 'login' || rawHash === 'signin') {
      return registered ? 'signin' : 'signup';
    }
    return registered ? 'signin' : 'signup';
  });

  const [email, setEmail] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem('timepulse_registered_email') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signUpNickname, setSignUpNickname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [localValidation, setLocalValidation] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<SubmitButtonStatus>('idle');

  // 头像上传与操作状态
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarFeedback, setAvatarFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // 个人资料编辑状态（在管理账号面板中维护）
  const [profileNickname, setProfileNickname] = useState(
    user?.user_metadata?.nickname || (nickname === '阳光旅人' ? '' : nickname) || ''
  );
  const [profileMotto, setProfileMotto] = useState(
    user?.user_metadata?.custom_motto || customMotto || '心怀热爱，奔赴每一个灿烂的日子'
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      const nick = user.user_metadata?.nickname || (nickname === '阳光旅人' ? '' : nickname) || '';
      setProfileNickname(nick);
      const motto = user.user_metadata?.custom_motto || customMotto || '心怀热爱，奔赴每一个灿烂的日子';
      setProfileMotto(motto);
    }
  }, [user, nickname, customMotto]);

  // 输入框 DOM 引用，用于校验未通过时自动平滑聚焦
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);

  // 字段级别优雅校验状态与轻触微震颤反馈
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [shakingField, setShakingField] = useState<'email' | 'password' | 'confirmPassword' | null>(null);

  const triggerShake = (field: 'email' | 'password' | 'confirmPassword') => {
    setShakingField(null);
    requestAnimationFrame(() => {
      setShakingField(field);
      setTimeout(() => {
        setShakingField((curr) => (curr === field ? null : curr));
      }, 450);
    });
  };

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
  const profileNicknameInputId = useId();
  const profileMottoInputId = useId();

  // 保存个人资料修改
  const handleSavePersonalProfile = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingProfile(true);
    setProfileSaveSuccess(false);

    const trimmedNickname = profileNickname.trim();
    const trimmedMotto = profileMotto.trim();

    const res = await updateProfile({
      nickname: trimmedNickname,
      customMotto: trimmedMotto,
    });

    setIsSavingProfile(false);
    if (res.success) {
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 2500);
    }
  };

  // 处理自定义头像上传至 Supabase touxiang 存储桶（受 5MB 总空间约束）
  const handleAvatarUpload = async (file: File) => {
    setIsUploadingAvatar(true);
    setAvatarFeedback(null);
    if (!user) {
      setIsUploadingAvatar(false);
      setAvatarFeedback({ type: 'error', message: '云端存储空间仅 5MB，请先登录账号后再上传专属头像' });
      setTimeout(() => setAvatarFeedback(null), 4500);
      return;
    }
    const res = await uploadAvatar(file);
    setIsUploadingAvatar(false);
    if (res.success) {
      setAvatarFeedback({ type: 'success', message: '头像已自动优化至轻量 WebP 并同步至云端！' });
      setTimeout(() => setAvatarFeedback(null), 3500);
    } else {
      setAvatarFeedback({ type: 'error', message: res.error || '头像上传失败，请稍后重试' });
      setTimeout(() => setAvatarFeedback(null), 4500);
    }
  };

  // 处理重置或移除自定义头像
  const handleRemoveAvatar = async () => {
    if (!window.confirm('确定要移除当前自定义头像并恢复默认头像吗？')) return;
    setIsUploadingAvatar(true);
    setAvatarFeedback(null);
    const res = await removeAvatar();
    setIsUploadingAvatar(false);
    if (res.success) {
      setAvatarFeedback({ type: 'success', message: '已恢复默认头像' });
      setTimeout(() => setAvatarFeedback(null), 3000);
    } else {
      setAvatarFeedback({ type: 'error', message: res.error || '重置头像失败' });
      setTimeout(() => setAvatarFeedback(null), 4000);
    }
  };

  // 监听 URL hash 默认定位到登录或注册
  useEffect(() => {
    const rawHash = window.location.hash.toLowerCase().replace(/^#\/?/, '');
    let registered = false;
    try {
      registered = localStorage.getItem('timepulse_has_registered') === 'true' || Boolean(useAuthStore.getState().user);
    } catch {
      registered = false;
    }

    if (rawHash === 'register' || rawHash === 'signup') {
      setMode('signup');
    } else if (rawHash === 'forgot') {
      setMode('forgot');
    } else if (rawHash === 'login' || rawHash === 'signin') {
      if (registered) {
        setMode('signin');
      } else {
        setMode('signup');
        if (typeof window !== 'undefined' && window.location.hash !== '#register') {
          window.location.hash = '#register';
        }
      }
    } else {
      setMode(registered ? 'signin' : 'signup');
    }
  }, []);

  // 监听已登录用户状态，自动标记已注册
  useEffect(() => {
    if (user) {
      setHasRegistered(true);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('timepulse_has_registered', 'true');
          if (user.email) {
            localStorage.setItem('timepulse_registered_email', user.email);
          }
        } catch {}
      }
    }
  }, [user]);

  // 模式切换时清理错误和消息（注册成功切换到登录时可选择保留成功提示）
  const handleModeChange = (newMode: AuthMode, preserveSuccess = false) => {
    clearError();
    if (!preserveSuccess) {
      clearSuccessMessage();
    }
    setLocalValidation(null);
    setFieldErrors({});
    setShakingField(null);
    setSubmitStatus('idle');
    setMode(newMode);
  };

  // 提交处理（纯净自定义优雅校验，彻底取代浏览器生硬默认弹窗）
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    clearSuccessMessage();
    setLocalValidation(null);

    const newErrors: {
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = '请填写电子邮箱地址';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        newErrors.email = '电子邮箱格式不正确，例如 name@example.com';
      }
    }

    if (mode === 'forgot') {
      if (newErrors.email) {
        setFieldErrors(newErrors);
        triggerShake('email');
        emailInputRef.current?.focus();
        setSubmitStatus('idle');
        return;
      }
      setFieldErrors({});
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
      newErrors.password = mode === 'signup' ? '请设置登录密码' : '请输入登录密码';
    } else if (mode === 'signup' && password.length < 6) {
      newErrors.password = '密码长度至少需要 6 个字符';
    }

    if (mode === 'signup') {
      if (!confirmPassword) {
        newErrors.confirmPassword = '请再次输入密码以确认';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = '两次输入的密码不一致，请核对';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      if (newErrors.email) {
        triggerShake('email');
        emailInputRef.current?.focus();
      } else if (newErrors.password) {
        triggerShake('password');
        passwordInputRef.current?.focus();
      } else if (newErrors.confirmPassword) {
        triggerShake('confirmPassword');
        confirmPasswordInputRef.current?.focus();
      }
      setSubmitStatus('idle');
      return;
    }

    setFieldErrors({});

    if (mode === 'signup') {
      setSubmitStatus('loading');
      const res = await signUpWithEmail(trimmedEmail, password, {
        nickname: signUpNickname.trim() || undefined,
      });

      if (res.success) {
        setSubmitStatus('success');
        setHasRegistered(true);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('timepulse_has_registered', 'true');
            localStorage.setItem('timepulse_registered_email', trimmedEmail);
          } catch {}
        }
      } else {
        setSubmitStatus('error');
        if (
          res.error?.includes('已被注册') ||
          res.error?.includes('already registered') ||
          res.error?.includes('already exists')
        ) {
          setHasRegistered(true);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('timepulse_has_registered', 'true');
              localStorage.setItem('timepulse_registered_email', trimmedEmail);
            } catch {}
          }
        }
      }
    } else if (mode === 'signin') {
      setSubmitStatus('loading');
      const res = await signInWithEmail(trimmedEmail, password);
      if (res.success) {
        setSubmitStatus('success');
        setHasRegistered(true);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('timepulse_has_registered', 'true');
            localStorage.setItem('timepulse_registered_email', trimmedEmail);
          } catch {}
        }
      } else {
        setSubmitStatus('error');
      }
    }
  };

  // 成功状态（包括 border 双向滚动动画播放完成）后触发平滑页面跳转或切换至登录
  const handleSuccessComplete = () => {
    if (mode === 'signin') {
      transitionTo('main');
    } else if (mode === 'signup') {
      if (useAuthStore.getState().session) {
        transitionTo('main');
      } else {
        // 注册账号完成后，允许并自动切换至登录模式，保留邮箱预填
        handleModeChange('signin', true);
        setPassword('');
        setConfirmPassword('');
        setSubmitStatus('idle');
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

  // 头像与展示昵称提取
  const userDisplayName = profileNickname.trim() || user?.user_metadata?.nickname || (nickname === '阳光旅人' ? '' : nickname) || '时光守护者';
  const avatarLetter = (userDisplayName.trim().charAt(0) || user?.email?.charAt(0) || 'T').toUpperCase();
  const userAvatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || (avatar && (avatar.startsWith('http') || avatar.startsWith('data:')) ? avatar : null);

  return (
    <div
      data-page-view="auth"
      className="auth-page relative h-full min-h-0 w-full flex flex-col justify-between overflow-x-hidden overflow-y-auto select-none bg-background-light dark:bg-background-dark cream:bg-background-cream text-gray-900 dark:text-gray-100 transition-colors duration-500"
    >
      {/* 1. 简约温和的背景氛围 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[360px] rounded-full blur-[120px] opacity-[0.08] dark:opacity-[0.06] cream:opacity-[0.10] pointer-events-none"
          style={{ backgroundColor: activeColor }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(#888_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] dark:opacity-[0.02]" />
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

      {/* 3. 核心内容区域：紧凑自适应弹性居中与平滑滚动 */}
      <main className="relative z-10 w-full max-w-6xl mx-auto flex-1 flex flex-col py-2 sm:py-4">
        {user ? (
          /* =================================================== */
          /* 已登录状态：账号管理与个人信息设置 (极简主义设计) */
          /* =================================================== */
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: 'easeOut' }}
            className="my-auto w-full max-w-xl mx-auto rounded-3xl border border-black/[0.08] dark:border-white/10 cream:border-[#dfd3c0] bg-white/90 dark:bg-zinc-900/90 cream:bg-[#faf5ea]/95 p-4 sm:p-6 md:p-7 backdrop-blur-xl shadow-sm space-y-4 sm:space-y-4.5"
          >
            {/* 1. 顶部用户卡片：纯净头像与账号基本信息 */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 pb-4 border-b border-black/[0.06] dark:border-white/10 cream:border-[#dfd3c0]/70">
              <div className="flex items-center gap-3.5">
                <UserAvatar
                  avatarUrl={userAvatarUrl}
                  name={userDisplayName}
                  size="lg"
                  editable
                  isUploading={isUploadingAvatar}
                  onUpload={handleAvatarUpload}
                  accentColor={activeColor}
                  showOnlineIndicator
                />

                {/* 隐藏的专用文件选择 input，供按钮触发 */}
                <input
                  ref={avatarFileInputRef}
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

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-gray-950 dark:text-white cream:text-[#26211e] truncate">
                    {userDisplayName}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    已安全连接
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 cream:text-[#786e63] mt-0.5 truncate">
                  {user.email}
                </p>

                {/* 头像快捷操作行与状态提示 */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-black/[0.08] dark:border-white/15 cream:border-[#d5c7b3] bg-white/80 hover:bg-white dark:bg-white/[0.06] dark:hover:bg-white/[0.12] cream:bg-[#eee4d4] cream:hover:bg-[#e4d9c7] text-xs font-semibold text-gray-800 dark:text-gray-200 cream:text-[#26211e] shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <FiUploadCloud className="size-3.5 text-primary-500" />
                    <span>{isUploadingAvatar ? '正在上传...' : '上传自定义头像'}</span>
                  </button>

                  {userAvatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
                      title="重置为默认文字头像并释放云端空间"
                    >
                      <FiTrash2 className="size-3.5" />
                      <span>移除</span>
                    </button>
                  )}
                </div>

                {/* 5MB 对象存储空间约束指引 */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] sm:text-[11px] text-gray-400 cream:text-[#8a7f72]">
                  <span className="inline-block px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-mono text-[9px] sm:text-[10px]">
                    5MB 配额
                  </span>
                  <span>限 JPG/PNG/WEBP · 单图 ≤ 2MB · 自动裁剪为 256×256 WebP · 覆盖防冗余</span>
                </div>

                {/* 头像上传成功或错误提示 */}
                {avatarFeedback && (
                  <div
                    className={`mt-1.5 text-xs flex items-center gap-1.5 font-medium ${
                      avatarFeedback.type === 'success'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-500 dark:text-red-400'
                    }`}
                  >
                    {avatarFeedback.type === 'success' ? (
                      <FiCheck className="size-3.5" />
                    ) : (
                      <FiAlertCircle className="size-3.5" />
                    )}
                    <span>{avatarFeedback.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. 个人信息设置区（替代原设置页组件，在管理账号中维护） */}
            <form onSubmit={handleSavePersonalProfile} className="space-y-3 sm:space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-900 dark:text-white cream:text-[#26211e]">
                  <FiUser className="size-3.5 sm:size-4" style={{ color: activeColor }} />
                  <span>个人信息设置</span>
                </div>
                <span className="text-[11px] text-gray-400 cream:text-[#8a7f72]">问候卡片及主页专属称呼</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor={profileNicknameInputId}
                    className="text-[11px] font-medium text-gray-600 dark:text-gray-300 cream:text-[#52493f]"
                  >
                    你的称呼 / 昵称
                  </label>
                  <input
                    id={profileNicknameInputId}
                    type="text"
                    value={profileNickname}
                    onChange={(e) => setProfileNickname(e.target.value)}
                    placeholder="输入自定义昵称"
                    className="w-full px-3 py-1.5 sm:py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] cream:bg-[#f5ece0]/80 border border-black/[0.08] dark:border-white/10 cream:border-[#d7c9b5] text-xs sm:text-sm text-gray-900 dark:text-white cream:text-[#26211e] placeholder:text-gray-400 cream:placeholder:text-[#968a7a] focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor={profileMottoInputId}
                    className="text-[11px] font-medium text-gray-600 dark:text-gray-300 cream:text-[#52493f]"
                  >
                    个性座右铭 / 专属签名
                  </label>
                  <input
                    id={profileMottoInputId}
                    type="text"
                    value={profileMotto}
                    onChange={(e) => setProfileMotto(e.target.value)}
                    placeholder="心怀热爱，奔赴每一个灿烂的日子"
                    className="w-full px-3 py-1.5 sm:py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] cream:bg-[#f5ece0]/80 border border-black/[0.08] dark:border-white/10 cream:border-[#d7c9b5] text-xs sm:text-sm text-gray-900 dark:text-white cream:text-[#26211e] placeholder:text-gray-400 cream:placeholder:text-[#968a7a] focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <div className="text-[11px]">
                  {profileSaveSuccess && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <FiCheck className="size-3" /> 设置保存成功！个人资料已实时同步更新。
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-xs transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50 cursor-pointer ml-auto"
                  style={{ backgroundColor: activeColor }}
                >
                  <FiCheck className="size-3.5 sm:size-4" />
                  <span>{isSavingProfile ? '正在保存...' : '保存个人资料'}</span>
                </button>
              </div>
            </form>

            {/* 3. 账号与同步元数据（简约分组列表） */}
            <div className="rounded-2xl border border-black/[0.06] dark:border-white/10 cream:border-[#dfd3c0]/70 bg-black/[0.015] dark:bg-white/[0.02] cream:bg-[#f5ece0]/50 divide-y divide-black/[0.05] dark:divide-white/[0.06] cream:divide-[#dfd3c0]/60 text-xs">
              <div className="flex items-center justify-between px-3.5 py-2 sm:py-2.5">
                <span className="text-gray-500 dark:text-gray-400 cream:text-[#786e63]">账号用户 ID</span>
                <div className="flex items-center gap-1.5 font-mono text-gray-700 dark:text-gray-300 cream:text-[#3d362f]">
                  <span>{user.id.slice(0, 16)}...</span>
                  <button
                    type="button"
                    onClick={() => handleCopyId(user.id)}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cream:hover:text-[#26211e] transition-colors cursor-pointer"
                    title="复制完整 ID"
                  >
                    {copiedId ? <FiCheck className="size-3.5 text-emerald-500" /> : <FiCopy className="size-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between px-3.5 py-2 sm:py-2.5">
                <span className="text-gray-500 dark:text-gray-400 cream:text-[#786e63]">云端同步状态</span>
                <div className="flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-200 cream:text-[#26211e]">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span>计时器与待办已加密同步</span>
                </div>
              </div>
            </div>

            {/* 4. 操作与快捷导航 */}
            <div className="space-y-2.5 pt-0.5">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => transitionTo('main')}
                  className="py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-2xs transition-opacity hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer truncate"
                  style={{ backgroundColor: activeColor }}
                >
                  <span className="truncate">返回主页计时器</span>
                  <FiArrowRight className="size-3.5 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => transitionTo('settings')}
                  className="py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-medium border border-black/10 dark:border-white/15 cream:border-[#d7c9b5] bg-black/[0.02] dark:bg-white/[0.04] cream:bg-[#f5ece0]/60 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-gray-700 dark:text-gray-200 cream:text-[#3d362f] transition-colors flex items-center justify-center gap-1.5 cursor-pointer truncate"
                >
                  <FiSettings className="size-3.5 shrink-0" />
                  <span className="truncate">前往个人设置中心</span>
                </button>
              </div>

              <div className="text-center pt-0.5">
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                  }}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 py-1 px-2.5 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <FiLogOut className="size-3.5" />
                  <span>退出当前账号</span>
                </button>
              </div>
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
            className="my-auto w-full max-w-lg mx-auto rounded-3xl border border-black/[0.08] dark:border-white/10 cream:border-amber-900/10 bg-white/85 dark:bg-zinc-900/85 cream:bg-[#fcf9f2]/90 p-5 sm:p-7 md:p-8 backdrop-blur-2xl shadow-2xl shadow-black/5 dark:shadow-black/30 relative overflow-hidden"
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
                  noValidate
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
                  {(() => {
                    const hasEmailError = Boolean(fieldErrors.email);
                    return (
                      <div className="space-y-1 text-left">
                        <label
                          htmlFor={emailInputId}
                          className="block text-xs font-semibold text-gray-700 dark:text-gray-300"
                        >
                          电子邮箱地址
                        </label>
                        <motion.div
                          animate={
                            shakingField === 'email'
                              ? { x: [-6, 6, -4, 4, -2, 2, 0] }
                              : { x: 0 }
                          }
                          transition={{ duration: 0.35, ease: 'easeInOut' }}
                          className={`relative flex items-center rounded-2xl border overflow-hidden transition-all duration-200 ${
                            hasEmailError
                              ? 'border-rose-400 dark:border-rose-500/70 cream:border-rose-400 ring-2 ring-rose-500/15 dark:ring-rose-500/20 bg-rose-50/30 dark:bg-rose-950/20 cream:bg-rose-100/20'
                              : focusedField === 'email'
                              ? 'border-transparent bg-black/[0.02] dark:bg-white/[0.03] cream:bg-amber-100/15'
                              : 'border-black/10 dark:border-white/10 cream:border-amber-900/15 hover:border-black/20 dark:hover:border-white/20 bg-black/[0.02] dark:bg-white/[0.03] cream:bg-amber-100/15'
                          }`}
                          style={{
                            borderColor:
                              hasEmailError
                                ? undefined
                                : focusedField === 'email'
                                ? activeColor
                                : undefined,
                          }}
                        >
                          <FiMail
                            className="pointer-events-none absolute left-3.5 size-4 transition-colors duration-200"
                            style={{
                              color:
                                hasEmailError
                                  ? '#F43F5E'
                                  : focusedField === 'email'
                                  ? activeColor
                                  : undefined,
                            }}
                          />
                          <input
                            ref={emailInputRef}
                            id={emailInputId}
                            type="email"
                            value={email}
                            onFocus={() => {
                              setFocusedField('email');
                              if (fieldErrors.email) {
                                setFieldErrors((prev) => ({ ...prev, email: undefined }));
                              }
                            }}
                            onBlur={() => setFocusedField(null)}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (fieldErrors.email) {
                                setFieldErrors((prev) => ({ ...prev, email: undefined }));
                              }
                            }}
                            onInvalid={(e) => e.preventDefault()}
                            placeholder="name@example.com"
                            autoComplete="email"
                            aria-required="true"
                            aria-invalid={hasEmailError}
                            aria-describedby={hasEmailError ? `${emailInputId}-error` : undefined}
                            disabled={isLoading}
                            className="w-full bg-transparent rounded-[inherit] py-2.5 sm:py-3 pl-10 pr-3 text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
                          />
                        </motion.div>
                        <FieldValidationTooltip id={`${emailInputId}-error`} error={fieldErrors.email} />
                      </div>
                    );
                  })()}

                  {/* 密码输入域（找回密码模式无需密码） */}
                  {mode !== 'forgot' && (() => {
                    const hasPasswordError = Boolean(fieldErrors.password);
                    return (
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
                        <motion.div
                          animate={
                            shakingField === 'password'
                              ? { x: [-6, 6, -4, 4, -2, 2, 0] }
                              : { x: 0 }
                          }
                          transition={{ duration: 0.35, ease: 'easeInOut' }}
                          className={`relative flex items-center rounded-2xl border overflow-hidden transition-all duration-200 ${
                            hasPasswordError
                              ? 'border-rose-400 dark:border-rose-500/70 cream:border-rose-400 ring-2 ring-rose-500/15 dark:ring-rose-500/20 bg-rose-50/30 dark:bg-rose-950/20 cream:bg-rose-100/20'
                              : focusedField === 'password'
                              ? 'border-transparent bg-black/[0.02] dark:bg-white/[0.03] cream:bg-amber-100/15'
                              : 'border-black/10 dark:border-white/10 cream:border-amber-900/15 hover:border-black/20 dark:hover:border-white/20 bg-black/[0.02] dark:bg-white/[0.03] cream:bg-amber-100/15'
                          }`}
                          style={{
                            borderColor:
                              hasPasswordError
                                ? undefined
                                : focusedField === 'password'
                                ? activeColor
                                : undefined,
                          }}
                        >
                          <FiLock
                            className="pointer-events-none absolute left-3.5 size-4 transition-colors duration-200"
                            style={{
                              color:
                                hasPasswordError
                                  ? '#F43F5E'
                                  : focusedField === 'password'
                                  ? activeColor
                                  : undefined,
                            }}
                          />
                          <input
                            ref={passwordInputRef}
                            id={passwordInputId}
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onFocus={() => {
                              setFocusedField('password');
                              if (fieldErrors.password) {
                                setFieldErrors((prev) => ({ ...prev, password: undefined }));
                              }
                            }}
                            onBlur={() => setFocusedField(null)}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (fieldErrors.password) {
                                setFieldErrors((prev) => ({ ...prev, password: undefined }));
                              }
                              if (fieldErrors.confirmPassword && mode === 'signup' && confirmPassword === e.target.value) {
                                setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                              }
                            }}
                            onInvalid={(e) => e.preventDefault()}
                            placeholder={mode === 'signup' ? '至少包含 6 位字符' : '请输入密码'}
                            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                            aria-required="true"
                            aria-invalid={hasPasswordError}
                            aria-describedby={hasPasswordError ? `${passwordInputId}-error` : undefined}
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
                        </motion.div>
                        <FieldValidationTooltip id={`${passwordInputId}-error`} error={fieldErrors.password} />

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
                                <span className="text-gray-400">{t('auth.passwordStrength', '密码强度')}</span>
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
                    );
                  })()}

                  {/* 注册模式下的确认密码（柔和高度展开） */}
                  <AnimatePresence initial={false}>
                    {mode === 'signup' && (() => {
                      const hasConfirmPasswordError = Boolean(fieldErrors.confirmPassword);
                      return (
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
                              {t('auth.confirmPassword', '确认登录密码')}
                            </label>
                            {confirmPassword && password === confirmPassword && (
                              <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                                <FiCheck className="size-3.5" /> {t('auth.passwordsMatch', '密码一致')}
                              </span>
                            )}
                          </div>
                          <motion.div
                            animate={
                              shakingField === 'confirmPassword'
                                ? { x: [-6, 6, -4, 4, -2, 2, 0] }
                                : { x: 0 }
                            }
                            transition={{ duration: 0.35, ease: 'easeInOut' }}
                            className={`relative flex items-center rounded-2xl border overflow-hidden transition-all duration-200 ${
                              hasConfirmPasswordError
                                ? 'border-rose-400 dark:border-rose-500/70 cream:border-rose-400 ring-2 ring-rose-500/15 dark:ring-rose-500/20 bg-rose-50/30 dark:bg-rose-950/20 cream:bg-rose-100/20'
                                : focusedField === 'confirmPassword'
                                ? 'border-transparent bg-black/[0.02] dark:bg-white/[0.03] cream:bg-amber-100/15'
                                : 'border-black/10 dark:border-white/10 cream:border-amber-900/15 hover:border-black/20 dark:hover:border-white/20 bg-black/[0.02] dark:bg-white/[0.03] cream:bg-amber-100/15'
                            }`}
                            style={{
                              borderColor:
                                hasConfirmPasswordError
                                  ? undefined
                                  : focusedField === 'confirmPassword'
                                  ? activeColor
                                  : undefined,
                            }}
                          >
                            <FiLock
                              className="pointer-events-none absolute left-3.5 size-4 transition-colors duration-200"
                              style={{
                                color:
                                  hasConfirmPasswordError
                                    ? '#F43F5E'
                                    : focusedField === 'confirmPassword'
                                    ? activeColor
                                    : undefined,
                              }}
                            />
                            <input
                              ref={confirmPasswordInputRef}
                              id={confirmPasswordInputId}
                              type={showPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onFocus={() => {
                                setFocusedField('confirmPassword');
                                if (fieldErrors.confirmPassword) {
                                  setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                                }
                              }}
                              onBlur={() => setFocusedField(null)}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                if (fieldErrors.confirmPassword) {
                                  setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                                }
                              }}
                              onInvalid={(e) => e.preventDefault()}
                              placeholder={t('auth.confirmPasswordPlaceholder', '再次输入刚才设置的密码')}
                              autoComplete="new-password"
                              aria-required="true"
                              aria-invalid={hasConfirmPasswordError}
                              aria-describedby={hasConfirmPasswordError ? `${confirmPasswordInputId}-error` : undefined}
                              disabled={isLoading}
                              className="w-full bg-transparent rounded-[inherit] py-2.5 sm:py-3 pl-10 pr-3 text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
                            />
                          </motion.div>
                          <FieldValidationTooltip id={`${confirmPasswordInputId}-error`} error={fieldErrors.confirmPassword} />
                        </motion.div>
                      );
                    })()}
                  </AnimatePresence>

                  {/* 提交主操作按钮：轻盈通透毛玻璃质感，动态契合主题色，优雅细腻呼吸态与确认微交互 */}
                  <div className="pt-2">
                    <ProgressSubmitButton
                      status={isLoading && submitStatus === 'idle' ? 'loading' : submitStatus}
                      accentColor={activeColor}
                      progressColor={activeColor}
                      idleText={
                        mode === 'forgot'
                          ? t('auth.submitForgot', '发送重置密码邮件')
                          : mode === 'signup'
                          ? t('auth.submitSignUp', '注册账号')
                          : t('auth.submitSignIn', '立即登录')
                      }
                      loadingText={
                        mode === 'forgot'
                          ? t('auth.submittingForgot', '正在发送重置邮件...')
                          : mode === 'signup'
                          ? t('auth.submittingSignUp', '正在创建专属账号...')
                          : t('auth.submittingSignIn', '正在安全验证...')
                      }
                      successText={
                        mode === 'forgot'
                          ? t('auth.successForgot', '重置邮件已发送')
                          : mode === 'signup'
                          ? t('auth.successSignUp', '注册成功，欢迎加入')
                          : t('auth.successSignIn', '登录成功，欢迎回来')
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
                      {t('auth.rememberPassword', '记起密码了？返回登录')}
                    </button>
                  </div>
                )}

                {/* 底部安全与加密承诺 */}
                <div className="text-center pt-3 border-t border-black/[0.05] dark:border-white/[0.06]">
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1.5 font-medium">
                    <FiShield className="size-3.5 text-emerald-500 shrink-0" />
                    <span>{t('auth.tlsNote', '数据均通过行业级 TLS 加密传输，由 Supabase 提供安全认证支持')}</span>
                  </p>
                </div>
              </div>
            </motion.div>
        )}
      </main>

      {/* 4. 独立路由底部版权与极简理念 */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto py-2 px-4 flex flex-col sm:flex-row items-center justify-between text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 gap-1.5 sm:gap-2">
        <div className="flex items-center gap-2">
          <span>TimePulse · {t('common.appName', 'TimePulse')}</span>
          <span>·</span>
          <span>{t('auth.subtitle', '极简专注 · 温暖打气 · 随时掌握时光脉搏')}</span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px] sm:text-[11px]">
          <span>© {new Date().getFullYear()} TimePulse Project.</span>
        </div>
      </footer>
    </div>
  );
}
