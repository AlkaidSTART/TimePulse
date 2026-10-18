declare module '*/scripts/bump-version.mjs' {
  export interface ParsedSemver {
    major: number;
    minor: number;
    patch: number;
    prerelease: string;
  }

  export type BumpType = 'major' | 'minor' | 'patch';

  export function parseSemver(str: string): ParsedSemver | null;
  export function compareSemver(a: string, b: string): number;
  export function detectBumpTypeFromCommits(commitLog: string): BumpType;
  export function calculateNextVersion(currentVersion: string, bumpType: string): string;
  export function main(): void;
}
