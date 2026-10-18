import { describe, it, expect, beforeEach } from 'vitest';
import { useNavigationStore } from '../useNavigationStore';

describe('useNavigationStore', () => {
  beforeEach(() => {
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
});
