import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import AuthPage from './AuthPage';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/lib/supabase';

describe('AuthPage component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      user: null,
      session: null,
      isLoading: false,
      isInitialized: true,
      error: null,
      successMessage: null,
      isAuthModalOpen: false,
    });
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <ThemeProvider>
        <AuthPage />
      </ThemeProvider>
    );
  };

  it('renders sign-up mode by default when unregistered and disables switching to sign-in', async () => {
    renderComponent();

    // Default heading is sign up
    expect(screen.getByRole('heading', { name: '注册 TimePulse 账号' })).toBeInTheDocument();
    expect(screen.getByText('TLS 加密认证')).toBeInTheDocument();
    expect(screen.getByLabelText('电子邮箱地址')).toBeInTheDocument();
    expect(screen.getByLabelText('设置登录密码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '注册账号' })).toBeInTheDocument();

    // Click disabled signin tab
    const signinTab = screen.getByRole('button', { name: /登录账号/ });
    expect(signinTab).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(signinTab);

    // It should not switch to signin, but show notice
    expect(await screen.findByText('要在注册账号之后，才允许切换到登录')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '注册 TimePulse 账号' })).toBeInTheDocument();
  });

  it('allows unlocking sign-in mode via direct account access when unregistered', async () => {
    renderComponent();

    const signinTab = screen.getByRole('button', { name: /登录账号/ });
    fireEvent.click(signinTab);

    const directSignInBtn = await screen.findByRole('button', { name: '已有账号？直接登录' });
    fireEvent.click(directSignInBtn);

    // Switched to signin mode
    expect(screen.getByRole('heading', { name: '登录 TimePulse' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '立即登录' })).toBeInTheDocument();
  });

  it('renders sign-in mode by default when registered and switches between modes', () => {
    localStorage.setItem('timepulse_has_registered', 'true');
    renderComponent();

    expect(screen.getByRole('heading', { name: '登录 TimePulse' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '立即登录' })).toBeInTheDocument();

    // Switch to Sign Up
    const signupTab = screen.getByRole('button', { name: '免费注册' });
    fireEvent.click(signupTab);

    expect(screen.getByRole('heading', { name: '注册 TimePulse 账号' })).toBeInTheDocument();
    expect(screen.getByLabelText(/个性称呼 \/ 昵称/)).toBeInTheDocument();
    expect(screen.getByLabelText('确认登录密码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '注册账号' })).toBeInTheDocument();

    // Switch to Sign In
    const signinTab = screen.getByRole('button', { name: '登录账号' });
    fireEvent.click(signinTab);
    expect(screen.getByRole('heading', { name: '登录 TimePulse' })).toBeInTheDocument();

    // Switch to Forgot Password
    const forgotBtn = screen.getByRole('button', { name: '忘记密码？' });
    fireEvent.click(forgotBtn);
    expect(screen.getByRole('heading', { name: '重置登录密码' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '发送重置密码邮件' })).toBeInTheDocument();
  });

  it('switches to signin mode after submitting registration', async () => {
    vi.spyOn(supabase.auth, 'signUp').mockResolvedValueOnce({
      data: {
        user: { id: 'usr-new-123', email: 'registered@timepulse.app' } as any,
        session: null,
      },
      error: null,
    });

    renderComponent();

    const emailInput = screen.getByLabelText('电子邮箱地址');
    const pwdInput = screen.getByLabelText('设置登录密码');
    const confirmInput = screen.getByLabelText('确认登录密码');

    fireEvent.change(emailInput, { target: { value: 'registered@timepulse.app' } });
    fireEvent.change(pwdInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });

    const submitBtn = screen.getByRole('button', { name: '注册账号' });
    fireEvent.click(submitBtn);

    // Wait for registration to complete and switch to sign in mode
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '登录 TimePulse' })).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByLabelText('电子邮箱地址')).toHaveValue('registered@timepulse.app');
    expect(localStorage.getItem('timepulse_has_registered')).toBe('true');
  });

  it('validates password mismatch on signup', async () => {
    renderComponent();

    const emailInput = screen.getByLabelText('电子邮箱地址');
    const pwdInput = screen.getByLabelText('设置登录密码');
    const confirmInput = screen.getByLabelText('确认登录密码');

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(pwdInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'different123' } });

    const submitBtn = screen.getByRole('button', { name: '注册账号' });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('两次输入的密码不一致，请核对')).toBeInTheDocument();
  });

  it('shows elegant field validation tooltips when submitting empty inputs and clears on input', async () => {
    localStorage.setItem('timepulse_has_registered', 'true');
    renderComponent();

    const submitBtn = screen.getByRole('button', { name: '立即登录' });
    fireEvent.click(submitBtn);

    // Both email and password empty tooltips appear
    expect(await screen.findByText('请填写电子邮箱地址')).toBeInTheDocument();
    expect(await screen.findByText('请输入登录密码')).toBeInTheDocument();

    const emailInput = screen.getByLabelText('电子邮箱地址');
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');

    // Type in email: email error should clear immediately
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    await waitFor(() => {
      expect(screen.queryByText('请填写电子邮箱地址')).not.toBeInTheDocument();
    });
    expect(emailInput).toHaveAttribute('aria-invalid', 'false');

    // Password error remains until filled
    expect(screen.getByText('请输入登录密码')).toBeInTheDocument();
    const pwdInput = screen.getByLabelText('登录密码');
    fireEvent.change(pwdInput, { target: { value: 'secret123' } });
    await waitFor(() => {
      expect(screen.queryByText('请输入登录密码')).not.toBeInTheDocument();
    });
  });

  it('renders user account view when already logged in', () => {
    useAuthStore.setState({
      user: {
        id: 'usr-999-abc',
        email: 'authenticated@timepulse.app',
        last_sign_in_at: new Date().toISOString(),
        user_metadata: { nickname: '时光守护者' },
      } as any,
    });

    renderComponent();

    expect(screen.getByText('时光守护者')).toBeInTheDocument();
    expect(screen.getByText('authenticated@timepulse.app')).toBeInTheDocument();
    expect(screen.getByText('已安全连接')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '退出当前账号' })).toBeInTheDocument();
  });

  it('allows configuring personal profile (nickname and motto) in account management view', async () => {
    const mockUser = {
      id: 'usr-999-abc',
      email: 'authenticated@timepulse.app',
      last_sign_in_at: new Date().toISOString(),
      user_metadata: { nickname: '时光守护者', custom_motto: '热爱专注每一秒' },
    };

    useAuthStore.setState({
      user: mockUser as any,
    });

    vi.spyOn(supabase.auth, 'updateUser').mockResolvedValueOnce({
      data: {
        user: {
          ...mockUser,
          user_metadata: { nickname: '极简专注者', custom_motto: '日日是好日' },
        } as any,
      },
      error: null,
    });

    renderComponent();

    const nicknameInput = screen.getByLabelText('你的称呼 / 昵称');
    const mottoInput = screen.getByLabelText('个性座右铭 / 专属签名');
    expect(nicknameInput).toHaveValue('时光守护者');
    expect(mottoInput).toHaveValue('热爱专注每一秒');

    fireEvent.change(nicknameInput, { target: { value: '极简专注者' } });
    fireEvent.change(mottoInput, { target: { value: '日日是好日' } });

    const saveButton = screen.getByRole('button', { name: /保存个人资料/ });
    fireEvent.click(saveButton);

    expect(await screen.findByText(/设置保存成功/)).toBeInTheDocument();
  });
});
