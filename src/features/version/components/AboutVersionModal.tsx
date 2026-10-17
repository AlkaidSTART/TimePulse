import { motion } from 'framer-motion';
import {
  FiX,
  FiRefreshCw,
  FiExternalLink,
  FiCheckCircle,
  FiArrowUpCircle,
  FiAlertCircle,
  FiGithub,
} from 'react-icons/fi';
import { useVersionStore } from '@/stores';
import { useTranslation } from '@/i18n/useTranslation';
import { GITHUB_RELEASES_URL, GITHUB_REPO } from '@/constants/version';
import AnimatedLogo from '@/components/layout/AnimatedLogo';
import { AutoTransition } from '@/components/ui';

interface AboutVersionModalProps {
  onClose?: () => void;
}

export default function AboutVersionModal({ onClose }: AboutVersionModalProps) {
  const { t } = useTranslation();
  const {
    currentVersion,
    latestVersion,
    hasUpdate,
    isChecking,
    lastCheckError,
    lastCheckedTime,
    releaseInfo,
    downloadUrl,
    isAboutModalOpen,
    closeAboutModal,
    checkUpdate,
  } = useVersionStore();

  const handleClose = () => {
    closeAboutModal();
    onClose?.();
  };

  const handleManualCheck = () => {
    checkUpdate({ manual: true });
  };

  const handleOpenDownload = () => {
    const targetUrl = downloadUrl || GITHUB_RELEASES_URL;
    if (typeof window !== 'undefined') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenRepo = () => {
    if (typeof window !== 'undefined') {
      window.open(`https://github.com/${GITHUB_REPO}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <AutoTransition
      portal
      transitionKey={isAboutModalOpen ? 'version-modal-open' : 'version-modal-closed'}
      initial={false}
      type="fade"
    >
      {isAboutModalOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="relative w-full max-w-md rounded-3xl border border-white/30 dark:border-white/10 bg-white/80 dark:bg-neutral-900/85 p-6 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
              aria-label={t('common.close', '关闭')}
            >
              <FiX className="size-4" />
            </button>

            {/* Header: Logo & App Title */}
            <div className="flex flex-col items-center text-center pt-2 pb-4">
              <div className="mb-2">
                <AnimatedLogo size="lg" color="#f97316" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('version.designedFor', '专为专注与沉浸流而生')}
              </p>
            </div>

            {/* Version Card & Update Status */}
            <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] p-4">
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('version.currentVersion', '当前版本')}
                </span>
                <span className="inline-flex items-center rounded-full bg-primary-500/10 px-3 py-0.5 text-xs font-bold text-primary-600 dark:text-primary-300">
                  v{currentVersion}
                </span>
              </div>

              {/* Status State */}
              <div className="mt-3.5">
                {isChecking ? (
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <FiRefreshCw className="size-4 animate-spin text-primary-500" />
                    <span>{t('version.checking', '正在检查 GitHub 最新版本...')}</span>
                  </div>
                ) : hasUpdate ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
                      <FiArrowUpCircle className="size-5 shrink-0" />
                      <span>
                        {t('version.newVersionFound', '发现新版本')}: v{latestVersion}
                      </span>
                    </div>
                    {releaseInfo?.name && (
                      <p className="text-xs text-gray-700 dark:text-gray-200 font-medium">
                        {releaseInfo.name}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t(
                        'version.optimisticPrompt',
                        'TimePulse 全新版本现已就绪，欢迎前往下载体验更多新特性与优化！'
                      )}
                    </p>
                  </div>
                ) : lastCheckError ? (
                  <div className="flex items-start gap-2 text-xs text-rose-500 dark:text-rose-400">
                    <FiAlertCircle className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{t('version.checkFailed', '检查更新失败')}</p>
                      <p className="text-[11px] opacity-80 mt-0.5">{lastCheckError}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs">
                    <FiCheckCircle className="size-4 shrink-0" />
                    <span className="font-medium">
                      {t('version.upToDate', '当前已是最新版本')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Prominent Download Button if update available */}
            {hasUpdate && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleOpenDownload}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-primary-500 via-amber-500 to-primary-600 text-white font-semibold text-sm shadow-lg shadow-primary-500/25 hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <FiArrowUpCircle className="size-4.5" />
                  <span>{t('version.downloadReleases', '前往 GitHub Releases 下载')}</span>
                  <FiExternalLink className="size-4" />
                </button>
              </div>
            )}

            {/* Quick Action Buttons */}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={isChecking}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold text-gray-700 dark:text-gray-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                <FiRefreshCw className={`size-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{t('version.checkUpdate', '检查更新')}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenDownload}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
              >
                <FiExternalLink className="size-3.5" />
                <span>Releases</span>
              </button>
            </div>

            {/* Footer / Links */}
            <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/10 flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
              <button
                type="button"
                onClick={handleOpenRepo}
                className="flex items-center gap-1.5 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
              >
                <FiGithub className="size-3.5" />
                <span>GitHub · {GITHUB_REPO}</span>
              </button>
              <span>Apache-2.0</span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AutoTransition>
  );
}
