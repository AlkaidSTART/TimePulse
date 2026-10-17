import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  Dock,
  DockItem,
  DockIcon,
  DockLabel,
  AppleStyleDock,
  defaultAppleDockData,
} from './dock';
import { HomeIcon, SunMoon } from 'lucide-react';

describe('Dock component suite', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders Dock and DockItems correctly', () => {
    const handleClick = vi.fn();

    render(
      <Dock>
        <DockItem onClick={handleClick} aria-label="Home Item">
          <DockLabel>Home</DockLabel>
          <DockIcon>
            <HomeIcon data-testid="home-icon" />
          </DockIcon>
        </DockItem>
      </Dock>
    );

    const button = screen.getByRole('button', { name: /Home/i });
    expect(button).toBeDefined();
    expect(screen.getByTestId('home-icon')).toBeDefined();

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard navigation (Enter and Space keys)', () => {
    const handleClick = vi.fn();

    render(
      <Dock>
        <DockItem onClick={handleClick} aria-label="Action Item">
          <DockLabel>Action</DockLabel>
          <DockIcon>
            <SunMoon />
          </DockIcon>
        </DockItem>
      </Dock>
    );

    const item = screen.getByRole('button', { name: /Action/i });
    fireEvent.keyDown(item, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(item, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('renders running dot indicator when isActive is true', () => {
    const { container } = render(
      <Dock>
        <DockItem isActive={true}>
          <DockLabel>Active App</DockLabel>
          <DockIcon>
            <HomeIcon />
          </DockIcon>
        </DockItem>
      </Dock>
    );

    const dot = container.querySelector('span.rounded-full.size-1');
    expect(dot).toBeDefined();
  });

  it('renders AppleStyleDock with default data correctly', () => {
    render(<AppleStyleDock />);

    expect(defaultAppleDockData.length).toBe(7);
    expect(screen.getByRole('button', { name: /Home/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Products/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Components/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Activity/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Change Log/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Email/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Theme/i })).toBeDefined();
  });

  it('calls custom onItemClick callback when dock item is clicked', () => {
    const onItemClick = vi.fn();
    render(<AppleStyleDock onItemClick={onItemClick} />);

    const homeItem = screen.getByRole('button', { name: /Home/i });
    fireEvent.click(homeItem);

    expect(onItemClick).toHaveBeenCalledTimes(1);
    expect(onItemClick).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Home' }),
      0
    );
  });
});
