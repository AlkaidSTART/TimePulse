import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { usePersonalSettingsStore } from './usePersonalSettingsStore';
import { validateAvatarFile, processAndOptimizeAvatar, getEffectiveAvatarUrl } from '@/utils/avatar';

type SupabaseClient = typeof import('@/lib/supabase')['supabase'];

export type OAuthProvider = 'google' | 'github';

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
  if (rawMsg.includes('provider is not enabled') || rawMsg.includes('Unsupported provider')) {
    return '该登录方式暂未开启，请使用邮箱登录或稍后再试';
  }
  if (rawMsg.includes('Password should be at least') || rawMsg.includes('least 6 characters')) {
    return '密码长度不能少于 6 位字符';
  }
  if (rawMsg.includes('rate limit') || rawMsg.includes('security purposes') || rawMsg.includes('60 seconds')) {
    return '操作过于频繁，请稍候再试';
  }
  if (
    rawMsg.includes('invalid format') ||
    rawMsg.includes('valid email') ||
    rawMsg.includes('invalid email') ||
    // GoTrue 严格邮箱校验：`Email address "x" is invalid`
    rawMsg.includes('is invalid')
  ) {
    return '请输入有效的电子邮箱地址';
  }
  if (rawMsg.includes('Signup requires a valid password')) {
    return '请输入有效的密码';
  }
  if (rawMsg.includes('network') || rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError')) {
    return '网络连接失败，请检查网络设置或稍候重试';
  }
  if (rawMsg.includes('Payload too large') || rawMsg.includes('413') || rawMsg.includes('file_size_limit')) {
    return '头像文件体积超出存储桶限制（单图限 200KB 以内，云端总配额 5MB）';
  }
  if (rawMsg.includes('storage quota') || rawMsg.includes('quota exceeded') || rawMsg.includes('storage_limit')) {
    return '云端对象存储空间已满（总配额 5MB），请联系管理员或稍后重试';
  }
  if (rawMsg.includes('mime type') || rawMsg.includes('mime_types') || rawMsg.includes('unsupported media')) {
    return '不支持的文件格式，仅支持 JPG、PNG、WEBP 格式静态图片';
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
  signInWithOAuth: (provider: OAuthProvider) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (
    email: string,
    password: string,
    metadata?: { nickname?: string }
  ) => Promise<{ success: boolean; message?: string; error?: string; session?: Session | null }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  uploadAvatar: (file: File) => Promise<{ success: boolean; avatarUrl?: string; error?: string }>;
  removeAvatar: () => Promise<{ success: boolean; error?: string }>;
  updateProfile: (profile: { nickname?: string; customMotto?: string; avatarUrl?: string }) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  clearSuccessMessage: () => void;
  setError: (err: string | null) => void;
  setSuccessMessage: (msg: string | null) => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

let authSubscriptionInitialized = false;

/**
 * 智能同步云端用户 Profile（昵称、签名及头像）
 * 核心设计：
 * 1. 优先检查 Supabase Storage 的 touxiang 存储桶中当前用户专属目录是否有已上传头像；
 * 2. 若存在有效头像图片，提取公开 URL 并设为当前头像，防止被 Google OAuth 等第三方下发的默认头像覆盖；
 * 3. 兜底回退至 getEffectiveAvatarUrl。
 */
async function syncUserCloudProfile(
  user: User | null,
  supabaseClient: SupabaseClient,
  setUser?: (user: User) => void
) {
  if (!user) return;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('timepulse_has_registered', 'true');
      if (user.email) {
        localStorage.setItem('timepulse_registered_email', user.email);
      }
    } catch {}
  }

  // 同步昵称
  if (user.user_metadata?.nickname) {
    const currentNickname = usePersonalSettingsStore.getState().nickname;
    if (!currentNickname || currentNickname === '阳光旅人') {
      usePersonalSettingsStore.getState().updateSettings({
        nickname: String(user.user_metadata.nickname),
      });
    }
  }

  // 同步自定义座右铭
  if (user.user_metadata?.custom_motto) {
    usePersonalSettingsStore.getState().updateSettings({
      customMotto: String(user.user_metadata.custom_motto),
    });
  }

  // 核心：优先从 touxiang 存储桶中解析用户专属目录下的头像文件
  let resolvedAvatar: string | null = null;
  try {
    const { data: storageFiles } = await supabaseClient.storage.from('touxiang').list(user.id);
    if (storageFiles && storageFiles.length > 0) {
      const validImages = storageFiles.filter((f) => /\.(jpe?g|png|webp)$/i.test(f.name));
      if (validImages.length > 0) {
        // 优先匹配标准 avatar.webp/avatar.jpg，或取最新上传的文件
        const avatarFile = validImages.find((f) => f.name.startsWith('avatar.')) || validImages[validImages.length - 1];
        const { data: publicData } = supabaseClient.storage.from('touxiang').getPublicUrl(`${user.id}/${avatarFile.name}`);
        if (publicData?.publicUrl) {
          const timestamp = new Date(avatarFile.updated_at || avatarFile.created_at || Date.now()).getTime();
          const storageUrl = `${publicData.publicUrl}?t=${timestamp}`;
          resolvedAvatar = storageUrl;

          // 若 user_metadata 未记录或被第三方覆盖，异步静默补齐
          if (user.user_metadata?.custom_avatar_url !== storageUrl || user.user_metadata?.avatar_url !== storageUrl) {
            void supabaseClient.auth.updateUser({
              data: {
                avatar_url: storageUrl,
                custom_avatar_url: storageUrl,
              },
            }).then(({ data: updatedAuth }) => {
              if (updatedAuth?.user && setUser) {
                setUser(updatedAuth.user);
              }
            }).catch((err) => {
              console.warn('静默同步 custom_avatar_url 提示:', err);
            });
          }
        }
      }
    }
  } catch (storageCheckErr) {
    console.warn('检查云端 touxiang 存储桶头像提示:', storageCheckErr);
  }

  // 若存储桶中无文件，按规范降级处理（custom_avatar_url -> OAuth avatar）
  if (!resolvedAvatar) {
    resolvedAvatar = getEffectiveAvatarUrl(user, usePersonalSettingsStore.getState().avatar);
  }

  if (resolvedAvatar) {
    usePersonalSettingsStore.getState().updateSettings({
      avatar: String(resolvedAvatar),
    });
  }
}

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

      await syncUserCloudProfile(user, supabase, (u) => set({ user: u }));

      if (!authSubscriptionInitialized) {
        authSubscriptionInitialized = true;
        supabase.auth.onAuthStateChange((_event, newSession) => {
          const newUser = newSession?.user ?? null;
          set({
            session: newSession,
            user: newUser,
          });

          void syncUserCloudProfile(newUser, supabase, (u) => set({ user: u }));
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

      if (data.user && typeof window !== 'undefined') {
        try {
          localStorage.setItem('timepulse_has_registered', 'true');
          if (data.user.email) {
            localStorage.setItem('timepulse_registered_email', data.user.email);
          }
        } catch {}
      }

      // 同步用户昵称与签名
      if (data.user?.user_metadata?.nickname) {
        usePersonalSettingsStore.getState().updateSettings({
          nickname: String(data.user.user_metadata.nickname),
        });
      }
      if (data.user?.user_metadata?.custom_motto) {
        usePersonalSettingsStore.getState().updateSettings({
          customMotto: String(data.user.user_metadata.custom_motto),
        });
      }

      return { success: true };
    } catch (err) {
      const formatted = formatAuthError(err);
      set({ isLoading: false, error: formatted });
      return { success: false, error: formatted };
    }
  },

  signInWithOAuth: async (provider) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      const supabase = await getSupabaseClient();
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });

      if (error) {
        const formatted = formatAuthError(error);
        set({ isLoading: false, error: formatted });
        return { success: false, error: formatted };
      }

      const url = data?.url;
      if (!url) {
        const formatted = '未获取到授权地址，请稍后再试';
        set({ isLoading: false, error: formatted });
        return { success: false, error: formatted };
      }

      if (typeof window !== 'undefined') {
        // 预检：provider 未启用时 GoTrue 的 /authorize 返回 4xx（CORS 可读），
        // 先探测可避免浏览器直接跳到原始 JSON 错误页。
        const probe = await fetch(url, { redirect: 'manual' }).catch(() => null);
        if (probe && probe.status >= 400) {
          const body = (await probe.json().catch(() => null)) as { msg?: string } | null;
          const formatted = formatAuthError(body?.msg ?? `HTTP ${probe.status}`);
          set({ isLoading: false, error: formatted });
          return { success: false, error: formatted };
        }

        // 跳转到第三方授权页；回跳时由 detectSessionInUrl 自动建立会话
        window.location.assign(url);
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
        if (formatted.includes('已被注册') && typeof window !== 'undefined') {
          try {
            localStorage.setItem('timepulse_has_registered', 'true');
            localStorage.setItem('timepulse_registered_email', trimmedEmail);
          } catch {}
        }
        set({ isLoading: false, error: formatted });
        return { success: false, error: formatted };
      }

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('timepulse_has_registered', 'true');
          localStorage.setItem('timepulse_registered_email', trimmedEmail);
        } catch {}
      }

      const hasSession = Boolean(data.session);
      const message = hasSession
        ? '注册并登录成功！'
        : '注册申请已提交！若您的系统启用了邮箱验证，请查收邮件以完成激活。';

      set({
        session: data.session,
        // 邮箱验证开启时注册不返回会话：必须保持未登录态，
        // 否则会在用户完成邮箱验证前展示“已登录”会员界面。
        user: data.session ? data.user : null,
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

  uploadAvatar: async (file: File) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      // 1. 约束校验：格式与原始体积限制（适配 5MB 总对象存储空间）
      const validation = validateAvatarFile(file);
      if (!validation.valid) {
        const errorMsg = validation.error || '所选图片不符合要求';
        set({ isLoading: false, error: errorMsg });
        return { success: false, error: errorMsg };
      }

      // 2. 身份约束：云存储仅 5MB，仅允许已登录用户上传个人专属云端头像
      const currentUser = get().user;
      if (!currentUser) {
        const errorMsg = '云端对象存储仅 5MB 配额，请先登录账号后再上传专属头像';
        set({ isLoading: false, error: errorMsg });
        return { success: false, error: errorMsg };
      }

      // 3. 前端轻量化优化：居中正方形裁剪、256×256 缩放抗锯齿、转码高压缩率 WebP
      const optimizedFile = await processAndOptimizeAvatar(file);

      const supabase = await getSupabaseClient();

      // 4. 一人一图防冗余：固定用户专属路径 avatar.webp，使用 upsert 覆盖写入
      const folder = currentUser.id;
      const fileExt = optimizedFile.name.split('.').pop()?.toLowerCase() || 'webp';
      const fileName = `avatar.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      // 上传至 Supabase Storage touxiang 存储桶
      const { error: uploadError } = await supabase.storage
        .from('touxiang')
        .upload(filePath, optimizedFile, {
          contentType: optimizedFile.type || 'image/webp',
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        const formatted = formatAuthError(uploadError);
        set({ isLoading: false, error: formatted });
        return { success: false, error: formatted };
      }

      // 5. 存储防冗余清理：自动清理该用户目录下可能遗留的历史冗余文件
      try {
        const { data: existingFiles } = await supabase.storage
          .from('touxiang')
          .list(folder);
        if (existingFiles && existingFiles.length > 0) {
          const toDelete = existingFiles
            .filter((f) => f.name !== fileName)
            .map((f) => `${folder}/${f.name}`);
          if (toDelete.length > 0) {
            await supabase.storage.from('touxiang').remove(toDelete);
          }
        }
      } catch (cleanErr) {
        console.warn('清理旧头像历史文件提示:', cleanErr);
      }

      // 6. 获取公开可访问 URL 并添加时间戳避免客户端缓存
      const { data: publicUrlData } = supabase.storage
        .from('touxiang')
        .getPublicUrl(filePath);

      const rawAvatarUrl = publicUrlData.publicUrl;
      const avatarUrl = `${rawAvatarUrl}?t=${Date.now()}`;

      // 同步到本地设置 store
      usePersonalSettingsStore.getState().updateSettings({
        avatar: avatarUrl,
      });

      // 同步更新 Supabase User Metadata (同时维护 custom_avatar_url 避免被 OAuth 冲掉)
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: avatarUrl,
          custom_avatar_url: avatarUrl,
        },
      });

      if (updateError) {
        console.warn('更新用户头像元数据异常:', updateError.message);
      } else if (updateData.user) {
        set({ user: updateData.user });
      }

      set({
        isLoading: false,
        error: null,
        successMessage: '头像上传成功！已自动优化至轻量体积并同步云端。',
      });

      return { success: true, avatarUrl };
    } catch (err) {
      const formatted = formatAuthError(err);
      set({ isLoading: false, error: formatted });
      return { success: false, error: formatted };
    }
  },

  removeAvatar: async () => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      usePersonalSettingsStore.getState().updateSettings({
        avatar: '',
      });

      const currentUser = get().user;
      if (currentUser) {
        const supabase = await getSupabaseClient();

        // 彻底释放云端 5MB 对象存储：清空用户专属目录下的所有头像文件
        try {
          const { data: userFiles } = await supabase.storage.from('touxiang').list(currentUser.id);
          if (userFiles && userFiles.length > 0) {
            const pathsToRemove = userFiles.map((f) => `${currentUser.id}/${f.name}`);
            await supabase.storage.from('touxiang').remove(pathsToRemove);
          }
        } catch (storageErr) {
          console.warn('移除云端头像文件提示:', storageErr);
        }

        const { data, error } = await supabase.auth.updateUser({
          data: {
            avatar_url: '',
            custom_avatar_url: '',
          },
        });

        if (error) {
          const formatted = formatAuthError(error);
          set({ isLoading: false, error: formatted });
          return { success: false, error: formatted };
        }

        if (data.user) {
          set({ user: data.user });
        }
      }

      set({
        isLoading: false,
        error: null,
        successMessage: '已恢复默认头像并释放云端存储空间',
      });
      return { success: true };
    } catch (err) {
      const formatted = formatAuthError(err);
      set({ isLoading: false, error: formatted });
      return { success: false, error: formatted };
    }
  },

  updateProfile: async ({ nickname, customMotto, avatarUrl }) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      // 1. 同步更新本地偏好 Store
      usePersonalSettingsStore.getState().updateSettings({
        ...(nickname !== undefined ? { nickname } : {}),
        ...(customMotto !== undefined ? { customMotto } : {}),
        ...(avatarUrl !== undefined ? { avatar: avatarUrl } : {}),
      });

      // 2. 如果存在云端用户，同步更新 Supabase User Metadata
      const currentUser = get().user;
      if (currentUser) {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase.auth.updateUser({
          data: {
            ...(nickname !== undefined ? { nickname } : {}),
            ...(customMotto !== undefined ? { custom_motto: customMotto } : {}),
            ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
          },
        });

        if (error) {
          const formatted = formatAuthError(error);
          set({ isLoading: false, error: formatted });
          return { success: false, error: formatted };
        }

        if (data.user) {
          set({
            user: data.user,
            isLoading: false,
            error: null,
            successMessage: '个人信息已更新并同步',
          });
          return { success: true };
        }
      }

      set({
        isLoading: false,
        error: null,
        successMessage: '个人信息已保存',
      });
      return { success: true };
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

if (typeof window !== 'undefined') {
  (window as any).__useAuthStore = useAuthStore;
}

