import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import LazyImage from './LazyImage';

describe('LazyImage component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders image element with loading=lazy and decoding=async', () => {
    render(<LazyImage src="/website-qr.png" alt="QR Code" width={200} height={200} />);
    const img = screen.getByAltText('QR Code');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
    expect(img).toHaveAttribute('src', '/website-qr.png');
  });

  it('handles onLoad callback and toggles opacity class', () => {
    const handleLoad = vi.fn();
    render(<LazyImage src="/logo.png" alt="Logo" onLoad={handleLoad} />);
    const img = screen.getByAltText('Logo');

    fireEvent.load(img);
    expect(handleLoad).toHaveBeenCalled();
    expect(img.className).toContain('opacity-100');
  });

  it('renders fallback when image errors', () => {
    render(
      <LazyImage
        src="/not-found.png"
        alt="Missing Image"
        fallback={<div>Fallback Content</div>}
      />,
    );
    const img = screen.getByAltText('Missing Image');
    fireEvent.error(img);

    expect(screen.getByText('Fallback Content')).toBeInTheDocument();
  });
});
