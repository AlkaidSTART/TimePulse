import { describe, it, expect } from 'vitest';
import {
  parseSemver,
  compareSemver,
  detectBumpTypeFromCommits,
  calculateNextVersion,
} from '../../scripts/bump-version.mjs';

describe('bump-version utility functions', () => {
  describe('parseSemver', () => {
    it('parses valid semver strings with or without v', () => {
      expect(parseSemver('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3, prerelease: '' });
      expect(parseSemver('v0.7.0')).toEqual({ major: 0, minor: 7, patch: 0, prerelease: '' });
      expect(parseSemver('v2.0.1-beta.1')).toEqual({ major: 2, minor: 0, patch: 1, prerelease: 'beta.1' });
    });

    it('returns null for invalid strings', () => {
      expect(parseSemver('')).toBeNull();
      expect(parseSemver('invalid')).toBeNull();
      expect(parseSemver('1.2')).toBeNull();
    });
  });

  describe('compareSemver', () => {
    it('compares versions accurately', () => {
      expect(compareSemver('0.8.0', '0.7.0')).toBeGreaterThan(0);
      expect(compareSemver('0.7.1', '0.7.0')).toBeGreaterThan(0);
      expect(compareSemver('1.0.0', '0.9.9')).toBeGreaterThan(0);
      expect(compareSemver('0.7.0', '0.7.0')).toBe(0);
      expect(compareSemver('v0.7.0', '0.7.0')).toBe(0);
      expect(compareSemver('0.7.0', '0.8.0')).toBeLessThan(0);
    });
  });

  describe('detectBumpTypeFromCommits', () => {
    it('detects BREAKING CHANGE as major', () => {
      expect(detectBumpTypeFromCommits('feat!: rewrite storage architecture')).toBe('major');
      expect(detectBumpTypeFromCommits('fix: something\n\nBREAKING CHANGE: api altered')).toBe('major');
      expect(detectBumpTypeFromCommits('refactor!: drop legacy support')).toBe('major');
    });

    it('detects feat as minor', () => {
      expect(detectBumpTypeFromCommits('feat: add dark mode toggle')).toBe('minor');
      expect(detectBumpTypeFromCommits('feat(auth): add google login\nfix: padding')).toBe('minor');
    });

    it('detects fix/chore/refactor/empty as patch', () => {
      expect(detectBumpTypeFromCommits('fix: resolve modal z-index')).toBe('patch');
      expect(detectBumpTypeFromCommits('chore: update dependencies')).toBe('patch');
      expect(detectBumpTypeFromCommits('refactor(timer): cleanup effects')).toBe('patch');
      expect(detectBumpTypeFromCommits('')).toBe('patch');
      expect(detectBumpTypeFromCommits('merge pull request #123')).toBe('patch');
    });
  });

  describe('calculateNextVersion', () => {
    it('increments patch correctly', () => {
      expect(calculateNextVersion('0.7.0', 'patch')).toBe('0.7.1');
      expect(calculateNextVersion('1.2.3', 'patch')).toBe('1.2.4');
    });

    it('increments minor correctly', () => {
      expect(calculateNextVersion('0.7.0', 'minor')).toBe('0.8.0');
      expect(calculateNextVersion('1.2.3', 'minor')).toBe('1.3.0');
    });

    it('increments major correctly', () => {
      expect(calculateNextVersion('0.7.0', 'major')).toBe('1.0.0');
      expect(calculateNextVersion('1.2.3', 'major')).toBe('2.0.0');
    });
  });
});
