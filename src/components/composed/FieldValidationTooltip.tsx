import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertCircle } from 'react-icons/fi';

export interface FieldValidationTooltipProps {
  /** 错误提示文本，若为空则平滑折叠隐藏 */
  error?: string | null;
  /** 无障碍关联 id (供 aria-describedby 使用) */
  id?: string;
  /** 自定义外层样式 */
  className?: string;
}

/**
 * 优雅的表单字段校验提示组件
 * 替代原生浏览器粗糙的 HTML5 validation 弹窗，提供温润磨砂玻璃质感、小三角指针与平滑弹簧动画。
 */
export const FieldValidationTooltip: React.FC<FieldValidationTooltipProps> = ({
  error,
  id,
  className,
}) => {
  return (
    <AnimatePresence initial={false}>
      {error && (
        <motion.div
          id={id}
          role="alert"
          aria-live="polite"
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
          className="overflow-hidden"
        >
          <div className={`pt-1.5 flex items-center ${className || ''}`}>
            <div className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-rose-50/95 dark:bg-rose-950/80 cream:bg-[#fff2f2]/95 text-rose-700 dark:text-rose-300 cream:text-rose-800 border border-rose-200/90 dark:border-rose-500/30 cream:border-rose-300/70 backdrop-blur-md shadow-xs transition-colors duration-200">
              {/* 精致的小三角形指向箭头，连接上方输入框底边缘 */}
              <span
                className="absolute -top-1 left-4 size-2 rotate-45 bg-rose-50 dark:bg-[#400615] cream:bg-[#fff2f2] border-t border-l border-rose-200/90 dark:border-rose-500/30 cream:border-rose-300/70"
                aria-hidden="true"
              />
              <FiAlertCircle className="size-3.5 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FieldValidationTooltip;
