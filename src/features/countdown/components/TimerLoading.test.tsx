import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import TimerLoading from './TimerLoading';

describe('TimerLoading', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders minimalist loading animation with accessible status role', () => {
    render(<TimerLoading />);

    const loader = screen.getByTestId('timer-loading');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveAttribute('role', 'status');
    expect(loader).toHaveAttribute('aria-label', '正在加载时间');
  });

  it('applies custom color and text when provided', () => {
    render(<TimerLoading color="#10B981" text="加载中..." dataTestId="custom-loading" />);

    const loader = screen.getByTestId('custom-loading');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveAttribute('aria-label', '加载中...');
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });
});
