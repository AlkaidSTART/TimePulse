import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import WebDock from './WebDock';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { FullscreenProvider } from '@/app/providers/FullscreenProvider';
import { PageTransitionProvider } from '@/hooks/usePageTransition';
import { TimerProvider } from '@/app/providers/TimerProvider';

describe('WebDock component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderWithProviders = (props = {}) => {
    return render(
      <ThemeProvider>
        <FullscreenProvider>
          <PageTransitionProvider>
            <TimerProvider>
              <WebDock {...props} />
            </TimerProvider>
          </PageTransitionProvider>
        </FullscreenProvider>
      </ThemeProvider>
    );
  };

  it('renders web dock items properly', () => {
    renderWithProviders();

    expect(screen.getByRole('button', { name: /^(主计时器|计时器|当前时间与时钟)$/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^待办清单$/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^(新建计时器|新建)$/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^(管理全部计时器|计时器列表)$/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^(背景与壁纸|背景设置)$/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /更新日志|版本/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^(分享与二维码|分享)$/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /全屏/i })).toBeDefined();
  });

  it('triggers onOpenAdd callback when clicking New Timer', () => {
    const onOpenAdd = vi.fn();
    renderWithProviders({ onOpenAdd });

    const addButton = screen.getByRole('button', { name: /^(新建计时器|新建)$/i });
    fireEvent.click(addButton);

    expect(onOpenAdd).toHaveBeenCalledTimes(1);
  });

  it('triggers onOpenManage callback when clicking Manage Timers', () => {
    const onOpenManage = vi.fn();
    renderWithProviders({ onOpenManage });

    const manageButton = screen.getByRole('button', { name: /^(管理全部计时器|计时器列表)$/i });
    fireEvent.click(manageButton);

    expect(onOpenManage).toHaveBeenCalledTimes(1);
  });

  it('triggers onOpenBackground callback when clicking Background', () => {
    const onOpenBackground = vi.fn();
    renderWithProviders({ onOpenBackground });

    const bgButton = screen.getByRole('button', { name: /^(背景与壁纸|背景设置)$/i });
    fireEvent.click(bgButton);

    expect(onOpenBackground).toHaveBeenCalledTimes(1);
  });

  it('triggers onOpenShare callback when clicking Share', () => {
    const onOpenShare = vi.fn();
    renderWithProviders({ onOpenShare });

    const shareButton = screen.getByRole('button', { name: /^(分享与二维码|分享)$/i });
    fireEvent.click(shareButton);

    expect(onOpenShare).toHaveBeenCalledTimes(1);
  });
});
