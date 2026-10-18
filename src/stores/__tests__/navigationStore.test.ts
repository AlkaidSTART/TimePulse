import { describe, it, expect, beforeEach } from 'vitest';
import { useNavigationStore, canAccessView } from '../useNavigationStore';
import { useAuthStore } from '../useAuthStore';

describe('useNavigationStore', () => {
  beforeEach(() => {
    window.location.hash = '';
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      session: null,
      isInitialized: false,
    });
    useNavigationStore.getState().setView('cheer');
  });

  it('starts at cheer route by default', () => {
    const state = useNavigationStore.getState();
    expect(state.view).toBe('cheer');
    expect(state.isCheer).toBe(true);
  });

  it('navigates to main clock route with positive direction', () => {
    const { setView } = useNavigationStore.getState();
    setView('main');

    const state = useNavigationStore.getState();
    expect(state.view).toBe('main');
    expect(state.isMain).toBe(true);
    expect(state.direction).toBe(1);
  });

  it('navigates to settings route and calculates backward direction when returning to cheer', () => {
    const { setView } = useNavigationStore.getState();
    setView('settings');
    expect(useNavigationStore.getState().view).toBe('settings');
    expect(useNavigationStore.getState().direction).toBe(1);

    setView('cheer');
    expect(useNavigationStore.getState().view).toBe('cheer');
    expect(useNavigationStore.getState().direction).toBe(-1);
  });

  it('navigates to auth route correctly', () => {
    const { setView } = useNavigationStore.getState();
    setView('auth');
    expect(useNavigationStore.getState().view).toBe('auth');
    expect(useNavigationStore.getState().isAuth).toBe(true);
  });

  it('blocks transition to protected routes and redirects to auth when initialized and not logged in', () => {
    useAuthStore.setState({
      user: null,
      session: null,
      isInitialized: true,
    });

    expect(canAccessView('main')).toBe(false);
    expect(canAccessView('cheer')).toBe(false);
    expect(canAccessView('todo')).toBe(false);
    expect(canAccessView('settings')).toBe(false);
    expect(canAccessView('auth')).toBe(true);

    useNavigationStore.getState().transitionTo('main');
    expect(useNavigationStore.getState().view).toBe('auth');
    expect(window.location.hash).toBe('#register');
  });

  it('redirects to #login when initialized, not logged in, but previously registered', () => {
    localStorage.setItem('timepulse_has_registered', 'true');
    useAuthStore.setState({
      user: null,
      session: null,
      isInitialized: true,
    });

    useNavigationStore.getState().setView('cheer');
    useNavigationStore.getState().transitionTo('main');
    expect(useNavigationStore.getState().view).toBe('auth');
    expect(window.location.hash).toBe('#login');
    localStorage.removeItem('timepulse_has_registered');
  });

  it('allows transition to protected routes when user is authenticated', () => {
    useAuthStore.setState({
      user: { id: 'test-user-123', email: 'test@timepulse.app' } as any,
      session: {} as any,
      isInitialized: true,
    });

    expect(canAccessView('main')).toBe(true);
    useNavigationStore.getState().transitionTo('main');
    expect(useNavigationStore.getState().view).toBe('main');
    expect(window.location.hash).toBe('#main');
  });
});

