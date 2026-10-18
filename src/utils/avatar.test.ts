import { describe, it, expect, vi } from 'vitest';
import {
  AVATAR_CONSTRAINTS,
  validateAvatarFile,
  processAndOptimizeAvatar,
} from './avatar';

describe('avatar utils - 5MB 对象存储约束校验', () => {
  it('validates supported image types (JPG, PNG, WEBP)', () => {
    const pngFile = new File(['content'], 'avatar.png', { type: 'image/png' });
    const jpgFile = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });
    const webpFile = new File(['content'], 'avatar.webp', { type: 'image/webp' });

    expect(validateAvatarFile(pngFile).valid).toBe(true);
    expect(validateAvatarFile(jpgFile).valid).toBe(true);
    expect(validateAvatarFile(webpFile).valid).toBe(true);
  });

  it('rejects unsupported types like GIF, SVG and text files', () => {
    const gifFile = new File(['content'], 'animation.gif', { type: 'image/gif' });
    const resGif = validateAvatarFile(gifFile);
    expect(resGif.valid).toBe(false);
    expect(resGif.error).toContain('不支持 GIF 动图');

    const svgFile = new File(['<svg></svg>'], 'icon.svg', { type: 'image/svg+xml' });
    const resSvg = validateAvatarFile(svgFile);
    expect(resSvg.valid).toBe(false);
    expect(resSvg.error).toContain('不支持 SVG');

    const txtFile = new File(['text'], 'file.txt', { type: 'text/plain' });
    const resTxt = validateAvatarFile(txtFile);
    expect(resTxt.valid).toBe(false);
    expect(resTxt.error).toContain('仅支持 PNG、JPG、WEBP 格式');
  });

  it('rejects empty files', () => {
    const emptyFile = new File([], 'empty.png', { type: 'image/png' });
    const res = validateAvatarFile(emptyFile);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('所选图片文件为空，请重新选择');
  });

  it('rejects files larger than 2MB', () => {
    // 3MB file
    const largeFile = new File([new Uint8Array(3 * 1024 * 1024)], 'large.png', { type: 'image/png' });
    const res = validateAvatarFile(largeFile);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('头像图片文件大小不能超过 2MB（云端存储总容量仅 5MB）');
  });

  it('processAndOptimizeAvatar rejects invalid file upfront', async () => {
    const invalidFile = new File(['bad'], 'test.txt', { type: 'text/plain' });
    await expect(processAndOptimizeAvatar(invalidFile)).rejects.toThrow('仅支持 PNG、JPG、WEBP 格式');
  });

  it('processAndOptimizeAvatar degrades gracefully when canvas context is unavailable', async () => {
    const validFile = new File(['valid png data'], 'test.png', { type: 'image/png' });
    // In JSDOM test environment, canvas.getContext('2d') returns null
    const result = await processAndOptimizeAvatar(validFile);
    expect(result).toBe(validFile);
  });
});
