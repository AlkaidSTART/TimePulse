import { useEffect } from 'react';
import { useFullscreenStore } from '@/stores/useFullscreenStore';
import { useTimerStore } from '@/stores/useTimerStore';
import { getTimerType, type StopwatchTimer } from '@/domain/timer';

/**
 * 跨平台全局快捷键与交互优化（Windows 桌面环境 & Android 移动端）:
 * - F11: 切换全屏 / 沉浸模式（Windows / 桌面端通用标准按键）
 * - Escape: 优先退出全屏/沉浸模式
 * - Spacebar: 秒表计时页面下，非输入框聚焦时一键启动/暂停秒表
 * - Windows WebView2 阻止 Ctrl + 滚轮误缩放页面
 * - Tauri 生产环境屏蔽原生右键浏览器菜单，增强原生桌面软件质感
 */
export function usePlatformShortcuts() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // 1. F11: 全局全屏切换
      if (event.key === 'F11') {
        event.preventDefault();
        useFullscreenStore.getState().toggleFullscreen();
        return;
      }

      // 2. Escape: 退出全屏或沉浸模式
      if (event.key === 'Escape') {
        const { isFullscreen, isImmersive, toggleFullscreen } = useFullscreenStore.getState();
        if (isFullscreen || isImmersive) {
          event.preventDefault();
          toggleFullscreen();
          return;
        }
      }

      // 3. Space: 秒表快捷启停（仅当未聚焦于表单输入元素时生效）
      if (event.code === 'Space' || event.key === ' ') {
        const activeEl = document.activeElement;
        const isInputFocused =
          activeEl instanceof HTMLInputElement ||
          activeEl instanceof HTMLTextAreaElement ||
          activeEl instanceof HTMLSelectElement ||
          (activeEl as HTMLElement | null)?.isContentEditable;

        if (isInputFocused) return;

        const timerStore = useTimerStore.getState();
        const activeTimer = timerStore.timers.find((t) => t.id === timerStore.activeTimerId);
        if (activeTimer && getTimerType(activeTimer) === 'stopwatch') {
          event.preventDefault();
          const stopwatch = activeTimer as StopwatchTimer;
          const now = new Date();
          if (stopwatch.isRunning) {
            // 暂停秒表
            timerStore.updateTimer(stopwatch.id, {
              isRunning: false,
              pausedAt: now.toISOString(),
            });
          } else {
            // 启动或恢复秒表
            if (stopwatch.pausedAt) {
              const pausedDuration = now.getTime() - new Date(stopwatch.pausedAt).getTime();
              const newTotal = (stopwatch.totalPausedTime || 0) + pausedDuration;
              timerStore.updateTimer(stopwatch.id, {
                isRunning: true,
                pausedAt: null,
                totalPausedTime: newTotal,
              });
            } else {
              timerStore.updateTimer(stopwatch.id, {
                isRunning: true,
                startTime: now.toISOString(),
                totalPausedTime: 0,
                laps: [],
              });
            }
          }
        }
      }
    };

    // 4. Windows WebView2 阻止 Ctrl + 滚轮误触发页面缩放
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();
      }
    };

    // 5. Tauri 原生客户端中屏蔽生产环境默认浏览器上下文右键菜单
    const handleContextMenu = (event: MouseEvent) => {
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      if (isTauri && !import.meta.env.DEV) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);
}
