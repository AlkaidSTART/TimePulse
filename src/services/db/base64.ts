const CHUNK_SIZE = 0x8000;

/**
 * 二进制转 Base64。
 * SQLite 通过 tauri-plugin-sql 只能以文本/数值/JSON 绑定参数，图片等 Blob 统一转 Base64 存入 TEXT 列。
 */
export function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return encodeBase64(new Uint8Array(buffer));
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = decodeBase64(base64);
  // 复制到独立的 ArrayBuffer，避免 Uint8Array 视图与 BlobPart 的类型歧义
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Blob([buffer], { type: mimeType || 'application/octet-stream' });
}
