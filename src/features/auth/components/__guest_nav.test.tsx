import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import AuthPage from './AuthPage';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNavigationStore } from '@/stores/useNavigationStore';

describe('guest nav repro', () => {
  beforeEach(() => {
    window.location.hash = '#register';
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      session: null,
      isGuest: false,
      isLoading: false,
      isInitialized: true,
      error: null,
      successMessage: null,
      isAuthModalOpen: false,
    });
    useNavigationStore.getState().setView('auth');
  });

  afterEach(() => {
    cleanup();
  });

  it('navigates to main after guest login', async () => {
    render(
      <ThemeProvider>
        <AuthPage />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /游客登录/ }));

    await waitFor(() => expect(useNavigationStore.getState().view).toBe('main'));
  });

  it('navigates to main even when the current view is not auth (e.g. cold start on #main)', async () => {
    useNavigationStore.getState().setView('cheer');

    render(
      <ThemeProvider>
        <AuthPage />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /游客登录/ }));

    await waitFor(() => expect(useNavigationStore.getState().view).toBe('main'));
  });
});
