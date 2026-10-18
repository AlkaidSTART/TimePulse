import { getDatabase } from './db';
import type { StoredImage } from './db/types';

export type { StoredImage, StoredImageMetadata } from './db/types';

const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

class ImageStorage {
  private getImageDimensions(file: Blob): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: image.width, height: image.height });
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('无法读取图片尺寸'));
      };
      image.src = url;
    });
  }

  private objectUrlCache = new Map<string, string>();

  private getOrCreateObjectUrl(id: string, blob: Blob): string {
    const cached = this.objectUrlCache.get(id);
    if (cached) return cached;
    const url = URL.createObjectURL(blob);
    this.objectUrlCache.set(id, url);
    return url;
  }

  private revokeObjectUrl(id: string): void {
    const url = this.objectUrlCache.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      this.objectUrlCache.delete(id);
    }
  }

  /** 本地文件类型图片的展示 URL 由内存对象 URL 派生，不落库 */
  private withDisplayUrl(image: StoredImage): StoredImage {
    if (image.type === 'file' && image.blob) {
      image.url = this.getOrCreateObjectUrl(image.id, image.blob);
    }
    return image;
  }

  async saveImage(file: File): Promise<string> {
    if (!VALID_IMAGE_TYPES.includes(file.type)) throw new Error('只支持 JPEG、PNG、GIF 和 WebP 格式的图片');
    const dimensions = await this.getImageDimensions(file);
    const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const imageData: StoredImage = {
      id,
      type: 'file',
      url: this.getOrCreateObjectUrl(id, file),
      blob: file,
      metadata: {
        size: file.size,
        mimeType: file.type,
        ...dimensions,
        uploadedAt: new Date().toISOString(),
        name: file.name,
      },
    };
    await getDatabase().writeBackgroundImage(imageData);
    return id;
  }

  async saveImageFromUrl(url: string): Promise<string> {
    try {
      const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (!response.ok) throw new Error(`下载图片失败: ${response.status}`);
      const blob = await response.blob();
      if (!VALID_IMAGE_TYPES.includes(blob.type)) throw new Error('只支持 JPEG、PNG、GIF 和 WebP 格式的图片');
      const dimensions = await this.getImageDimensions(blob);
      const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const imageData: StoredImage = {
        id,
        type: 'url',
        url,
        blob,
        metadata: {
          size: blob.size,
          mimeType: blob.type,
          ...dimensions,
          uploadedAt: new Date().toISOString(),
        },
      };
      await getDatabase().writeBackgroundImage(imageData);
      return id;
    } catch (error) {
      throw new Error(`从 URL 保存图片失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getImage(id: string): Promise<StoredImage | null> {
    const image = await getDatabase().readBackgroundImage(id);
    return image ? this.withDisplayUrl(image) : null;
  }

  async getAllImages(): Promise<StoredImage[]> {
    const images = await getDatabase().readBackgroundImages();
    return images.map((image) => this.withDisplayUrl(image));
  }

  async deleteImage(id: string): Promise<void> {
    await getDatabase().deleteBackgroundImage(id);
    this.revokeObjectUrl(id);
  }

  async clearAll(): Promise<void> {
    await getDatabase().clearBackgroundImages();
    this.objectUrlCache.forEach((url) => URL.revokeObjectURL(url));
    this.objectUrlCache.clear();
  }
}

const imageStorage = new ImageStorage();
export default imageStorage;
