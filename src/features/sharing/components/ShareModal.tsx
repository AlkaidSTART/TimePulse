import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiCopy, FiShare2, FiCheck, FiList, FiGlobe, FiClock } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';
import { useTimers } from '@/app/providers/TimerProvider';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useTranslation } from '@/i18n/useTranslation';
import { createShareUrl } from '@/services/sharing';
import { track } from '@/services/analytics';
import CustomSelect from '@/components/composed/CustomSelect';
import { AutoResizer, AutoTransition, LazyImage } from '@/components/ui';

type ShareModalProps = {
  onClose: () => void;
  defaultTab?: 'website' | 'timer';
};

type SelectChangeEvent = {
  target: {
    value: string;
  };
};

export default function ShareModal({ onClose, defaultTab = 'website' }: ShareModalProps) {
  const { timers, activeTimerId } = useTimers();
  const { accentColor } = useTheme();
  const { t } = useTranslation();
  const canUseSystemShare = typeof navigator !== 'undefined' && 'share' in navigator;
  
  const [activeTab, setActiveTab] = useState<'website' | 'timer'>(defaultTab);
  const [shareUrl, setShareUrl] = useState('');
  const [websiteCopied, setWebsiteCopied] = useState(false);
  const [timerCopied, setTimerCopied] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState(activeTimerId ?? '');
  const [shareAll, setShareAll] = useState(false);
  const [qrError, setQrError] = useState(false);

  const websiteUrl = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1')
    ? `${window.location.origin}/`
    : 'https://time-pulse-two.vercel.app/';
  
  // 生成分享URL
  useEffect(() => {
    try {
      const url = createShareUrl(
        shareAll 
          ? timers 
          : timers.filter(timer => timer.id === selectedTimer)
      );
      
      // 构建完整URL
      const fullUrl = `${window.location.origin}${window.location.pathname}?share=${url}`;
      setShareUrl(fullUrl);
      setQrError(false);
    } catch (error: unknown) {
      console.error('生成分享URL失败:', error);
      setQrError(true);
    }
  }, [timers, selectedTimer, shareAll]);
  
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

  // 复制计时器URL到剪贴板
  const handleCopyTimer = () => {
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setTimerCopied(true);
        setTimeout(() => setTimerCopied(false), 2000);
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
        url: websiteUrl
      })
      .catch((err: unknown) => {
        console.log(t('share.shareError', '分享失败:'), err);
      });
    }
  };

  // 尝试使用Web Share API分享计时器
  const handleWebShareTimer = () => {
    if (navigator.share) {
      navigator.share({
        title: t('share.shareTitle', '查看我的TimePulse倒计时'),
        text: t('share.shareText', '我分享了一个倒计时，点击链接查看'),
        url: shareUrl
      })
      .catch((err: unknown) => {
        console.log(t('share.shareError', '分享失败:'), err);
      });
    }
  };

  // 处理选择下拉菜单改变
  const handleSelectChange = (e: SelectChangeEvent) => {
    if (e.target.value === 'all') {
      setShareAll(true);
      track('share_target_change', { mode: 'all' });
    } else {
      setShareAll(false);
      setSelectedTimer(e.target.value);
      track('share_target_change', { mode: 'single' });
    }
  };

  // 创建下拉菜单选项
  const selectOptions = [
    { value: 'all', label: t('share.shareAll', '分享所有计时器') },
    ...timers.map(timer => ({
      value: timer.id,
      label: timer.name
    }))
  ];

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

        {/* 顶部 Tab 切换：网站二维码 vs 分享计时器 */}
        <div className="flex p-1 bg-black/5 dark:bg-white/5 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('website')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'website'
                ? 'bg-white dark:bg-black/40 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FiGlobe className="size-3.5" />
            <span>{t('share.websiteTab', '网站二维码')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('timer')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'timer'
                ? 'bg-white dark:bg-black/40 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FiClock className="size-3.5" />
            <span>{t('share.timerTab', '分享计时器')}</span>
          </button>
        </div>

        {activeTab === 'website' ? (
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
        ) : (
          <div>
            <div className="mb-5">
              <CustomSelect
                name="shareTimer"
                value={shareAll ? 'all' : selectedTimer}
                onChange={handleSelectChange}
                options={selectOptions}
                placeholder={t('share.selectTimer', '选择要分享的倒计时')}
                label={t('share.selectTimer', '选择要分享的倒计时')}
                icon={FiList}
              />
            </div>
            
            <div className="mb-5">
              <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-300">
                {t('share.url', '分享链接')}
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3.5 py-2 text-sm rounded-l-lg bg-white/10 dark:bg-black/10 backdrop-blur-sm border border-white/20 dark:border-white/10 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
                <button
                  className="px-3.5 py-2 rounded-r-lg border border-white/20 backdrop-blur-sm cursor-pointer transition-colors"
                  style={{
                    backgroundColor: timerCopied
                      ? 'rgba(16, 185, 129, 0.28)'
                      : `color-mix(in srgb, ${accentColor} 32%, transparent)`,
                    borderColor: timerCopied ? 'rgba(16, 185, 129, 0.5)' : `color-mix(in srgb, ${accentColor} 60%, transparent)`,
                    color: timerCopied ? '#047857' : accentColor,
                    WebkitBackdropFilter: 'blur(10px)',
                    backdropFilter: 'blur(10px)',
                  }}
                  onClick={handleCopyTimer}
                  data-insightflare-event="share_link_copy"
                  title={t('share.copyLink', '复制链接')}
                >
                  {timerCopied ? <FiCheck /> : <FiCopy />}
                </button>
              </div>
            </div>
            
            <div className="mb-6 flex justify-center">
              <div className="p-4 bg-white rounded-xl shadow-sm border border-black/5 dark:border-white/10">
                <AutoResizer initial={false} overflow="hidden">
                <AutoTransition transitionKey={qrError || shareUrl.length > 2048 ? 'qr-error' : 'qr-ready'} initial={false} type="crossFade">
                {qrError || shareUrl.length > 2048 ? (
                  <div className="w-[200px] h-[200px] flex flex-col items-center justify-center text-center text-gray-500">
                    <p className="text-sm mb-2">{t('share.qrError', '数据过长，无法生成二维码')}</p>
                    <p className="text-xs">{t('share.qrErrorHint', '请尝试分享单个计时器')}</p>
                  </div>
                ) : (
                  <QRCodeSVG
                    value={shareUrl}
                    size={200}
                    level="M"
                    includeMargin={true}
                    imageSettings={{
                      src: "/favicon.ico",
                      x: undefined,
                      y: undefined,
                      height: 24,
                      width: 24,
                      excavate: true,
                    }}
                  />
                )}
                </AutoTransition>
                </AutoResizer>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex space-x-3">
          <button
            type="button"
            className="flex-1 btn-glass-secondary flex items-center justify-center py-2.5 rounded-xl cursor-pointer text-sm"
            onClick={onClose}
          >
            {t('common.cancel')}
          </button>
          <AutoTransition transitionKey={canUseSystemShare ? 'system-share' : 'no-system-share'} initial={false} className="flex-1">
          {canUseSystemShare ? (
            <button
              type="button"
              className="w-full btn-glass-primary flex items-center justify-center py-2.5 rounded-xl cursor-pointer text-sm"
              onClick={activeTab === 'website' ? handleWebShareWebsite : handleWebShareTimer}
              data-insightflare-event="share_system"
            >
              <FiShare2 className="mr-2" />
              {t('share.systemShare', '系统分享')}
            </button>
          ) : null}
          </AutoTransition>
        </div>
      </motion.div>
    </motion.div>
  );
}
