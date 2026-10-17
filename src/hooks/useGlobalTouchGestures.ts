import { useEffect, useRef } from 'react';
import { useNavigationStore, type PageView } from '@/stores/useNavigationStore';
import { useFullscreenStore } from '@/stores/useFullscreenStore';
import { triggerHaptic } from '@/services/vibration';

export interface UseGlobalTouchGesturesOptions {
  /** 是否启用手势系统（默认 true） */
  enabled?: boolean;
  /** 当前主页的计时器总数 */
  timersCount?: number;
  /** 当前激活计时器的索引下标 (0-indexed) */
  activeTimerIndex?: number;
  /** 切换到下一个计时器的回调 */
  onNextTimer?: () => void;
  /** 切换到上一个计时器的回调 */
  onPrevTimer?: () => void;
}

const PAGE_FLOW: PageView[] = ['cheer', 'main', 'todo', 'settings'];

/**
 * 判断触摸事件的目标元素是否为不应被滑动手势拦截的交互控件
 */
function shouldIgnoreTouchTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  // 1. 输入表单控件、链接、按钮、滑块
  const interactiveSelector = [
    'input',
    'textarea',
    'select',
    'button',
    'a',
    '[role="button"]',
    '[role="slider"]',
    '[role="dialog"]',
    '[role="menu"]',
    '[role="listbox"]',
    '[contenteditable="true"]',
    '[data-no-swipe]',
    '.react-colorful',
    '.liquid-droplet-button',
  ].join(',');

  if (target.closest(interactiveSelector)) {
    return true;
  }

  // 2. 检查是否有处于横向溢出滚动状态的容器
  let current: HTMLElement | null = target;
  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && current.scrollWidth > current.clientWidth + 10) {
      return true;
    }
    current = current.parentElement;
  }

  return false;
}

/**
 * 全局移动端触摸手势 Hook
 * 1. 左右滑动切换全局 Tab / 主页面 (cheer <-> main <-> todo <-> settings)
 * 2. 主页面内计时器左右滑动切换，且在边界或边缘滑动时自然过渡到相邻页面
 * 3. 全屏模式下从顶部/上半部向下滑动退出全屏
 * 4. 双击屏幕空白区或时钟区域快速切换全屏沉浸模式
 * 5. 全流程无缝配合触感振动反馈 (Tauri 原生 Haptics + Web API 双层兜底)
 */
