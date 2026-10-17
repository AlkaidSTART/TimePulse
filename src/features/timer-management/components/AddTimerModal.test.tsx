import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import TimerTypeModal from './TimerTypeModal';
import AddTimerModal from './AddTimerModal';
import { TimerProvider } from '@/app/providers/TimerProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';

describe('Timer creation and types', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders both short-term and long-term countdown options in TimerTypeModal', () => {
    const onSelectType = vi.fn();
    const onClose = vi.fn();

    render(
      <TimerTypeModal embedded onClose={onClose} onSelectType={onSelectType} />
    );

    expect(screen.getByText('短期倒计时')).toBeInTheDocument();
    expect(screen.getByText('长期倒计时')).toBeInTheDocument();
    expect(screen.getByText('正计时器')).toBeInTheDocument();
    expect(screen.getByText('世界时间')).toBeInTheDocument();

    fireEvent.click(screen.getByText('短期倒计时'));
    expect(onSelectType).toHaveBeenCalledWith('countdown-short');

    fireEvent.click(screen.getByText('长期倒计时'));
    expect(onSelectType).toHaveBeenCalledWith('countdown-long');
  });

  it('renders short-term countdown interface by default with duration inputs and presets', () => {
    const onClose = vi.fn();

    render(
      <ThemeProvider>
        <TimerProvider>
          <AddTimerModal embedded initialMode="short" onClose={onClose} />
        </TimerProvider>
      </ThemeProvider>
    );

    // Header and mode tabs
    expect(screen.getByRole('heading', { name: '创建短期倒计时' })).toBeInTheDocument();
    expect(screen.getByText('短期倒计时')).toBeInTheDocument();
    expect(screen.getByText('长期倒计时')).toBeInTheDocument();

    // Duration units
    expect(screen.getByText('小时')).toBeInTheDocument();
    expect(screen.getByText('分钟')).toBeInTheDocument();
    expect(screen.getByText('秒')).toBeInTheDocument();

    // Quick presets
    expect(screen.getByText('25分钟')).toBeInTheDocument();
    expect(screen.getByText('+5分')).toBeInTheDocument();
    expect(screen.getByText('清空')).toBeInTheDocument();
  });

  it('switches to long-term countdown mode when clicking longTab', () => {
    const onClose = vi.fn();

    render(
      <ThemeProvider>
        <TimerProvider>
          <AddTimerModal embedded initialMode="short" onClose={onClose} />
        </TimerProvider>
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /长期倒计时/ }));

    expect(screen.getByRole('heading', { name: '创建长期倒计时' })).toBeInTheDocument();
    expect(screen.getByText('选择常用节假日')).toBeInTheDocument();
    expect(screen.getByText('目标日期')).toBeInTheDocument();
    expect(screen.getByText('目标时间')).toBeInTheDocument();
  });
});
