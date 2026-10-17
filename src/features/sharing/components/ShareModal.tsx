import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiCopy, FiShare2, FiCheck } from 'react-icons/fi';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useTranslation } from '@/i18n/useTranslation';
import { LazyImage } from '@/components/ui';

type ShareModalProps = {
  onClose: () => void;
};

export default function ShareModal({ onClose }: ShareModalProps) {
  const { accentColor } = useTheme();
  const { t } = useTranslation();
  const canUseSystemShare = typeof navigator !== 'undefined' && 'share' in navigator;
  
  const [websiteCopied, setWebsiteCopied] = useState(false);

  const websiteUrl = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1')
    ? `${window.location.origin}/`
    : 'https://time-pulse-two.vercel.app/';

  // 复制网站URL到剪贴板
  const handleCopyWebsite = () => {
    navigator.clipboard.writeText(websiteUrl)
      .then(() => {
        setWebsiteCopied(true);
        setTimeout(() => setWebsiteCopied(false), 2000);
      })
      .catch((err: unknown) => {
        console.error(t('share.copyError', '无法复制URL: '), err);
      });
  };

  // 尝试使用Web Share API分享网站
  const handleWebShareWebsite = () => {
    if (navigator.share) {
      navigator.share({
        title: t('share.shareTitle', 'TimePulse 现代化计时器'),
        text: t('share.shareWebsiteText', '推荐一个好用的现代化在线计时器 TimePulse：'),
        url: websiteUrl,
      })
      .catch((err: unknown) => {
        console.log(t('share.shareError', '分享失败:'), err);
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 p-4 flex items-center justify-center z-50 backdrop-blur-sm overflow-x-hidden overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-card w-full max-w-md p-6 rounded-2xl max-h-[90vh] overflow-x-hidden overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-semibold">{t('share.title', '分享与二维码')}</h2>
          <button
            className="p-2 rounded-full btn-glass-hover border border-white/10 dark:border-white/10 cursor-pointer"
            onClick={onClose}
          >
            <FiX className="text-xl" />
          </button>
        </div>

        <div>
          <div className="mb-5">
            <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-300">
              {t('share.websiteUrl', '网站访问链接')}
            </label>
            <div className="flex">
              <input
                type="text"
                value={websiteUrl}
                readOnly
                className="flex-1 px-3.5 py-2 text-sm rounded-l-lg bg-white/10 dark:bg-black/10 backdrop-blur-sm border border-white/20 dark:border-white/10 focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
              <button
                className="px-3.5 py-2 rounded-r-lg border border-white/20 backdrop-blur-sm cursor-pointer transition-colors"
                style={{
                  backgroundColor: websiteCopied
                    ? 'rgba(16, 185, 129, 0.28)'
                    : `color-mix(in srgb, ${accentColor} 32%, transparent)`,
                  borderColor: websiteCopied ? 'rgba(16, 185, 129, 0.5)' : `color-mix(in srgb, ${accentColor} 60%, transparent)`,
                  color: websiteCopied ? '#047857' : accentColor,
                  WebkitBackdropFilter: 'blur(10px)',
                  backdropFilter: 'blur(10px)',
                }}
                onClick={handleCopyWebsite}
                data-insightflare-event="share_website_link_copy"
                title={t('share.copyLink', '复制链接')}
              >
                {websiteCopied ? <FiCheck /> : <FiCopy />}
              </button>
            </div>
          </div>

          <div className="mb-6 flex flex-col items-center justify-center">
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-black/5 dark:border-white/10 flex flex-col items-center">
              <LazyImage
                src="/website-qr.png"
                alt={t('share.websiteQrAlt', 'TimePulse 网站访问二维码')}
                className="w-[200px] h-[200px] object-contain select-none"
                containerClassName="w-[200px] h-[200px]"
              />
            </div>
            <p className="mt-2.5 text-xs text-center text-gray-500 dark:text-gray-400">
              {t('share.scanToVisit', '手机扫码即可直接访问 TimePulse 在线网站')}
            </p>
          </div>
        </div>

        <div className={`flex ${canUseSystemShare ? 'space-x-3' : ''}`}>
          <button
            type="button"
            className={`${canUseSystemShare ? 'flex-1' : 'w-full'} btn-glass-secondary flex items-center justify-center py-2.5 rounded-xl cursor-pointer text-sm`}
            onClick={onClose}
          >
            {t('common.cancel')}
          </button>
          {canUseSystemShare && (
            <button
              type="button"
              className="flex-1 btn-glass-primary flex items-center justify-center py-2.5 rounded-xl cursor-pointer text-sm"
              onClick={handleWebShareWebsite}
              data-insightflare-event="share_system"
            >
              <FiShare2 className="mr-2" />
              {t('share.systemShare', '系统分享')}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
