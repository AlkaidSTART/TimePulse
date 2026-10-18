/**
 * 用户头像上传与存储约束配置及前端极小体积优化工具
 * 
 * 约束背景：
 * 云端对象存储（Supabase Storage touxiang 存储桶）总配额仅 5MB。
 * 为防止空间迅速爆仓，必须实施严格的多重约束：
 * 1. 格式约束：仅支持 JPG、PNG、WEBP 格式静态图片，坚决禁用 GIF 动图与 SVG（避免体积失控及安全隐患）；
 * 2. 原始体积约束：原图不可超过 2MB，防止移动端误选 RAW/超清原图造成浏览器内存溢出；
 * 3. 像素与居中裁剪：自动检测图片并居中裁剪为 1:1 正方形，下采样缩放至 256×256 像素（Retina 屏视网膜高清标准）；
 * 4. 极致压缩：前端自动转码为 WebP（质量 0.82），单张通常仅 15KB ~ 35KB，严格限制在 200KB 绝对上限以内；
 * 5. 一人一图防冗余：存储采用固定用户专属路径与覆盖机制，上传时清理历史残留，移除头像时同步释放存储空间。
 */

export const AVATAR_CONSTRAINTS = {
  /** 原始文件最大限制（2MB） */
  MAX_RAW_FILE_SIZE: 2 * 1024 * 1024,
  /** 优化后上传文件的硬性上限（200KB），配合存储桶配置 */
  MAX_UPLOAD_FILE_SIZE: 200 * 1024,
  /** 目标缩放分辨率（256×256） */
  TARGET_DIMENSION: 256,
  /** 最小分辨率要求（32×32） */
  MIN_DIMENSION: 32,
  /** 允许的 MIME 类型 */
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
  /** 允许的文件后缀名 */
  ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'webp'] as const,
};

export interface AvatarValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 校验待上传头像文件的基本格式与原始体积约束
 */
export function validateAvatarFile(file: File): AvatarValidationResult {
  if (!file) {
    return { valid: false, error: '请选择要上传的头像图片' };
  }

  // 1. 检查 MIME 类型与文件扩展名
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isMimeValid = (AVATAR_CONSTRAINTS.ALLOWED_MIME_TYPES as readonly string[]).includes(file.type);
  const isExtValid = (AVATAR_CONSTRAINTS.ALLOWED_EXTENSIONS as readonly string[]).includes(ext);

  if (!isMimeValid || !isExtValid) {
    if (file.type === 'image/gif' || ext === 'gif') {
      return { valid: false, error: '不支持 GIF 动图，请上传 JPG、PNG 或 WEBP 静态图片' };
    }
    if (file.type.includes('svg') || ext === 'svg') {
      return { valid: false, error: '不支持 SVG 矢量图，请上传 JPG、PNG 或 WEBP 静态图片' };
    }
    return { valid: false, error: '不支持的图片格式，仅支持 PNG、JPG、WEBP 格式' };
  }

  // 2. 检查空文件
  if (file.size === 0) {
    return { valid: false, error: '所选图片文件为空，请重新选择' };
  }

  // 3. 检查原文件体积（不超过 2MB）
  if (file.size > AVATAR_CONSTRAINTS.MAX_RAW_FILE_SIZE) {
    return {
      valid: false,
      error: '头像图片文件大小不能超过 2MB（云端存储总容量仅 5MB）',
    };
  }

  return { valid: true };
}

/**
 * 前端图片优化处理：居中正方形裁剪、256×256 缩放抗锯齿、转码高压缩率 WebP
 * 在无完整 Canvas 运行环境（如 Node/JSDOM 测试环境）中，优雅降级返回原文件。
 */
export async function processAndOptimizeAvatar(file: File): Promise<File> {
  const validation = validateAvatarFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 环境检测：若在无浏览器 DOM 或 Canvas 环境中，直接返回原文件
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return file;
  }

  return new Promise<File>((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      if (width < AVATAR_CONSTRAINTS.MIN_DIMENSION || height < AVATAR_CONSTRAINTS.MIN_DIMENSION) {
        reject(
          new Error(`图片尺寸过小（当前为 ${width}×${height}，需至少 ${AVATAR_CONSTRAINTS.MIN_DIMENSION}×${AVATAR_CONSTRAINTS.MIN_DIMENSION} 像素）`)
        );
        return;
      }

      // 居中正方形裁剪计算
      const minSide = Math.min(width, height);
      const sx = (width - minSide) / 2;
      const sy = (height - minSide) / 2;
      const targetSize = Math.min(minSide, AVATAR_CONSTRAINTS.TARGET_DIMENSION);

      canvas.width = targetSize;
      canvas.height = targetSize;

      // 开启高质量平滑缩放
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);

      const tryExport = (type: string, quality: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            // 若体积仍超出限额且质量尚有下调空间，降低质量二次重试
            if (blob.size > AVATAR_CONSTRAINTS.MAX_UPLOAD_FILE_SIZE && quality > 0.45) {
              tryExport(type, quality - 0.2);
              return;
            }

            if (blob.size > AVATAR_CONSTRAINTS.MAX_UPLOAD_FILE_SIZE) {
              reject(new Error('图片优化后仍超过 200KB 存储上限，请选择画面更简洁的头像'));
              return;
            }

            const fileName = type === 'image/webp' ? 'avatar.webp' : 'avatar.jpg';
            const optimizedFile = new File([blob], fileName, { type: blob.type });
            resolve(optimizedFile);
          },
          type,
          quality
        );
      };

      // 优先压缩为 WebP（体积最小，现代浏览器 100% 支持）
      tryExport('image/webp', 0.82);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('无法解析图片内容，请检查图片文件是否完整'));
    };

    img.src = objectUrl;
  });
}
