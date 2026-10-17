import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import TimerDisplay from './TimerDisplay';
import { TimerProvider } from '@/app/providers/TimerProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { FullscreenProvider } from '@/app/providers/FullscreenProvider';
import { useTimerStore } from '@/stores/useTimerStore';

describe('TimerDisplay component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not render title or description (such as "本地 - Asia/Shanghai") when active timer is a worldclock', async () => {
    useTimerStore.setState({
      timers: [
        {
          id: 'test-worldclock',
          name: '本地时间',
          type: 'worldclock',
          timezone: 'Asia/Shanghai',
          city: '本地',
          country: '本地',
          color: '#0EA5E9',
          createdAt: new Date().toISOString(),
        },
      ],
      activeTimerId: 'test-worldclock',
      isLoaded: true,
    });

    render(
      <ThemeProvider>
        <FullscreenProvider>
          <TimerProvider>
            <TimerDisplay />
          </TimerProvider>
        </FullscreenProvider>
      </ThemeProvider>,
    );

    // Title should not be rendered for worldclock
    expect(screen.queryByRole('heading', { level: 2, hidden: true })).not.toBeInTheDocument();

    // "本地 - Asia/Shanghai" should not be rendered anywhere in TimerDisplay
    expect(screen.queryByText(/本地 - Asia\/Shanghai/i)).not.toBeInTheDocument();
  });

  it('renders title when active timer is countdown', () => {
    useTimerStore.setState({
      timers: [
        {
          id: 'test-countdown',
          name: '考研倒计时',
          type: 'countdown',
          targetDate: new Date(Date.now() + 86400000).toISOString(),
          timezone: 'Asia/Shanghai',
          color: '#10B981',
          createdAt: new Date().toISOString(),
        },
      ],
      activeTimerId: 'test-countdown',
      isLoaded: true,
    });

    render(
      <ThemeProvider>
        <FullscreenProvider>
          <TimerProvider>
            <TimerDisplay />
          </TimerProvider>
        </FullscreenProvider>
      </ThemeProvider>,
    );

    expect(screen.getByRole('heading', { level: 2, name: '考研倒计时', hidden: true })).toBeInTheDocument();
  });

  it('renders loading animation while timer display is not yet visible', () => {
    useTimerStore.setState({
      timers: [
        {
          id: 'test-worldclock',
          name: '本地时间',
          type: 'worldclock',
          timezone: 'Asia/Shanghai',
          city: '本地',
          country: '本地',
          color: '#0EA5E9',
          createdAt: new Date().toISOString(),
        },
      ],
      activeTimerId: 'test-worldclock',
      isLoaded: true,
    });

    render(
      <ThemeProvider>
        <FullscreenProvider>
          <TimerProvider>
            <TimerDisplay />
          </TimerProvider>
        </FullscreenProvider>
      </ThemeProvider>,
    );

    expect(screen.getByTestId('timer-loading')).toBeInTheDocument();
  });
});

