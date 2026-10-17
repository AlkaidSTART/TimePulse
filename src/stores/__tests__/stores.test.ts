import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useThemeStore,
  useBackgroundStore,
  useFullscreenStore,
  useNavigationStore,
  useTimerStore,
  useTodoStore,
  useUIStore,
} from '../index';
import { DEFAULT_BACKGROUND_SETTINGS, DEFAULT_FULLSCREEN_SETTINGS } from '@/domain/settings';

describe('Zustand Stores Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('useThemeStore', () => {
    it('initializes and toggles theme between light and cream', () => {
      const state = useThemeStore.getState();
      expect(state.theme).toBeDefined();

      state.setTheme('light');
      expect(useThemeStore.getState().theme).toBe('light');
      expect(localStorage.getItem('theme')).toBe('light');

      state.toggleTheme();
      expect(useThemeStore.getState().theme).toBe('cream');
      expect(localStorage.getItem('theme')).toBe('cream');
    });

    it('updates accent color and css variables', () => {
      const state = useThemeStore.getState();
      state.updateAccentColor('#ff0055');
      expect(useThemeStore.getState().accentColor).toBe('#ff0055');
      expect(localStorage.getItem('accent-color')).toBe('#ff0055');
    });
  });

  describe('useBackgroundStore', () => {
    it('updates background settings and syncs to localStorage', () => {
      const state = useBackgroundStore.getState();
      state.setBackgroundType('custom');
      expect(useBackgroundStore.getState().backgroundType).toBe('custom');

      state.setBgOpacity(0.8);
      expect(useBackgroundStore.getState().bgOpacity).toBe(0.8);

      state.setBlurAmount(12);
      expect(useBackgroundStore.getState().blurAmount).toBe(12);

      state.setBackgroundMode('contain');
      expect(useBackgroundStore.getState().backgroundMode).toBe('contain');

      const saved = JSON.parse(localStorage.getItem('timepulse_background_settings') || '{}');
      expect(saved.bgOpacity).toBe(0.8);
      expect(saved.blurAmount).toBe(12);
    });

    it('resets to defaults correctly', () => {
      const state = useBackgroundStore.getState();
      state.setBackgroundType('custom');
      state.resetToDefaults();
      expect(useBackgroundStore.getState().backgroundType).toBe(DEFAULT_BACKGROUND_SETTINGS.backgroundType);
      expect(useBackgroundStore.getState().bgOpacity).toBe(DEFAULT_BACKGROUND_SETTINGS.bgOpacity);
    });
  });

  describe('useFullscreenStore', () => {
    it('manages header visibility and font sizes', () => {
      const state = useFullscreenStore.getState();
      state.hideHeader();
      expect(useFullscreenStore.getState().isHeaderVisible).toBe(false);

      state.showHeader();
      expect(useFullscreenStore.getState().isHeaderVisible).toBe(true);

      state.setTimerFontSize('large');
      expect(useFullscreenStore.getState().timerFontSize).toBe('large');

      state.setLabelFontSize('small');
      expect(useFullscreenStore.getState().labelFontSize).toBe('small');

      state.setHeaderHideDelay(5000);
      expect(useFullscreenStore.getState().headerHideDelay).toBe(5000);
    });

    it('resets fullscreen settings to default', () => {
      const state = useFullscreenStore.getState();
      state.setHeaderHideDelay(9999);
      state.resetToDefaults();
      expect(useFullscreenStore.getState().headerHideDelay).toBe(DEFAULT_FULLSCREEN_SETTINGS.headerHideDelay);
    });
  });

  describe('useNavigationStore', () => {
    it('switches view and calculates direction', () => {
      const state = useNavigationStore.getState();
      state.setView('todo');
      expect(useNavigationStore.getState().view).toBe('todo');
      expect(useNavigationStore.getState().isTodo).toBe(true);
      expect(useNavigationStore.getState().direction).toBe(1);

      state.setView('main');
      expect(useNavigationStore.getState().view).toBe('main');
      expect(useNavigationStore.getState().isTodo).toBe(false);
      expect(useNavigationStore.getState().direction).toBe(-1);
    });
  });

  describe('useTimerStore', () => {
    it('adds, selects, updates and deletes a timer', () => {
      const state = useTimerStore.getState();
      const id = state.addTimer({
        name: '测试计时器',
        type: 'countdown',
        targetDate: Date.now() + 60000,
        color: '#10b981',
      });

      expect(typeof id).toBe('string');
      expect(useTimerStore.getState().timers.some((t) => t.id === id)).toBe(true);

      state.setActiveTimerId(id);
      expect(useTimerStore.getState().activeTimerId).toBe(id);
      expect(useTimerStore.getState().getActiveTimer()?.name).toBe('测试计时器');

      state.updateTimer(id, { name: '已重命名计时器' });
      expect(useTimerStore.getState().getActiveTimer()?.name).toBe('已重命名计时器');

      state.deleteTimer(id);
      expect(useTimerStore.getState().timers.some((t) => t.id === id)).toBe(false);
    });

    it('reorders timers properly', () => {
      const state = useTimerStore.getState();
      const id1 = state.addTimer({ name: 'A', type: 'countdown' });
      const id2 = state.addTimer({ name: 'B', type: 'countdown' });

      state.reorderTimers([id2, id1]);
      const timers = useTimerStore.getState().timers;
      const index1 = timers.findIndex((t) => t.id === id1);
      const index2 = timers.findIndex((t) => t.id === id2);
      expect(index2).toBeLessThan(index1);
    });
  });

  describe('useTodoStore', () => {
    it('adds todo items and toggles completion', () => {
      const state = useTodoStore.getState();
      state.addItem('Zustand 统一状态管理测试', 'todo');
      const item = useTodoStore.getState().items.find((i) => i.text === 'Zustand 统一状态管理测试');
      expect(item).toBeDefined();
      expect(item?.completed).toBe(false);

      if (item) {
        state.toggleItem(item.id);
        expect(useTodoStore.getState().items.find((i) => i.id === item.id)?.completed).toBe(true);

        state.updateItemText(item.id, '更新后的测试项');
        expect(useTodoStore.getState().items.find((i) => i.id === item.id)?.text).toBe('更新后的测试项');

        state.deleteItem(item.id);
        expect(useTodoStore.getState().items.some((i) => i.id === item.id)).toBe(false);
      }
    });

    it('updates widget visibility state', () => {
      const state = useTodoStore.getState();
      state.setWidgetEnabled(false);
      expect(useTodoStore.getState().isWidgetEnabled).toBe(false);

      state.setWidgetOpen(true);
      expect(useTodoStore.getState().isWidgetOpen).toBe(true);
    });
  });

  describe('useUIStore', () => {
    it('controls modal open states', () => {
      const state = useUIStore.getState();
      state.openBackgroundSettings();
      expect(useUIStore.getState().isBackgroundSettingsOpen).toBe(true);

      state.closeBackgroundSettings();
      expect(useUIStore.getState().isBackgroundSettingsOpen).toBe(false);

      state.openFullscreenSettings();
      expect(useUIStore.getState().isFullscreenSettingsOpen).toBe(true);

      state.closeAllModals();
      expect(useUIStore.getState().isFullscreenSettingsOpen).toBe(false);
      expect(useUIStore.getState().isBackgroundSettingsOpen).toBe(false);
    });
  });
});