export function useGlobalTouchGestures({
  enabled = true,
  timersCount = 0,
  activeTimerIndex = 0,
  onNextTimer,
  onPrevTimer,
}: UseGlobalTouchGesturesOptions = {}) {
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const isTargetIgnoredRef = useRef<boolean>(false);

  // 记录最近一次 Tap，用于识别 Double-Tap（双击全屏）
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  // 保持最新回调引用的 Ref，避免重新绑定监听器
  const propsRef = useRef({
    timersCount,
    activeTimerIndex,
    onNextTimer,
    onPrevTimer,
  });

  useEffect(() => {
    propsRef.current = {
      timersCount,
      activeTimerIndex,
      onNextTimer,
      onPrevTimer,
    };
  }, [timersCount, activeTimerIndex, onNextTimer, onPrevTimer]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleTouchStart = (e: TouchEvent) => {
      // 忽略多指触控
      if (e.touches.length !== 1) {
        startXRef.current = null;
        startYRef.current = null;
        return;
      }

      const touch = e.touches[0];
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      startTimeRef.current = Date.now();
      isTargetIgnoredRef.current = shouldIgnoreTouchTarget(e.target);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (startXRef.current === null || startYRef.current === null) return;
      if (e.changedTouches.length !== 1) return;

      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const deltaX = endX - startXRef.current;
      const deltaY = endY - startYRef.current;
      const elapsedTime = Date.now() - startTimeRef.current;

      const startX = startXRef.current;
      const startY = startYRef.current;
      const isTargetIgnored = isTargetIgnoredRef.current;

      // 清理当前 touch 状态
      startXRef.current = null;
      startYRef.current = null;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      const navState = useNavigationStore.getState();
      const currentView = navState.view;
      const fullscreenState = useFullscreenStore.getState();
      const isFullscreen = fullscreenState.isFullscreen;

      // ==========================================
      // 1. 双击全屏检测 (Double Tap Detection)
      // ==========================================
      const isTap = absX < 16 && absY < 16 && elapsedTime < 280;
      if (isTap && !isTargetIgnored) {
        const now = Date.now();
        const prevTap = lastTapRef.current;

        if (prevTap && now - prevTap.time < 320 && Math.hypot(endX - prevTap.x, endY - prevTap.y) < 32) {
          // 双击命中！触发全屏沉浸切换
          lastTapRef.current = null;
          fullscreenState.toggleFullscreen();
          void triggerHaptic('page_switch');
          return;
        }

        lastTapRef.current = { time: now, x: endX, y: endY };
      } else if (!isTap) {
        lastTapRef.current = null;
      }

      // 如果目标元素被标记为可交互控件（输入框、滚动条等），不进行滑动手势处理
      if (isTargetIgnored) return;

      // ==========================================
      // 2. 全屏状态下下拉退出手势 (Pull down to exit)
      // ==========================================
      if (isFullscreen && deltaY >= 65 && deltaY >= absX * 1.5 && elapsedTime < 450) {
        // 在上半屏或下拉动作明显时触发退出全屏
        if (startY < window.innerHeight * 0.7) {
          fullscreenState.toggleFullscreen();
          void triggerHaptic('page_switch');
          return;
        }
      }

      // ==========================================
      // 3. 水平滑动手势 (Horizontal Swipe)
      // ==========================================
      const isHorizontalSwipe = absX >= 52 && absX >= absY * 1.5 && elapsedTime < 480;
      if (!isHorizontalSwipe) return;

      const { timersCount: totalTimers, activeTimerIndex: curIdx, onNextTimer: nextTimer, onPrevTimer: prevTimer } = propsRef.current;

      // 屏幕边缘轻扫 (Edge Swipe，距屏幕边缘 <= 36px)
      const isLeftEdge = startX <= 36;
      const isRightEdge = startX >= window.innerWidth - 36;

      if (currentView === 'main') {
        if (deltaX < 0) {
          // 向左划 -> 前往右侧（下一项）
          if (!isRightEdge && totalTimers > 1 && curIdx < totalTimers - 1) {
            // 切换到下一个计时器
            nextTimer?.();
            void triggerHaptic('timer_switch');
          } else {
            // 已经是最后一个计时器，或者从右边缘滑动，或者单只计时器 -> 切换至待办页面
            navState.transitionTo('todo');
            void triggerHaptic('page_switch');
          }
        } else {
          // 向右划 -> 前往左侧（上一项）
          if (!isLeftEdge && totalTimers > 1 && curIdx > 0) {
            // 切换到上一个计时器
            prevTimer?.();
            void triggerHaptic('timer_switch');
          } else {
            // 已经是第一个计时器，或者从左边缘滑动，或者单只计时器 -> 切换至打气页面
            navState.transitionTo('cheer');
            void triggerHaptic('page_switch');
          }
        }
        return;
      }

      // 非 main 页面的全局路由页面滑动
      const curPageIdx = PAGE_FLOW.indexOf(currentView);
      if (curPageIdx === -1) return;

      if (deltaX < 0) {
        // 向左滑 -> 切换到下一页
        if (curPageIdx < PAGE_FLOW.length - 1) {
          const nextView = PAGE_FLOW[curPageIdx + 1];
          navState.transitionTo(nextView);
          void triggerHaptic('page_switch');
        }
      } else {
        // 向右滑 -> 切换到上一页
        if (curPageIdx > 0) {
          const prevView = PAGE_FLOW[curPageIdx - 1];
          navState.transitionTo(prevView);
          void triggerHaptic('page_switch');
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled]);
}

export default useGlobalTouchGestures;
