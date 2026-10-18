import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import PersonalSettingsPage from './PersonalSettingsPage';
import { ThemeProvider } from '@/app/providers/ThemeProvider';

describe('PersonalSettingsPage component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderComponent = () => {
    return render(
      <ThemeProvider>
        <PersonalSettingsPage />
      </ThemeProvider>,
    );
  };

  it('renders with personal-settings-page responsive class and settings data-page-view', () => {
    const { container } = renderComponent();
    const pageEl = container.querySelector('[data-page-view="settings"]');
    expect(pageEl).toBeInTheDocument();
    expect(pageEl).toHaveClass('personal-settings-page');
    expect(pageEl).toHaveStyle({
      paddingTop: 'var(--settings-pt, max(4.5rem, calc(3.75rem + env(safe-area-inset-top, 0px))))',
    });
  });

  it('renders title, back button, and settings sections', () => {
    renderComponent();

    const headings = screen.getAllByRole('heading', { name: /个人设置中心/ });
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('定制主题外观、语言偏好与系统设置')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '恢复默认' })).toBeInTheDocument();
    expect(screen.queryByText('选择专注风格标签')).not.toBeInTheDocument();
  });

  it('does not render duplicate nickname/motto profile inputs in personal settings', () => {
    renderComponent();

    expect(screen.queryByText('个人称谓与签名')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('你的称呼 / 昵称')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('个性座右铭 / 专属签名')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '立即登录 / 注册' })).toBeInTheDocument();
  });
});
