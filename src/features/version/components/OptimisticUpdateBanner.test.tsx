import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import OptimisticUpdateBanner from './OptimisticUpdateBanner';
import { useVersionStore } from '@/stores';
import { GITHUB_RELEASES_URL } from '@/constants/version';

describe('OptimisticUpdateBanner component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    useVersionStore.setState({
      isBannerVisible: false,
      latestVersion: null,
      hasUpdate: false,
      downloadUrl: GITHUB_RELEASES_URL,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when isBannerVisible is false', () => {
    render(<OptimisticUpdateBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders optimistic notification banner when isBannerVisible is true', () => {
    useVersionStore.setState({
      isBannerVisible: true,
      latestVersion: '0.8.0',
      hasUpdate: true,
      downloadUrl: GITHUB_RELEASES_URL,
    });

    render(<OptimisticUpdateBanner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('发现新版本')).toBeInTheDocument();
    expect(screen.getByText('v0.8.0')).toBeInTheDocument();
    expect(screen.getByText(/本版本仅乐观提醒一次/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /前往下载/i })).toBeInTheDocument();
  });

  it('opens download releases URL and dismisses banner when download button is clicked', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    useVersionStore.setState({
      isBannerVisible: true,
      latestVersion: '0.8.0',
      hasUpdate: true,
      downloadUrl: GITHUB_RELEASES_URL,
    });

    render(<OptimisticUpdateBanner />);
    const downloadBtn = screen.getByRole('button', { name: /前往下载/i });
    fireEvent.click(downloadBtn);

    expect(openSpy).toHaveBeenCalledWith(
      GITHUB_RELEASES_URL,
      '_blank',
      'noopener,noreferrer'
    );
    expect(useVersionStore.getState().isBannerVisible).toBe(false);
  });

  it('dismisses banner when "知道了" button is clicked', () => {
    useVersionStore.setState({
      isBannerVisible: true,
      latestVersion: '0.8.0',
      hasUpdate: true,
    });

    render(<OptimisticUpdateBanner />);
    const dismissBtn = screen.getByRole('button', { name: '知道了' });
    fireEvent.click(dismissBtn);

    expect(useVersionStore.getState().isBannerVisible).toBe(false);
  });
});
