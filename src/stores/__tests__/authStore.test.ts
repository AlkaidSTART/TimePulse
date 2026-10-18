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
});
