export const SUPPORTED_HASHES = [
  'add',
  'share',
  'manage',
  'background',
  'fullscreen-settings',
] as const;

export type SupportedHash = (typeof SUPPORTED_HASHES)[number];

export function readUrlParams(url: Location = window.location): URLSearchParams {
  return new URLSearchParams(url.search);
}

export function readHash(url: Location = window.location): string {
  return url.hash.replace(/^#/, '');
}
