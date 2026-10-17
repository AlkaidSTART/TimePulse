import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PriorityColorPicker from './PriorityColorPicker';
import { ThemeProvider } from '@/app/providers/ThemeProvider';

describe('PriorityColorPicker component', () => {
  const renderPicker = (props: React.ComponentProps<typeof PriorityColorPicker>) => {
    return render(
      <ThemeProvider>
        <PriorityColorPicker {...props} />
      </ThemeProvider>,
    );
  };

  it('renders default flag button when no color is assigned', () => {
    const onSelect = vi.fn();
    renderPicker({ onSelect });

    const trigger = screen.getByRole('button', { name: /设置优先级颜色/i });
    expect(trigger).toBeInTheDocument();
  });

  it('renders active color badge when color is set', () => {
    const onSelect = vi.fn();
    renderPicker({ color: '#EF4444', priority: 'urgent', onSelect, showText: true });

    expect(screen.getByText('P1')).toBeInTheDocument();
  });

  it('opens color presets list upon clicking trigger and allows selecting a priority preset', () => {
    const onSelect = vi.fn();
    renderPicker({ onSelect });

    const trigger = screen.getByRole('button', { name: /设置优先级颜色/i });
    fireEvent.click(trigger);

    expect(screen.getByText('优先级标记颜色')).toBeInTheDocument();
    expect(screen.getByText(/最高优先 \(P1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/高优先级 \(P2\)/i)).toBeInTheDocument();

    const p1Btn = screen.getByText(/最高优先 \(P1\)/i);
    fireEvent.click(p1Btn);

    expect(onSelect).toHaveBeenCalledWith('#EF4444', 'urgent');
  });

  it('allows clearing priority color', () => {
    const onSelect = vi.fn();
    renderPicker({ color: '#EF4444', priority: 'urgent', onSelect });

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    const clearBtn = screen.getByText('清除优先级标记');
    fireEvent.click(clearBtn);

    expect(onSelect).toHaveBeenCalledWith(undefined, undefined);
  });
});
