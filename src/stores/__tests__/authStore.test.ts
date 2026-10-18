import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../useAuthStore';
import { supabase } from '@/lib/supabase';

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      user: null,
      session: null,
      isLoading: false,
      isInitialized: false,
      error: null,
      successMessage: null,
      isAuthModalOpen: false,
    });
  });

  it('initializes with default state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.successMessage).toBeNull();
  });

  it('validates empty inputs on signInWithEmail', async () => {
    const { signInWithEmail } = useAuthStore.getState();
    const res1 = await signInWithEmail('', '');
    expect(res1.success).toBe(false);
    expect(useAuthStore.getState().error).toBe('请输入电子邮箱');

    const res2 = await signInWithEmail('test@example.com', '');
    expect(res2.success).toBe(false);
    expect(useAuthStore.getState().error).toBe('请输入密码');
  });

  it('validates password length on signUpWithEmail', async () => {
    const { signUpWithEmail } = useAuthStore.getState();
    const res = await signUpWithEmail('test@example.com', '12345');
    expect(res.success).toBe(false);
    expect(useAuthStore.getState().error).toBe('密码长度不能少于 6 位');
  });

  it('handles successful signInWithPassword', async () => {
    const mockUser = { id: 'u123', email: 'test@example.com', user_metadata: { nickname: '测试小星' } };
    const mockSession = { user: mockUser, access_token: 'fake-token' };

    vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValueOnce({
      data: { user: mockUser as any, session: mockSession as any },
      error: null,
    });

    const { signInWithEmail } = useAuthStore.getState();
    const result = await signInWithEmail('test@example.com', 'secret123');

    expect(result.success).toBe(true);
    const state = useAuthStore.getState();
    expect(state.user?.email).toBe('test@example.com');
    expect(state.session).toBeDefined();
    expect(state.successMessage).toBe('登录成功，欢迎回来！');
    expect(state.error).toBeNull();
  });

  it('translates invalid credentials error into friendly Chinese text', async () => {
    vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValueOnce({
      data: { user: null, session: null },
      error: new Error('Invalid login credentials') as any,
    });

    const { signInWithEmail } = useAuthStore.getState();
    const result = await signInWithEmail('wrong@example.com', 'wrongpassword');

    expect(result.success).toBe(false);
    expect(useAuthStore.getState().error).toBe('邮箱或密码不正确，请核对后重试');
  });

  it('handles successful signUpWithPassword', async () => {
    const mockUser = { id: 'u456', email: 'new@example.com', user_metadata: { nickname: '新星探索' } };
    const mockSession = { user: mockUser, access_token: 'fake-token-new' };

    vi.spyOn(supabase.auth, 'signUp').mockResolvedValueOnce({
      data: { user: mockUser as any, session: mockSession as any },
      error: null,
    });

    const { signUpWithEmail } = useAuthStore.getState();
    const result = await signUpWithEmail('new@example.com', 'secret123', { nickname: '新星探索' });

    expect(result.success).toBe(true);
    expect(useAuthStore.getState().user?.email).toBe('new@example.com');
  });

  it('keeps user logged out when signup requires email confirmation', async () => {
    const mockUser = { id: 'u789', email: 'pending@example.com', user_metadata: {} };

    vi.spyOn(supabase.auth, 'signUp').mockResolvedValueOnce({
      data: { user: mockUser as any, session: null },
      error: null,
    });

    const { signUpWithEmail } = useAuthStore.getState();
    const result = await signUpWithEmail('pending@example.com', 'secret123');

    expect(result.success).toBe(true);
    expect(result.session).toBeNull();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.successMessage).toContain('注册申请已提交');
  });

  it('translates strict email validation errors into friendly Chinese text', async () => {
    vi.spyOn(supabase.auth, 'signUp').mockResolvedValueOnce({
      data: { user: null, session: null },
      error: new Error('Email address "tp-test@example.com" is invalid') as any,
    });

    const { signUpWithEmail } = useAuthStore.getState();
    const result = await signUpWithEmail('tp-test@example.com', 'secret123');

    expect(result.success).toBe(false);
    expect(useAuthStore.getState().error).toBe('请输入有效的电子邮箱地址');
  });

  it('signInWithOAuth passes provider and redirectTo', async () => {
    const spy = vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValueOnce({
      data: { provider: 'google', url: 'https://example.invalid/authorize?provider=google' },
      error: null,
    } as any);
    const fetchMock = vi.fn(async () => new Response(null, { status: 302 }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await useAuthStore.getState().signInWithOAuth('google');

    expect(res.success).toBe(true);
    expect(useAuthStore.getState().isLoading).toBe(false);
    expect(useAuthStore.getState().successMessage).toBe('已在浏览器中打开授权页，请在浏览器中完成登录');
    expect(spy).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.any(String), skipBrowserRedirect: true },
    });
    expect(fetchMock).toHaveBeenCalledWith('https://example.invalid/authorize?provider=google', {
      redirect: 'manual',
    });
    vi.unstubAllGlobals();
  });

  it('translates disabled OAuth provider error into friendly Chinese text', async () => {
    vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValueOnce({
      data: { provider: 'github', url: 'https://example.invalid/authorize?provider=github' },
      error: null,
    } as any);
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ msg: 'Unsupported provider: provider is not enabled' }), {
            status: 400,
          })
      )
    );

    const res = await useAuthStore.getState().signInWithOAuth('github');

    expect(res.success).toBe(false);
    expect(useAuthStore.getState().error).toBe('该登录方式暂未开启，请使用邮箱登录或稍后再试');
    vi.unstubAllGlobals();
  });

  it('handles signInWithOAuth client errors', async () => {
    vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValueOnce({
      data: { provider: 'github', url: null },
      error: new Error('Failed to fetch') as any,
    } as any);

    const res = await useAuthStore.getState().signInWithOAuth('github');

    expect(res.success).toBe(false);
    expect(useAuthStore.getState().error).toBe('网络连接失败，请检查网络设置或稍候重试');
  });

  it('handles signOut correctly', async () => {
    useAuthStore.setState({
      user: { id: 'u123', email: 'user@example.com' } as any,
      session: { access_token: 'abc' } as any,
    });

    vi.spyOn(supabase.auth, 'signOut').mockResolvedValueOnce({
      error: null,
    });

    const { signOut } = useAuthStore.getState();
    const res = await signOut();

    expect(res.success).toBe(true);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().successMessage).toBe('已成功退出登录');
  });

  it('clears error and success messages', () => {
    useAuthStore.setState({
      error: '出错了',
      successMessage: '成功了',
    });

    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();

    useAuthStore.getState().clearSuccessMessage();
    expect(useAuthStore.getState().successMessage).toBeNull();
  });

  it('validates file type and size on uploadAvatar', async () => {
    const { uploadAvatar } = useAuthStore.getState();

    // 格式不符合（如文本文件）
    const invalidFile = new File(['text'], 'test.txt', { type: 'text/plain' });
    const res1 = await uploadAvatar(invalidFile);
    expect(res1.success).toBe(false);
    expect(res1.error).toBe('不支持的图片格式，仅支持 PNG、JPG、WEBP 格式');

    // 不支持 GIF 动图
    const gifFile = new File(['gif'], 'test.gif', { type: 'image/gif' });
    const resGif = await uploadAvatar(gifFile);
    expect(resGif.success).toBe(false);
    expect(resGif.error).toContain('不支持 GIF 动图');

    // 体积超过 2MB
    const bigFile = new File([new Uint8Array(3 * 1024 * 1024)], 'big.png', { type: 'image/png' });
    const res2 = await uploadAvatar(bigFile);
    expect(res2.success).toBe(false);
    expect(res2.error).toBe('头像图片文件大小不能超过 2MB（云端存储总容量仅 5MB）');

    // 未登录用户拦截
    useAuthStore.setState({ user: null });
    const validFile = new File(['valid'], 'avatar.png', { type: 'image/png' });
    const res3 = await uploadAvatar(validFile);
    expect(res3.success).toBe(false);
    expect(res3.error).toContain('云端对象存储仅 5MB 配额，请先登录账号后再上传专属头像');
  });

  it('handles successful uploadAvatar with Supabase storage', async () => {
    useAuthStore.setState({
      user: { id: 'u123', email: 'user@example.com', user_metadata: {} } as any,
    });

    const mockPublicUrl = 'https://ikdbwkrqlfksmjgrzchm.supabase.co/storage/v1/object/public/touxiang/u123/avatar.webp';

    const mockStorageFrom = vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'u123/avatar.webp' }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: mockPublicUrl } }),
      list: vi.fn().mockResolvedValue({ data: [{ name: 'avatar-old.png' }], error: null }),
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    vi.spyOn(supabase.storage, 'from').mockImplementation(mockStorageFrom as any);
    vi.spyOn(supabase.auth, 'updateUser').mockResolvedValueOnce({
      data: {
        user: {
          id: 'u123',
          email: 'user@example.com',
          user_metadata: { avatar_url: mockPublicUrl },
        } as any,
      },
      error: null,
    });

    const file = new File(['dummy content'], 'avatar.png', { type: 'image/png' });
    const { uploadAvatar } = useAuthStore.getState();
    const res = await uploadAvatar(file);

    expect(res.success).toBe(true);
    expect(res.avatarUrl).toContain(mockPublicUrl);
    expect(mockStorageFrom).toHaveBeenCalledWith('touxiang');
  });

  it('handles removeAvatar correctly and clears storage', async () => {
    useAuthStore.setState({
      user: {
        id: 'u123',
        email: 'user@example.com',
        user_metadata: { avatar_url: 'https://example.com/avatar.webp' },
      } as any,
    });

    const mockRemove = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockStorageFrom = vi.fn().mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: [{ name: 'avatar.webp' }], error: null }),
      remove: mockRemove,
    });
    vi.spyOn(supabase.storage, 'from').mockImplementation(mockStorageFrom as any);

    vi.spyOn(supabase.auth, 'updateUser').mockResolvedValueOnce({
      data: {
        user: {
          id: 'u123',
          email: 'user@example.com',
          user_metadata: { avatar_url: '' },
        } as any,
      },
      error: null,
    });

    const { removeAvatar } = useAuthStore.getState();
    const res = await removeAvatar();

    expect(res.success).toBe(true);
    expect(useAuthStore.getState().user?.user_metadata.avatar_url).toBe('');
    expect(mockStorageFrom).toHaveBeenCalledWith('touxiang');
    expect(mockRemove).toHaveBeenCalledWith(['u123/avatar.webp']);
  });
});
