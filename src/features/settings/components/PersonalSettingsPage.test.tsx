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
    expect(screen.getByText('定制你的称呼、专属座右铭与主题外观')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '恢复默认' })).toBeInTheDocument();
  });

  it('allows editing nickname and motto, and shows save toast', () => {
    renderComponent();

    const nicknameInput = screen.getAllByLabelText('你的称呼 / 昵称')[0];
    fireEvent.change(nicknameInput, { target: { value: '测试昵称' } });
    expect(nicknameInput).toHaveValue('测试昵称');

    const saveButton = screen.getByRole('button', { name: '保存个人资料' });
    fireEvent.click(saveButton);

    expect(screen.getByText('设置保存成功！个人资料已实时同步更新。')).toBeInTheDocument();
  });
});
