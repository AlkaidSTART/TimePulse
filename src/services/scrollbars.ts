import { OverlayScrollbars } from 'overlayscrollbars';

export function shouldUseNativeScrollbars(): boolean {
  if (typeof navigator === 'undefined') return false;

  const userAgentData = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData;
  const platform = userAgentData?.platform || navigator.platform || '';
  const userAgent = navigator.userAgent || '';
  const vendor = navigator.vendor || '';
  const isApplePlatform =
    /Mac|iPhone|iPad|iPod/i.test(platform) ||
    /iPhone|iPad|iPod/i.test(userAgent);
  const isSafari =
    /Safari/i.test(userAgent) &&
    /Apple/i.test(vendor) &&
    !/Android|Chrome|Chromium|CriOS|FxiOS|Edg|OPR|Opera/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isTouchDevice =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || ((navigator.maxTouchPoints || 0) > 0));

  return isApplePlatform || isSafari || isAndroid || isTouchDevice;
}

export function getScrollViewport(host: HTMLElement | null): HTMLElement | null {
  if (!host) return null;

  return (
    (OverlayScrollbars(host)?.elements().viewport as HTMLElement | undefined) ??
    host
  );
}
