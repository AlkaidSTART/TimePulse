import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import { TextEffect } from './text-effect';

describe('TextEffect component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders children with accessible sr-only text', () => {
    render(<TextEffect>Animate your ideas</TextEffect>);
    expect(screen.getByText('Animate your ideas')).toBeDefined();
  });

  it('renders Chinese text correctly with per="char"', () => {
    const chineseQuote = '生活不在别处，脚下即是前方。';
    const { container } = render(
      <TextEffect per="char" preset="fade-in-blur">
        {chineseQuote}
      </TextEffect>
    );

    expect(screen.getByText(chineseQuote)).toBeDefined();
    // Verify each character is segmented into spans
    const spans = container.querySelectorAll('span[aria-hidden="true"]');
    expect(spans.length).toBe(chineseQuote.length);
  });

  it('renders Chinese text correctly with per="word"', () => {
    const chineseQuote = '生活不在别处，脚下即是前方。';
    const { container } = render(
      <TextEffect per="word" preset="fade">
        {chineseQuote}
      </TextEffect>
    );

    expect(screen.getByText(chineseQuote)).toBeDefined();
    const spans = container.querySelectorAll('span[aria-hidden="true"]');
    expect(spans.length).toBeGreaterThan(0);
  });

  it('supports per="line"', () => {
    const multiline = 'Line 1\nLine 2';
    const { container } = render(
      <TextEffect per="line" preset="slide">
        {multiline}
      </TextEffect>
    );

    const blocks = container.querySelectorAll('.block');
    expect(blocks.length).toBe(2);
  });
});
