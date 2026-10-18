import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import AuthPage from './AuthPage';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { useAuthStore } from '@/stores/useAuthStore';

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
  });

  afterEach(() => {
    cleanup();
  });

  const renderComponent = () => {
    return render(
      <ThemeProvider>
        <AuthPage />
      </ThemeProvider>
    );
  };

  it('renders sign-in mode by default', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: '登录 TimePulse' })).toBeInTheDocument();
    expect(screen.getByText('TLS 加密认证')).toBeInTheDocument();
    expect(screen.getByLabelText('电子邮箱地址')).toBeInTheDocument();
    expect(screen.getByLabelText('登录密码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '立即登录' })).toBeInTheDocument();
  });

  it('switches between signin, signup, and forgot modes', () => {
    renderComponent();

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

  it('validates password mismatch on signup', async () => {
    renderComponent();

    const signupTab = screen.getByRole('button', { name: '免费注册' });
    fireEvent.click(signupTab);

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
});
