import { render, screen, cleanup, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ProgressSubmitButton } from './ProgressSubmitButton';
import { FiArrowRight } from 'react-icons/fi';

describe('ProgressSubmitButton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders idle state with accessible label and icon', () => {
    render(
      <ProgressSubmitButton
        status="idle"
        idleText="立即登录"
        icon={<FiArrowRight data-testid="arrow-icon" />}
      />
    );

    const button = screen.getByRole('button', { name: '立即登录' });
    expect(button).toBeInTheDocument();
    expect(screen.getByTestId('arrow-icon')).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('renders loading state and disables interaction', () => {
    render(
      <ProgressSubmitButton
        status="loading"
        idleText="立即登录"
        loadingText="正在验证..."
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('正在验证...');
  });

  it('renders success state and invokes onSuccessComplete after successDuration', () => {
    const handleComplete = vi.fn();

    render(
      <ProgressSubmitButton
        status="success"
        idleText="立即登录"
        successText="登录成功"
        successDuration={1000}
        onSuccessComplete={handleComplete}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('登录成功');

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(handleComplete).toHaveBeenCalledTimes(1);
  });

  it('supports custom accent color and handles invalid color safely', () => {
    const { rerender } = render(
      <ProgressSubmitButton
        status="idle"
        accentColor="#10B981"
        idleText="立即登录"
      />
    );
    expect(screen.getByRole('button', { name: '立即登录' })).toBeInTheDocument();

    // Rerender with invalid color string, should fallback safely
    rerender(
      <ProgressSubmitButton
        status="idle"
        accentColor="invalid-hex"
        idleText="立即登录"
      />
    );
    expect(screen.getByRole('button', { name: '立即登录' })).toBeInTheDocument();
  });

  it('supports fresh apricot orange progressColor configuration', () => {
    render(
      <ProgressSubmitButton
        status="loading"
        progressColor="#FB923C"
        idleText="立即登录"
        loadingText="正在验证..."
      />
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('正在验证...');
  });

  it('supports dynamic loading animation types (wave-dots, spinner, orbit, ripple, pulse-bars)', () => {
    const { rerender } = render(
      <ProgressSubmitButton
        status="loading"
        idleText="立即登录"
        loadingText="正在验证..."
      />
    );
    // Defaults to wave-dots
    expect(screen.getByRole('button')).toHaveTextContent('正在验证...');

    rerender(
      <ProgressSubmitButton
        status="loading"
        loadingAnimation="wave-dots"
        idleText="立即登录"
        loadingText="正在验证..."
      />
    );
    expect(screen.getByRole('button')).toHaveTextContent('正在验证...');

    rerender(
      <ProgressSubmitButton
        status="loading"
        loadingAnimation="spinner"
        idleText="立即登录"
        loadingText="正在验证..."
      />
    );
    expect(screen.getByRole('button')).toHaveTextContent('正在验证...');

    rerender(
      <ProgressSubmitButton
        status="loading"
        loadingAnimation="orbit"
        idleText="立即登录"
        loadingText="正在验证..."
      />
    );
    expect(screen.getByRole('button')).toHaveTextContent('正在验证...');

    rerender(
      <ProgressSubmitButton
        status="loading"
        loadingAnimation="ripple"
        idleText="立即登录"
        loadingText="正在验证..."
      />
    );
    expect(screen.getByRole('button')).toHaveTextContent('正在验证...');

    rerender(
      <ProgressSubmitButton
        status="loading"
        loadingAnimation="pulse-bars"
        idleText="立即登录"
        loadingText="正在验证..."
      />
    );
    expect(screen.getByRole('button')).toHaveTextContent('正在验证...');
  });
});
