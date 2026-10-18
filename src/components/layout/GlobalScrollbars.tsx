import { useEffect } from 'react';
import type { PartialOptions } from 'overlayscrollbars';
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
  instance: ReturnType<typeof import('overlayscrollbars').OverlayScrollbars> | null;
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

/**
 * 桌面非 Apple 环境才需要 OverlayScrollbars；模块与样式按需下载，
 * 移动端/触摸设备直接短路，零扫描、零样式重算、零额外字节。
 */
export default function GlobalScrollbars() {
  useEffect(() => {
    if (shouldUseNativeScrollbars()) return;

    let disposed = false;
    let dispose: (() => void) | null = null;

    void (async () => {
      // 动态引入库与样式：首屏不付这份成本（约 18KB gz JS + 3.5KB gz CSS）
      const [overlayScrollbars] = await Promise.all([
        import('overlayscrollbars'),
        import('overlayscrollbars/styles/overlayscrollbars.css'),
      ]);
      if (disposed) return;

      const { OverlayScrollbars } = overlayScrollbars;
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

        if (!hasOverflowHint(host)) return;

        const options = getScrollbarOptions(host);
        if (!options) return;

        host.dataset.timepulseScrollbar = 'true';

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

      dispose = () => {
        observer.disconnect();
        if (scanFrame) window.cancelAnimationFrame(scanFrame);
        if (cleanupFrame) window.cancelAnimationFrame(cleanupFrame);
        for (const [host, entry] of managed) {
          if (entry.owned) entry.instance?.destroy();
          delete host.dataset.timepulseScrollbar;
        }
        managed.clear();
      };
    })();

    return () => {
      disposed = true;
      dispose?.();
    };
  }, []);

  return null;
}
