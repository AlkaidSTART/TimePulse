import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import MobileTabBar from './MobileTabBar';
import { ThemeProvider } from '@/app/providers/ThemeProvider';

describe('MobileTabBar component', () => {
  const defaultProps = {
    activeTab: 'timer' as const,
    onTabChange: vi.fn(),
    timers: [
      {
        id: 'timer-1',
        name: '工作倒计时',
        type: 'countdown' as const,
        targetDate: new Date(Date.now() + 60000).toISOString(),
        timezone: 'Asia/Shanghai',
        color: '#0EA5E9',
        createdAt: new Date().toISOString(),
      },
    ],
    activeTimerId: 'timer-1',
    setActiveTimerId: vi.fn(),
    onOpenAdd: vi.fn(),
    onOpenBackground: vi.fn(),
    onOpenFullscreenSettings: vi.fn(),
    onOpenShare: vi.fn(),
    theme: 'light' as const,
    toggleTheme: vi.fn(),
    isFullscreen: false,
    toggleFullscreen: vi.fn(),
    accentColor: '#0EA5E9',
    isVisible: true,
    deleteTimer: vi.fn(),
    updateTimer: vi.fn(),
    reorderTimers: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all tab navigation items', () => {
    render(
      <ThemeProvider>
        <MobileTabBar {...defaultProps} />
      </ThemeProvider>,
    );

    expect(screen.getByText(/计时/i)).toBeDefined();
    expect(screen.getByText(/待办/i)).toBeDefined();
    expect(screen.getByText(/列表/i)).toBeDefined();
    expect(screen.getByText(/设置/i)).toBeDefined();
  });

  it('renders transparent liquid water droplet capsule indicator for active route without blue', () => {
    const { container } = render(
      <ThemeProvider>
        <MobileTabBar {...defaultProps} activeTab="timer" />
      </ThemeProvider>,
    );

    const dropletIndicator = container.querySelector('.liquid-droplet-pill');
    expect(dropletIndicator).not.toBeNull();
    // Indicator is styled by liquid-droplet-pill class rather than hardcoded solid blue background
    expect((dropletIndicator as HTMLElement).style.backgroundColor).toBe('');

    // Active tab label has zero blue inline styling
    const activeLabel = screen.getByText('计时');
    expect(activeLabel.style.color).toBe('');
    expect(activeLabel.className).toContain('text-gray-950');
  });

  it('renders convex lens dome reflection and meniscus surface tension line in water droplet indicator', () => {
    const { container } = render(
      <ThemeProvider>
        <MobileTabBar {...defaultProps} activeTab="timer" />
      </ThemeProvider>,
    );

    const droplet = container.querySelector('.liquid-droplet-pill');
    expect(droplet).not.toBeNull();
    expect(droplet?.children.length).toBeGreaterThanOrEqual(2);
  });

  it('synchronizes Mobile and Pad layout by using lg:hidden on nav container', () => {
    const { container } = render(
      <ThemeProvider>
        <MobileTabBar {...defaultProps} />
      </ThemeProvider>,
    );

    const nav = container.querySelector('nav');
    expect(nav?.className).toContain('lg:hidden');
  });

  it('renders center action + button as transparent liquid droplet without blue background', () => {
    render(
      <ThemeProvider>
        <MobileTabBar {...defaultProps} />
      </ThemeProvider>,
    );

    const addButton = screen.getByLabelText('新建计时器');
    expect(addButton).not.toBeNull();
    expect(addButton.className).toContain('liquid-droplet-button');
    expect(addButton.style.backgroundColor).toBe('');
  });

  it('renders settings and functions bottom sheet in single-screen layout when activeTab is settings', () => {
    render(
      <ThemeProvider>
        <MobileTabBar {...defaultProps} activeTab="settings" />
      </ThemeProvider>,
    );

    // Sheet title
    expect(screen.getByText('设置与功能')).toBeDefined();

    // Quick control cards
    expect(screen.getByText(/米白/i)).toBeDefined();
    expect(screen.getByText(/全屏/i)).toBeDefined();
    expect(screen.getByText(/挂件/i)).toBeDefined();
    expect(screen.getByText(/语言/i)).toBeDefined();

    // Features and services
    expect(screen.getByText(/背景壁纸/i)).toBeDefined();
    expect(screen.getByText(/待办清单/i)).toBeDefined();
    expect(screen.getByText(/分享与二维码/i)).toBeDefined();
    expect(screen.getByText(/版本与更新/i)).toBeDefined();
  });

  it('triggers toggleTheme when theme card is clicked in settings', () => {
    render(
      <ThemeProvider>
        <MobileTabBar {...defaultProps} activeTab="settings" />
      </ThemeProvider>,
    );

    const themeCard = screen.getByText(/米白/i).closest('button');
    expect(themeCard).not.toBeNull();
    fireEvent.click(themeCard!);

    expect(defaultProps.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('renders theme palette library button in settings sheet', () => {
    render(
      <ThemeProvider>
        <MobileTabBar {...defaultProps} activeTab="settings" />
      </ThemeProvider>,
    );

    expect(screen.getByText(/字体配色/i)).toBeDefined();
  });
});

