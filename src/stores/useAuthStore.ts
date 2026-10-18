import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { usePersonalSettingsStore } from './usePersonalSettingsStore';

type SupabaseClient = typeof import('@/lib/supabase')['supabase'];

let supabaseClientPromise: Promise<SupabaseClient> | null = null;

/**
 * 按需加载 Supabase 客户端：首屏不再静态打包 supabase-js，
 * 只有真正需要认证能力时才拉取对应 chunk。
 */
function getSupabaseClient(): Promise<SupabaseClient> {
  supabaseClientPromise ??= import('@/lib/supabase').then((m) => m.supabase);
  return supabaseClientPromise;
}

function formatAuthError(error: unknown): string {
  if (!error) return '操作失败，请重试';
  const rawMsg =
    typeof error === 'object' && error && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);

  if (rawMsg.includes('Invalid login credentials')) {
    return '邮箱或密码不正确，请核对后重试';
  }
  if (rawMsg.includes('Email not confirmed')) {
    return '邮箱尚未通过验证，请前往邮箱点击激活链接完成验证';
  }
  if (rawMsg.includes('User already registered')) {
    return '该邮箱已被注册，请直接登录';
  }
  if (rawMsg.includes('Password should be at least') || rawMsg.includes('least 6 characters')) {
    return '密码长度不能少于 6 位字符';
  }
  if (rawMsg.includes('rate limit') || rawMsg.includes('security purposes') || rawMsg.includes('60 seconds')) {
    return '操作过于频繁，请稍候再试';
  }
  if (rawMsg.includes('invalid format') || rawMsg.includes('valid email') || rawMsg.includes('invalid email')) {
    return '请输入有效的电子邮箱地址';
  }
  if (rawMsg.includes('Signup requires a valid password')) {
    return '请输入有效的密码';
  }
  if (rawMsg.includes('network') || rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError')) {
    return '网络连接失败，请检查网络设置或稍候重试';
  }

  return rawMsg || '认证操作失败，请重试';
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  successMessage: string | null;
  isAuthModalOpen: boolean;

  // Actions
  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (
    email: string,
    password: string,
    metadata?: { nickname?: string }
  ) => Promise<{ success: boolean; message?: string; error?: string; session?: Session | null }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  clearError: () => void;
  clearSuccessMessage: () => void;
  setError: (err: string | null) => void;
  setSuccessMessage: (msg: string | null) => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

let authSubscriptionInitialized = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  successMessage: null,
  isAuthModalOpen: false,

  initialize: async () => {
    if (get().isInitialized) return;

    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('获取当前会话失败:', error.message);
      }

      const session = data?.session ?? null;
      const user = session?.user ?? null;

      set({
        session,
        user,
        isInitialized: true,
      });

      // 同步昵称（若本地未设置且云端有用户昵称）
      if (user?.user_metadata?.nickname) {
        const currentNickname = usePersonalSettingsStore.getState().nickname;
        if (!currentNickname || currentNickname === '阳光旅人') {
          usePersonalSettingsStore.getState().updateSettings({
            nickname: String(user.user_metadata.nickname),
          });
        }
      }

      if (!authSubscriptionInitialized) {
        authSubscriptionInitialized = true;
        supabase.auth.onAuthStateChange((_event, newSession) => {
          const newUser = newSession?.user ?? null;
          set({
            session: newSession,
            user: newUser,
          });

          if (newUser?.user_metadata?.nickname) {
            const currentNickname = usePersonalSettingsStore.getState().nickname;
            if (!currentNickname || currentNickname === '阳光旅人') {
              usePersonalSettingsStore.getState().updateSettings({
                nickname: String(newUser.user_metadata.nickname),
              });
            }
          }
        });
      }
    } catch (err) {
      console.error('初始化 Auth 异常:', err);
      set({ isInitialized: true });
    }
  },

  signInWithEmail: async (email, password) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        const errorMsg = '请输入电子邮箱';
        set({ isLoading: false, error: errorMsg });
        return { success: false, error: errorMsg };
      }
      if (!password) {
        const errorMsg = '请输入密码';
        set({ isLoading: false, error: errorMsg });
        return { success: false, error: errorMsg };
      }

      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        const formatted = formatAuthError(error);
        set({ isLoading: false, error: formatted });
        return { success: false, error: formatted };
      }

      set({
        session: data.session,
        user: data.user,
        isLoading: false,
        error: null,
        successMessage: '登录成功，欢迎回来！',
      });

      // 同步用户昵称
      if (data.user?.user_metadata?.nickname) {
        usePersonalSettingsStore.getState().updateSettings({
          nickname: String(data.user.user_metadata.nickname),
        });
      }

      return { success: true };
    } catch (err) {
      const formatted = formatAuthError(err);
      set({ isLoading: false, error: formatted });
      return { success: false, error: formatted };
    }
  },

  signUpWithEmail: async (email, password, metadata) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        const errorMsg = '请输入电子邮箱';
        set({ isLoading: false, error: errorMsg });
        return { success: false, error: errorMsg };
      }
      if (!password || password.length < 6) {
        const errorMsg = '密码长度不能少于 6 位';
        set({ isLoading: false, error: errorMsg });
        return { success: false, error: errorMsg };
      }

      const nickname = metadata?.nickname?.trim();

      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: nickname ? { nickname } : undefined,
        },
      });

      if (error) {
        const formatted = formatAuthError(error);
        set({ isLoading: false, error: formatted });
        return { success: false, error: formatted };
      }

      const hasSession = Boolean(data.session);
      const message = hasSession
        ? '注册并登录成功！'
        : '注册申请已提交！若您的系统启用了邮箱验证，请查收邮件以完成激活。';

      set({
        session: data.session,
        user: data.user,
        isLoading: false,
        error: null,
        successMessage: message,
      });

      if (nickname) {
        usePersonalSettingsStore.getState().updateSettings({ nickname });
      }

      return {
        success: true,
        message,
        session: data.session,
      };
    } catch (err) {
      const formatted = formatAuthError(err);
      set({ isLoading: false, error: formatted });
      return { success: false, error: formatted };
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        const formatted = formatAuthError(error);
        set({ isLoading: false, error: formatted });
        return { success: false, error: formatted };
      }

      set({
        user: null,
        session: null,
        isLoading: false,
        error: null,
        successMessage: '已成功退出登录',
      });
      return { success: true };
    } catch (err) {
      const formatted = formatAuthError(err);
      set({ isLoading: false, error: formatted });
      return { success: false, error: formatted };
    }
  },

  resetPassword: async (email) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        const errorMsg = '请输入需要找回密码的电子邮箱';
        set({ isLoading: false, error: errorMsg });
        return { success: false, error: errorMsg };
      }

      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/#auth` : undefined;
      const supabase = await getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo,
      });

      if (error) {
        const formatted = formatAuthError(error);
        set({ isLoading: false, error: formatted });
        return { success: false, error: formatted };
      }

      const message = '密码重置邮件已发送，请前往邮箱查收邮件并按照指引重置密码。';
      set({
        isLoading: false,
        error: null,
        successMessage: message,
      });
      return { success: true, message };
    } catch (err) {
      const formatted = formatAuthError(err);
      set({ isLoading: false, error: formatted });
      return { success: false, error: formatted };
    }
  },

  clearError: () => set({ error: null }),
  clearSuccessMessage: () => set({ successMessage: null }),
  setError: (error) => set({ error }),
  setSuccessMessage: (successMessage) => set({ successMessage }),
  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
}));
