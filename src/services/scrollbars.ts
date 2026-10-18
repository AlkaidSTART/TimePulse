/**
 * 平台判定：Apple/Safari/Android/触摸设备使用原生滚动条，
 * 桌面非 Apple 环境才按需加载 OverlayScrollbars（见 GlobalScrollbars）。
 */
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
