import { useState, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiX, FiSliders, FiPalette } from 'react-icons/fi';
import { HexColorPicker } from 'react-colorful';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useTimers } from '@/app/providers/TimerProvider';
import { useTranslation } from '@/i18n/useTranslation';
import { CHATGPT_THEME_PRESETS, PRESET_COLORS, type ThemePreset } from '@/constants/colors';
import { vibrateLight } from '@/services/vibration';

interface ThemeLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
}

export default function ThemeLibraryModal({
  isOpen,
  onClose,
  embedded = false,
}: ThemeLibraryModalProps) {
  const { accentColor, themePresetId, setThemePreset, updateAccentColor } = useTheme();
  const { timers, activeTimerId, updateTimer } = useTimers();
  const { t, currentLang } = useTranslation();
  const [isCustomOpen, setIsCustomOpen] = useState(themePresetId === 'custom');
  const [customHex, setCustomHex] = useState(accentColor || '#10A37F');

  if (!isOpen && !embedded) return null;

  const handleSelectPreset = (preset: ThemePreset) => {
    vibrateLight();
    setThemePreset(preset.id);
    setIsCustomOpen(false);

    // 同步更新当前活动计时器的颜色，保持全站一致
    const activeTimer = timers.find((item) => item.id === activeTimerId);
    if (activeTimer) {
      updateTimer(activeTimer.id, { color: preset.color });
    }
  };

  const handleSelectCustom = () => {
    vibrateLight();
    setIsCustomOpen(true);
    setThemePreset('custom', customHex);
  };

  const handleCustomColorChange = (newColor: string) => {
    setCustomHex(newColor);
    updateAccentColor(newColor);
    const activeTimer = timers.find((item) => item.id === activeTimerId);
    if (activeTimer) {
      updateTimer(activeTimer.id, { color: newColor });
    }
  };

  const handleHexInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.trim();
    if (!val.startsWith('#') && val.length > 0) {
      val = `#${val}`;
    }
    setCustomHex(val);
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val)) {
      updateAccentColor(val);
      const activeTimer = timers.find((item) => item.id === activeTimerId);
      if (activeTimer) {
        updateTimer(activeTimer.id, { color: val });
      }
    }
  };

  const content = (
    <div className="w-full select-none text-left">
      {/* 标题栏 */}
      {!embedded && (
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-black/[0.08] dark:border-white/10">
          <div className="flex items-center gap-2">
            <div
              className="size-7 rounded-lg flex items-center justify-center shrink-0 text-white shadow-xs"
              style={{ backgroundColor: accentColor || '#10A37F' }}
            >
              <FiPalette className="size-3.5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                {t('theme.title', '主题配色库')}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {t('theme.subtitle', '灵感源自 ChatGPT 极简美学')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-7 inline-flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white cursor-pointer transition-colors"
            aria-label="关闭"
          >
            <FiX className="size-4" />
          </button>
        </div>
      )}

      {/* ChatGPT 风格色彩列表 */}
      <div className="flex flex-col gap-1 py-1" role="listbox" aria-label="主题配色列表">
        {CHATGPT_THEME_PRESETS.map((preset) => {
          const isSelected =
            !isCustomOpen &&
            (themePresetId === preset.id ||
              accentColor.toLowerCase() === preset.color.toLowerCase());
          const label = currentLang === 'en-US' ? preset.nameEn : preset.name;

          return (
            <button
              key={preset.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => handleSelectPreset(preset)}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-left transition-all ${
                isSelected
                  ? 'bg-black/[0.06] dark:bg-white/[0.08] text-gray-900 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* 颜色实心圆点 */}
                <span
                  className="size-4 rounded-full shrink-0 border border-black/10 dark:border-white/15 shadow-xs"
                  style={{ backgroundColor: preset.color }}
                  aria-hidden="true"
                />
                <span className="text-sm truncate">{label}</span>
              </div>

              {/* 选中对勾 */}
              <div className="size-4 flex items-center justify-center shrink-0">
                {isSelected && (
                  <FiCheck className="size-4 stroke-[2.5] text-gray-900 dark:text-white" />
                )}
              </div>
            </button>
          );
        })}

        {/* 自定义颜色选项 */}
        <button
          type="button"
          role="option"
          aria-selected={isCustomOpen}
          onClick={handleSelectCustom}
          className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-left transition-all ${
            isCustomOpen
              ? 'bg-black/[0.06] dark:bg-white/[0.08] text-gray-900 dark:text-white font-medium'
              : 'text-gray-700 dark:text-gray-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="size-4 rounded-full shrink-0 border border-black/10 dark:border-white/15 flex items-center justify-center text-[9px] font-bold"
              style={{
                background:
                  'conic-gradient(from 0deg, #f43f5e, #fb923c, #facc15, #4ade80, #38bdf8, #818cf8, #f43f5e)',
              }}
              aria-hidden="true"
            />
            <span className="text-sm truncate">{t('theme.presetCustom', '自定义')}</span>
          </div>

          <div className="size-4 flex items-center justify-center shrink-0">
            {isCustomOpen && (
              <FiCheck className="size-4 stroke-[2.5] text-gray-900 dark:text-white" />
            )}
          </div>
        </button>
      </div>

      {/* 自定义颜色展开区域 */}
      <AnimatePresence>
        {isCustomOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden pt-2"
          >
            <div className="p-3 rounded-2xl bg-black/[0.025] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-3">
              <HexColorPicker
                color={customHex}
                onChange={handleCustomColorChange}
                className="w-full !w-full"
              />

              {/* HEX 输入框与色块预览 */}
              <div className="flex items-center gap-2">
                <span
                  className="size-8 rounded-lg shrink-0 border border-black/10 dark:border-white/15 shadow-xs"
                  style={{ backgroundColor: customHex }}
                />
                <input
                  type="text"
                  value={customHex}
                  onChange={handleHexInputChange}
                  maxLength={7}
                  placeholder="#10A37F"
                  className="flex-1 px-3 py-1.5 rounded-lg text-xs font-mono bg-white dark:bg-black/30 border border-black/10 dark:border-white/15 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                />
              </div>

              {/* 常用预设快捷色点 */}
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1.5 font-medium">
                  推荐搭配色
                </p>
                <div className="grid grid-cols-10 gap-1.5">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleCustomColorChange(color)}
                      className={`size-6 rounded-full border border-black/10 dark:border-white/15 transition-transform hover:scale-110 active:scale-95 ${
                        customHex.toLowerCase() === color.toLowerCase()
                          ? 'ring-2 ring-black dark:ring-white'
                          : ''
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full max-w-xs rounded-2xl bg-white/95 dark:bg-[#18181B]/95 border border-black/[0.08] dark:border-white/10 p-3.5 shadow-2xl backdrop-blur-2xl max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {content}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
