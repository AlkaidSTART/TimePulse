import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import AboutVersionModal from './AboutVersionModal';
import { useVersionStore } from '@/stores';
import { GITHUB_RELEASES_URL } from '@/constants/version';

describe('AboutVersionModal component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    useVersionStore.setState({
      currentVersion: '0.7.0',
      latestVersion: null,
      hasUpdate: false,
      isChecking: false,
      lastCheckError: null,
      lastCheckedTime: null,
      releaseInfo: null,
      downloadUrl: GITHUB_RELEASES_URL,
      isAboutModalOpen: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when isAboutModalOpen is false', () => {
    render(<AboutVersionModal />);
    expect(screen.queryByText('当前版本')).not.toBeInTheDocument();
  });

  it('renders modal with current version and up-to-date state', () => {
    useVersionStore.setState({
      isAboutModalOpen: true,
      currentVersion: '0.7.0',
      hasUpdate: false,
    });

    render(<AboutVersionModal />);
    expect(screen.getByText('当前版本')).toBeInTheDocument();
    expect(screen.getByText('v0.7.0')).toBeInTheDocument();
    expect(screen.getByText('当前已是最新版本')).toBeInTheDocument();
  });

  it('displays update notice and release download button when hasUpdate is true', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    useVersionStore.setState({
      isAboutModalOpen: true,
      currentVersion: '0.7.0',
      latestVersion: '0.8.0',
      hasUpdate: true,
      releaseInfo: {
        tagName: 'v0.8.0',
        version: '0.8.0',
        name: 'TimePulse v0.8.0 正式版',
        body: '新功能发布',
        publishedAt: '2026-10-18T00:00:00Z',
        htmlUrl: GITHUB_RELEASES_URL,
      },
    });

    render(<AboutVersionModal />);
    expect(screen.getByText(/发现新版本.*v0\.8\.0/)).toBeInTheDocument();
    expect(screen.getByText('TimePulse v0.8.0 正式版')).toBeInTheDocument();

    const downloadBtn = screen.getByRole('button', { name: /前往 GitHub Releases 下载/i });
    expect(downloadBtn).toBeInTheDocument();
    fireEvent.click(downloadBtn);

    expect(openSpy).toHaveBeenCalledWith(
      GITHUB_RELEASES_URL,
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('triggers manual check update on button click', () => {
    const checkSpy = vi.fn();
    useVersionStore.setState({
      isAboutModalOpen: true,
      checkUpdate: checkSpy,
    });

    render(<AboutVersionModal />);
    const checkBtn = screen.getByRole('button', { name: /检查更新/i });
    fireEvent.click(checkBtn);

    expect(checkSpy).toHaveBeenCalledWith({ manual: true });
  });

  it('closes modal when close button is clicked', () => {
    const closeSpy = vi.fn();
    useVersionStore.setState({
      isAboutModalOpen: true,
    });

    render(<AboutVersionModal onClose={closeSpy} />);
    const closeBtn = screen.getByRole('button', { name: '关闭' });
    fireEvent.click(closeBtn);

    expect(useVersionStore.getState().isAboutModalOpen).toBe(false);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('renders Buy Me a Coffee tab content when activeAboutTab is coffee', () => {
    useVersionStore.setState({
      isAboutModalOpen: true,
      activeAboutTab: 'coffee',
    });

    render(<AboutVersionModal />);
    expect(screen.getByText(/Buy Me a Coffee/i)).toBeInTheDocument();
    expect(screen.getByAltText(/赞赏码/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /保存赞赏码图片/i })).toBeInTheDocument();
  });

  it('renders Contact Author tab content when activeAboutTab is contact', () => {
    useVersionStore.setState({
      isAboutModalOpen: true,
      activeAboutTab: 'contact',
    });

    render(<AboutVersionModal />);
    expect(screen.getByText(/Contact Alkaid/i)).toBeInTheDocument();
    expect(screen.getByAltText(/WeChat QR Code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /保存微信二维码/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /复制微信号/i })).toBeInTheDocument();
  });

  it('switches tabs smoothly when clicking tab buttons', async () => {
    useVersionStore.setState({
      isAboutModalOpen: true,
      activeAboutTab: 'version',
    });

    render(<AboutVersionModal />);
    expect(screen.getByText('当前版本')).toBeInTheDocument();

    // Switch to coffee tab
    const coffeeTabBtn = screen.getByRole('button', { name: /请喝咖啡/i });
    fireEvent.click(coffeeTabBtn);
    expect(useVersionStore.getState().activeAboutTab).toBe('coffee');
    await waitFor(() => {
      expect(screen.getByAltText(/赞赏码/i)).toBeInTheDocument();
    });

    // Switch to contact tab
    const contactTabBtn = screen.getByRole('button', { name: /联系作者/i });
    fireEvent.click(contactTabBtn);
    expect(useVersionStore.getState().activeAboutTab).toBe('contact');
    await waitFor(() => {
      expect(screen.getByAltText(/WeChat QR Code/i)).toBeInTheDocument();
    });
  });
});
