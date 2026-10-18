import { useState, useRef, useEffect, type DragEvent, type ChangeEvent } from 'react';
import { FiCamera, FiLoader } from 'react-icons/fi';

export interface UserAvatarProps {
  avatarUrl?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'rounded';
  editable?: boolean;
  isUploading?: boolean;
  onUpload?: (file: File) => void | Promise<void>;
  className?: string;
  accentColor?: string;
  showOnlineIndicator?: boolean;
  alt?: string;
}

const SIZE_MAP = {
  xs: {
    container: 'size-6',
    text: 'text-[10px]',
    icon: 'size-2.5',
    rounded: 'rounded-lg',
  },
  sm: {
    container: 'size-8',
    text: 'text-xs',
    icon: 'size-3',
    rounded: 'rounded-xl',
  },
  md: {
    container: 'size-10',
    text: 'text-sm',
    icon: 'size-3.5',
    rounded: 'rounded-xl',
  },
  lg: {
    container: 'size-12',
    text: 'text-base font-bold',
    icon: 'size-4',
    rounded: 'rounded-2xl',
  },
  xl: {
    container: 'size-16',
    text: 'text-xl font-bold',
    icon: 'size-5',
    rounded: 'rounded-2xl',
  },
  '2xl': {
    container: 'size-20',
    text: 'text-2xl font-bold',
    icon: 'size-6',
    rounded: 'rounded-3xl',
  },
} as const;

export function UserAvatar({
  avatarUrl,
  name = 'TimePulse',
  size = 'md',
  shape = 'rounded',
  editable = false,
  isUploading = false,
  onUpload,
  className = '',
  accentColor = '#10A37F',
  showOnlineIndicator = false,
  alt = '用户头像',
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When avatarUrl changes, reset error state
  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;
  const radiusClass = shape === 'circle' ? 'rounded-full' : sizeConfig.rounded;

  const letter = (name.trim().charAt(0) || 'T').toUpperCase();
  const showImage = Boolean(avatarUrl && !hasError);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      void onUpload(file);
    }
    // Reset file input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!editable || isUploading) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!editable || isUploading) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!editable || isUploading) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file && onUpload) {
      void onUpload(file);
    }
  };

  const handleClick = () => {
    if (editable && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={`relative inline-block select-none shrink-0 ${className}`}>
      <div
        role={editable ? 'button' : undefined}
        tabIndex={editable ? 0 : undefined}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (editable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleClick();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-label={editable ? '点击或拖拽上传新头像' : alt}
        className={`group relative overflow-hidden transition-all duration-200 ${sizeConfig.container} ${radiusClass} ${
          editable ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/50 hover:shadow-md' : ''
        } ${isDragOver ? 'ring-2 ring-primary-500 scale-105' : ''}`}
        style={{
          backgroundColor: showImage ? 'transparent' : `${accentColor}18`,
          color: accentColor,
          border: showImage ? '1px solid rgba(0,0,0,0.08)' : `1px solid ${accentColor}35`,
        }}
      >
        {showImage ? (
          <img
            src={avatarUrl!}
            alt={alt}
            onError={() => setHasError(true)}
            className={`size-full object-cover ${radiusClass} transition-transform duration-200 group-hover:scale-105`}
            loading="lazy"
          />
        ) : (
          <div className={`size-full flex items-center justify-center font-bold tracking-wider ${sizeConfig.text}`}>
            {letter}
          </div>
        )}

        {/* 上传中遮罩 */}
        {isUploading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-xs">
            <FiLoader className={`${sizeConfig.icon} animate-spin`} />
            {(size === 'lg' || size === 'xl' || size === '2xl') && (
              <span className="text-[10px] mt-1 font-medium scale-90">上传中</span>
            )}
          </div>
        )}

        {/* 可编辑悬停遮罩 */}
        {editable && !isUploading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/45 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-xs">
            <FiCamera className={sizeConfig.icon} />
            {(size === 'xl' || size === '2xl') && (
              <span className="text-[10px] mt-1 font-medium scale-90">更换头像</span>
            )}
          </div>
        )}

        {/* 隐藏的文件输入组件 */}
        {editable && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
            aria-hidden="true"
          />
        )}
      </div>

      {/* 在线连接指示器小圆点 */}
      {showOnlineIndicator && (
        <span
          className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900 pointer-events-none"
          title="在线"
        />
      )}
    </div>
  );
}

export default UserAvatar;
