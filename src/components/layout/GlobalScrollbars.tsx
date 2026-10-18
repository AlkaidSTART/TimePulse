import { useEffect } from 'react';
import type { PartialOptions } from 'overlayscrollbars';
import { OverlayScrollbars } from 'overlayscrollbars';
import { shouldUseNativeScrollbars } from '@/services/scrollbars';

const SCROLLBAR_THEME = 'os-theme-timepulse';
const SCROLLABLE_CANDIDATE_SELECTOR = [
  '[class*="overflow-auto"]',
  '[class*="overflow-scroll"]',
  '[class*="overflow-x-auto"]',
  '[class*="overflow-y-auto"]',
  '[class*="overflow-x-scroll"]',
  '[class*="overflow-y-scroll"]',
  '[style*="overflow"]',
  '[data-timepulse-scrollbar]',
].join(',');

type ManagedScrollbar = {
  instance: ReturnType<typeof OverlayScrollbars> | null;
  owned: boolean;
};

/** 便宜的溢出判定：只查类名与内联样式，不触发样式重算 */
function hasOverflowHint(host: HTMLElement): boolean {
  const className = typeof host.className === 'string' ? host.className : '';
  const hasOverflowUtility = /overflow-(?:(?:x|y)-)?(?:auto|scroll)\b/.test(className);
  const hasInlineOverflow = [host.style.overflow, host.style.overflowX, host.style.overflowY]
    .some((value) => /^(auto|scroll|overlay)$/.test(value.trim()));
  return hasOverflowUtility || hasInlineOverflow;
}

/** 精确判定需要 getComputedStyle，仅在确实要挂载自定义滚动条时调用 */
function getScrollbarOptions(host: HTMLElement): PartialOptions | null {
  const style = window.getComputedStyle(host);
  if (style.position === 'fixed' || style.position === 'absolute') return null;

  const canScrollX = /^(auto|scroll|overlay)$/.test(style.overflowX);
  const canScrollY = /^(auto|scroll|overlay)$/.test(style.overflowY);

  if (!canScrollX && !canScrollY) return null;

  return {
    overflow: {
      x: canScrollX ? 'scroll' : 'hidden',
      y: canScrollY ? 'scroll' : 'hidden',
    },
    scrollbars: {
      theme: SCROLLBAR_THEME,
      autoHide: 'move',
      autoHideDelay: 420,
      autoHideSuspend: false,
    },
  };
}

function isOverlayScrollbarElement(element: HTMLElement): boolean {
  return (
    element.classList.contains('os-viewport') ||
    element.classList.contains('os-content') ||
    element.classList.contains('os-scrollbar')
  );
}

export default function GlobalScrollbars() {
  useEffect(() => {
    const nativeScrollbars = shouldUseNativeScrollbars();
    const managed = new Map<HTMLElement, ManagedScrollbar>();
    let scanFrame = 0;
    let cleanupFrame = 0;
    const addedNodes = new Set<Node>();
    const removedNodes = new Set<Node>();

    const manageHost = (host: HTMLElement) => {
      if (
        host === document.body ||
        host === document.documentElement ||
        isOverlayScrollbarElement(host) ||
        managed.has(host)
      ) {
        return;
      }

      // 类名/内联样式未声明溢出时不可能是滚动容器，直接跳过。
      // 原生滚动条模式到此结束：不再为轴判定触发 getComputedStyle（强制样式重算）。
      if (!hasOverflowHint(host)) return;

      host.dataset.timepulseScrollbar = 'true';
      if (nativeScrollbars) {
        managed.set(host, { instance: null, owned: false });
        return;
      }

      const options = getScrollbarOptions(host);
      if (!options) {
        delete host.dataset.timepulseScrollbar;
        return;
      }

      const existing = OverlayScrollbars(host);
      const instance = existing ?? OverlayScrollbars(host, options);
      if (existing) instance.options(options);
      managed.set(host, { instance, owned: !existing });
    };

    const scanSubtree = (node: Node) => {
      if (!(node instanceof Element)) return;
      if (node instanceof HTMLElement) manageHost(node);
      node.querySelectorAll<HTMLElement>(SCROLLABLE_CANDIDATE_SELECTOR).forEach(manageHost);
    };

    const disposeDetachedHosts = () => {
      cleanupFrame = 0;
      for (const node of removedNodes) {
        if (!(node instanceof Element)) continue;

        const hosts = [
          ...(node instanceof HTMLElement ? [node] : []),
          ...node.querySelectorAll<HTMLElement>(SCROLLABLE_CANDIDATE_SELECTOR),
        ];
        for (const host of hosts) {
          if (host.isConnected) continue;
          const entry = managed.get(host);
          if (!entry) continue;
          if (entry.owned) entry.instance?.destroy();
          delete host.dataset.timepulseScrollbar;
          managed.delete(host);
        }
      }
      removedNodes.clear();
    };

    const scheduleScan = () => {
      if (scanFrame) return;
      scanFrame = window.requestAnimationFrame(() => {
        scanFrame = 0;
        for (const node of addedNodes) scanSubtree(node);
        addedNodes.clear();
      });
    };

    const scheduleCleanup = () => {
      if (cleanupFrame) return;
      cleanupFrame = window.requestAnimationFrame(disposeDetachedHosts);
    };

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => addedNodes.add(node));
        record.removedNodes.forEach((node) => removedNodes.add(node));
      }
      if (addedNodes.size) scheduleScan();
      if (removedNodes.size) scheduleCleanup();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    scanSubtree(document.body);

    return () => {
      observer.disconnect();
      if (scanFrame) window.cancelAnimationFrame(scanFrame);
      if (cleanupFrame) window.cancelAnimationFrame(cleanupFrame);
      for (const [host, entry] of managed) {
        if (entry.owned) entry.instance?.destroy();
        delete host.dataset.timepulseScrollbar;
      }
      managed.clear();
    };
  }, []);

  return null;
}
