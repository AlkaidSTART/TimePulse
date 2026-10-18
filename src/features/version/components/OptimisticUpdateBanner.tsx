import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiArrowUpCircle, FiExternalLink, FiX } from 'react-icons/fi';
import { useVersionStore } from '@/stores/useVersionStore';
import { useTranslation } from '@/i18n/useTranslation';
import { GITHUB_RELEASES_URL } from '@/constants/version';

export default function OptimisticUpdateBanner() {
  const { t } = useTranslation();
  const isBannerVisible = useVersionStore((s) => s.isBannerVisible);
  const latestVersion = useVersionStore((s) => s.latestVersion);
  const downloadUrl = useVersionStore((s) => s.downloadUrl);
  const dismissBanner = useVersionStore((s) => s.dismissBanner);
  const checkUpdate = useVersionStore((s) => s.checkUpdate);

  // 应用初始化加载后延迟检查更新（避免与首屏加载、倒计时动画争抢资源）
  useEffect(() => {
    const timer = setTimeout(() => {
      checkUpdate({ manual: false });
    }, 2200);

    return () => clearTimeout(timer);
  }, [checkUpdate]);

  const handleOpenDownload = () => {
    const targetUrl = downloadUrl || GITHUB_RELEASES_URL;
    if (typeof window !== 'undefined') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
    // 用户点击后关闭浮窗（只提醒一次）
    dismissBanner();
  };

  return (
    <AnimatePresence>
      {isBannerVisible && (
        <motion.aside
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[450] w-[calc(100vw-2rem)] sm:w-96 rounded-2xl border border-white/30 dark:border-white/15 bg-white/85 dark:bg-neutral-900/90 p-4 shadow-2xl backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-amber-500 text-white shadow-md shadow-primary-500/25">
                <FiArrowUpCircle className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="truncate text-sm font-bold text-gray-900 dark:text-white">
                    {t('version.newVersionFound', '发现新版本')}
                  </h4>
                  {latestVersion && (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-primary-500/15 px-2 py-0.5 text-[11px] font-semibold text-primary-600 dark:text-primary-300">
                      v{latestVersion}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {t('version.remindOnceNote', '本版本仅乐观提醒一次')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={dismissBanner}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-black/5 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-200 transition-colors"
              aria-label={t('common.close', '关闭')}
            >
              <FiX className="size-4" />
            </button>
          </div>

          {/* Description */}
          <p className="mt-2.5 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            {t(
              'version.optimisticPrompt',
              'TimePulse 全新版本现已就绪，欢迎前往下载体验更多新特性与优化！'
            )}
          </p>

          {/* Actions */}
          <div className="mt-3.5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={dismissBanner}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              {t('version.dismiss', '知道了')}
            </button>

            <button
              type="button"
              onClick={handleOpenDownload}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-primary-500 to-amber-500 text-white text-xs font-semibold shadow-md shadow-primary-500/25 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
            >
              <span>{t('version.goToDownload', '前往下载')}</span>
              <FiExternalLink className="size-3.5" />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
