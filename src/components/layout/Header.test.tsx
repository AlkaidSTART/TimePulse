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
});
