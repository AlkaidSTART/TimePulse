import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import OAuthButtons from './OAuthButtons';
import { useAuthStore } from '@/stores/useAuthStore';

describe('OAuthButtons', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ isLoading: false, error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Google and GitHub buttons with divider', () => {
    render(<OAuthButtons />);

    expect(screen.getByRole('button', { name: /使用 Google 登录/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /使用 GitHub 登录/ })).toBeInTheDocument();
    expect(screen.getByText('或使用邮箱继续')).toBeInTheDocument();
  });

  it('calls signInWithOAuth with the matching provider on click', () => {
    const spy = vi.fn(async () => ({ success: true }));
    useAuthStore.setState({ signInWithOAuth: spy as never });

    render(<OAuthButtons />);
    fireEvent.click(screen.getByRole('button', { name: /使用 GitHub 登录/ }));

    expect(spy).toHaveBeenCalledWith('github');
  });

  it('disables buttons while loading', () => {
    useAuthStore.setState({ isLoading: true });

    render(<OAuthButtons />);

    expect(screen.getByRole('button', { name: /使用 Google 登录/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /使用 GitHub 登录/ })).toBeDisabled();
  });
});
