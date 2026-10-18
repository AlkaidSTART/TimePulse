import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import UserAvatar from './UserAvatar';

describe('UserAvatar', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders monogram initial when no avatarUrl is provided', () => {
    render(<UserAvatar name="Alkaid" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders image when avatarUrl is provided', () => {
    const avatarUrl = 'https://example.com/avatar.png';
    render(<UserAvatar avatarUrl={avatarUrl} name="Alkaid" />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', avatarUrl);
  });

  it('falls back to monogram initial when image onError is triggered', () => {
    const avatarUrl = 'https://example.com/broken-avatar.png';
    render(<UserAvatar avatarUrl={avatarUrl} name="Alkaid" />);
    const img = screen.getByRole('img');
    fireEvent.error(img);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('shows uploading spinner when isUploading is true', () => {
    render(<UserAvatar name="Alkaid" isUploading size="xl" />);
    expect(screen.getByText('上传中')).toBeInTheDocument();
  });

  it('triggers onUpload when a file is selected in editable mode', () => {
    const onUpload = vi.fn();
    const { container } = render(<UserAvatar name="Alkaid" editable onUpload={onUpload} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const file = new File(['dummy content'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload).toHaveBeenCalledWith(file);
  });
});
