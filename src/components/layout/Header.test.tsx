import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import Header from './Header';
import { TimerProvider } from '@/app/providers/TimerProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { FullscreenProvider } from '@/app/providers/FullscreenProvider';
import { useTimerStore } from '@/stores/useTimerStore';
import { useNavigationStore } from '@/stores/useNavigationStore';

describe('Header component timezone display', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    useNavigationStore.setState({ view: 'main', isTodo: false, direction: 1 });
  });

  afterEach(() => {
    cleanup();
  });

  it('displays the current timezone in the header bar for worldclock', () => {
    useTimerStore.setState({
      timers: [
        {
          id: 'test-shanghai',
          name: '本地时间',
          type: 'worldclock',
          timezone: 'Asia/Shanghai',
          city: '本地',
          country: '本地',
          color: '#0EA5E9',
          createdAt: new Date().toISOString(),
        },
      ],
      activeTimerId: 'test-shanghai',
      isLoaded: true,
    });

    render(
      <ThemeProvider>
        <FullscreenProvider>
          <TimerProvider>
            <Header />
          </TimerProvider>
        </FullscreenProvider>
      </ThemeProvider>,
    );

    // Header should contain timezone display
    const timezoneElements = screen.getAllByText(/本地 · Asia\/Shanghai/i);
    expect(timezoneElements.length).toBeGreaterThan(0);
  });

  it('does not display timezone badge when active timer is stopwatch', () => {
    useTimerStore.setState({
      timers: [
        {
          id: 'test-stopwatch',
          name: '秒表',
          type: 'stopwatch',
          startTime: null,
          isRunning: false,
          totalPausedTime: 0,
          laps: [],
          color: '#3B82F6',
          createdAt: new Date().toISOString(),
        },
      ],
      activeTimerId: 'test-stopwatch',
      isLoaded: true,
    });

    render(
      <ThemeProvider>
        <FullscreenProvider>
          <TimerProvider>
            <Header />
          </TimerProvider>
        </FullscreenProvider>
      </ThemeProvider>,
    );

    expect(screen.queryByText(/Asia\/Shanghai/i)).not.toBeInTheDocument();
  });

  it('renders list and settings buttons in the mobile top right header and navigates on click', async () => {
    const { fireEvent } = await import('@testing-library/react');
    useTimerStore.setState({
      timers: [
        {
          id: 'test-1',
          name: '专注计时',
          type: 'countdown',
          targetDate: new Date(Date.now() + 60000).toISOString(),
          timezone: 'Asia/Shanghai',
          color: '#0EA5E9',
          createdAt: new Date().toISOString(),
        },
      ],
      activeTimerId: 'test-1',
      isLoaded: true,
    });

    render(
      <ThemeProvider>
        <FullscreenProvider>
          <TimerProvider>
            <Header />
          </TimerProvider>
        </FullscreenProvider>
      </ThemeProvider>,
    );

    const listBtn = screen.getByRole('button', { name: '列表' });
    const settingsBtn = screen.getByRole('button', { name: '个人设置' });
    expect(listBtn).toBeDefined();
    expect(settingsBtn).toBeDefined();

    // Click list button opens all timers sheet
    fireEvent.click(listBtn);
    expect(screen.getByText('全部计时器')).toBeDefined();

    // Click settings button navigates to settings route
    fireEvent.click(settingsBtn);
    expect(useNavigationStore.getState().view).toBe('settings');
  });
});
