import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX,
  FiRefreshCw,
  FiExternalLink,
  FiCheckCircle,
  FiArrowUpCircle,
  FiAlertCircle,
  FiGithub,
  FiCoffee,
  FiMessageSquare,
  FiDownload,
  FiCopy,
  FiCheck,
  FiHeart,
  FiInfo,
} from 'react-icons/fi';
import { SiWechat } from 'react-icons/si';
import { useVersionStore, type AboutModalTab } from '@/stores/useVersionStore';
import { useTranslation } from '@/i18n/useTranslation';
import { GITHUB_RELEASES_URL, GITHUB_REPO } from '@/constants/version';
import AnimatedLogo from '@/components/layout/AnimatedLogo';
import { AutoTransition } from '@/components/ui';

interface AboutVersionModalProps {
  onClose?: () => void;
}

export default function AboutVersionModal({ onClose }: AboutVersionModalProps) {
  const { t } = useTranslation();
  const currentVersion = useVersionStore((s) => s.currentVersion);
  const latestVersion = useVersionStore((s) => s.latestVersion);
  const hasUpdate = useVersionStore((s) => s.hasUpdate);
  const isChecking = useVersionStore((s) => s.isChecking);
  const lastCheckError = useVersionStore((s) => s.lastCheckError);
  const releaseInfo = useVersionStore((s) => s.releaseInfo);
  const downloadUrl = useVersionStore((s) => s.downloadUrl);
  const isAboutModalOpen = useVersionStore((s) => s.isAboutModalOpen);
  const activeAboutTab = useVersionStore((s) => s.activeAboutTab);
  const setActiveAboutTab = useVersionStore((s) => s.setActiveAboutTab);
  const closeAboutModal = useVersionStore((s) => s.closeAboutModal);
  const checkUpdate = useVersionStore((s) => s.checkUpdate);

  const [copiedText, setCopiedText] = useState(false);

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

  const handleDownloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyText = (text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const tabs: { id: AboutModalTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'version', label: t('version.tabVersion', '版本更新'), icon: FiInfo },
    { id: 'coffee', label: t('version.tabCoffee', '请喝咖啡'), icon: FiCoffee },
    { id: 'contact', label: t('version.tabContact', '联系作者'), icon: FiMessageSquare },
  ];

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
            className="relative w-full max-w-md max-h-[92vh] flex flex-col rounded-3xl border border-white/30 dark:border-white/10 bg-white/90 dark:bg-neutral-900/90 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 z-10 inline-flex size-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
              aria-label={t('common.close', '关闭')}
            >
              <FiX className="size-4" />
            </button>

            {/* Header: Logo & App Title */}
            <div className="flex flex-col items-center text-center pt-1 pb-3 shrink-0">
              <div className="mb-1.5">
                <AnimatedLogo size="md" color="#f97316" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('version.designedFor', '专为专注与沉浸流而生')}
              </p>
            </div>

            {/* Segmented Tab Controls */}
            <div className="mb-4 flex items-center justify-center p-1 rounded-2xl bg-black/[0.05] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] shrink-0">
              {tabs.map((tab) => {
                const isActive = activeAboutTab === tab.id;
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveAboutTab(tab.id)}
                    className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'text-gray-950 dark:text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="about-modal-active-pill"
                        transition={{ type: 'spring', damping: 26, stiffness: 350 }}
                        className="absolute inset-0 rounded-xl bg-white dark:bg-white/15 shadow-sm"
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <IconComponent
                        className={`size-3.5 ${
                          tab.id === 'coffee'
                            ? 'text-amber-500'
                            : tab.id === 'contact'
                            ? 'text-emerald-500'
                            : 'text-primary-500'
                        }`}
                      />
                      <span>{tab.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable Tab Body */}
            <div className="overflow-y-auto pr-0.5 space-y-4 flex-1">
              <AnimatePresence mode="wait">
                {activeAboutTab === 'version' && (
                  <motion.div
                    key="tab-version"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-4"
                  >
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
                      <div className="mt-3">
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
                    <div className="grid grid-cols-2 gap-2.5">
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

                    {/* Quick navigation to Coffee & Contact */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveAboutTab('coffee')}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <FiCoffee className="size-3.5 text-amber-500" />
                        <span>{t('version.buyMeACoffee', '请作者喝咖啡')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveAboutTab('contact')}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <FiMessageSquare className="size-3.5 text-emerald-500" />
                        <span>{t('version.contactAuthor', '联系作者')}</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeAboutTab === 'coffee' && (
                  <motion.div
                    key="tab-coffee"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-3.5 text-center"
                  >
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                        <FiCoffee className="size-3.5 text-amber-500" />
                        <span>{t('version.buyMeACoffee', '请作者喝咖啡')} · Buy Me a Coffee</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 px-2 pt-1">
                        {t('version.coffeeSubtitle', '如果 TimePulse 陪伴了你的专注时光，欢迎请作者喝杯咖啡')}
                      </p>
                    </div>

                    {/* QR Code Card */}
                    <div className="relative mx-auto w-fit p-3.5 rounded-2xl bg-white dark:bg-black/40 border border-amber-500/20 shadow-md">
                      <img
                        src="/buy-me-a-coffee.webp"
                        alt="Buy Me a Coffee - Alkaid 的赞赏码"
                        className="size-52 sm:size-56 object-contain rounded-xl mx-auto"
                        loading="eager"
                        decoding="async"
                      />
                      <div className="mt-2 text-[11px] font-medium text-amber-800 dark:text-amber-200">
                        {t('version.coffeeTagline', 'Alkaid 的赞赏码 · 微信赞赏支持')}
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-500 dark:text-gray-400 px-3 leading-relaxed">
                      {t(
                        'version.coffeeAppreciation',
                        '每一份来自你的喝咖啡支持，都是让 TimePulse 持续打磨、不断进化的最大动力！'
                      )}
                    </p>

                    {/* Action buttons */}
                    <div className="pt-1 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadFile('/buy-me-a-coffee.webp', 'Alkaid-BuyMeACoffee.webp')}
                        className="inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <FiDownload className="size-3.5" />
                        <span>{t('version.saveCoffeeQr', '保存赞赏码图片')}</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeAboutTab === 'contact' && (
                  <motion.div
                    key="tab-contact"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-3 text-center"
                  >
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                        <SiWechat className="size-3.5 text-emerald-500" />
                        <span>{t('version.contactAuthor', '联系作者')} · Contact Alkaid</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 px-2 pt-1">
                        {t('version.contactSubtitle', '欢迎反馈建议、探讨新特性、提交想法或日常交流')}
                      </p>
                    </div>

                    {/* WeChat QR Card */}
                    <div className="relative mx-auto w-fit p-3 rounded-2xl bg-white dark:bg-black/40 border border-emerald-500/20 shadow-md">
                      <img
                        src="/author-wechat.webp"
                        alt="Contact Author Alkaid - WeChat QR Code"
                        className="w-48 sm:w-52 max-h-64 object-contain rounded-xl mx-auto"
                        loading="eager"
                        decoding="async"
                      />
                      <div className="mt-2 text-[11px] font-medium text-emerald-800 dark:text-emerald-200">
                        {t('version.contactTagline', '微信扫码添加好友 · 备注 TimePulse 优先通过')}
                      </div>
                    </div>

                    {/* Profile & Copy Action */}
                    <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadFile('/author-wechat.webp', 'Alkaid-WeChat-Contact.webp')}
                        className="inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <FiDownload className="size-3.5" />
                        <span>{t('version.saveContactQr', '保存微信二维码')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyText('Alkaid')}
                        className="inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {copiedText ? (
                          <>
                            <FiCheck className="size-3.5 text-emerald-600" />
                            <span>已复制微信号</span>
                          </>
                        ) : (
                          <>
                            <FiCopy className="size-3.5" />
                            <span>复制微信号 Alkaid</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer / Links */}
            <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 shrink-0">
              <button
                type="button"
                onClick={handleOpenRepo}
                className="flex items-center gap-1.5 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
              >
                <FiGithub className="size-3.5" />
                <span>GitHub · {GITHUB_REPO}</span>
              </button>
              <div className="flex items-center gap-2">
                <span>MIT</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AutoTransition>
  );
}
