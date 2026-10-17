import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import TodoItemRow from './TodoItemRow';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import type { TodoItem } from '../types';

describe('TodoItemRow component', () => {
  afterEach(() => {
    cleanup();
  });

  const baseItem: TodoItem = {
    id: 'test-1',
    text: '完成重要工作事项',
    completed: false,
    createdAt: Date.now(),
    type: 'todo',
  };

  const renderRow = (props?: Partial<React.ComponentProps<typeof TodoItemRow>>) => {
    const defaultProps: React.ComponentProps<typeof TodoItemRow> = {
      item: baseItem,
      onToggle: vi.fn(),
      onDelete: vi.fn(),
      onEdit: vi.fn(),
      onSetPriority: vi.fn(),
      ...props,
    };

    return render(
      <ThemeProvider>
        <TodoItemRow {...defaultProps} />
      </ThemeProvider>,
    );
  };

  it('renders item text cleanly without inline light indicator badge', () => {
    renderRow({
      item: {
        ...baseItem,
        color: '#EF4444',
        priority: 'urgent',
      },
    });

    expect(screen.getByText('完成重要工作事项')).toBeInTheDocument();
    // 确认不再有独立的内联 P1 指示灯徽标
    expect(screen.queryByText('P1')).not.toBeInTheDocument();
  });

  it('applies priority color directly to the row card background and border styles', () => {
    const { container } = renderRow({
      item: {
        ...baseItem,
        color: '#EF4444',
        priority: 'urgent',
      },
    });

    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();
    // 检查是否注入了优先级变色的 CSS 变量
    expect(card.style.getPropertyValue('--todo-item-color')).toBe('#EF4444');
    expect(card.style.backgroundColor).toContain('var(--todo-item-bg)');
    expect(card.style.borderColor).toContain('var(--todo-item-border)');
  });

  it('does not render priority flag button in action area to keep row clean', () => {
    const onSetPriority = vi.fn();
    renderRow({
      item: {
        ...baseItem,
        color: '#EF4444',
        priority: 'urgent',
      },
      onSetPriority,
    });

    expect(screen.queryByRole('button', { name: /修改或清除优先级颜色|设置优先级颜色/i })).not.toBeInTheDocument();
  });
});
