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

  it('triggers rightward rolling exit animation and invokes onDelete after animation delay', async () => {
    vi.useFakeTimers();
    try {
      const onDelete = vi.fn();
      const { container } = renderRow({ onDelete });

      const card = container.firstChild as HTMLElement;
      const deleteBtn = screen.getByRole('button', { name: '删除' });

      // 点击删除按钮触发删除动画
      fireEvent.click(deleteBtn);

      // 应立即应用向右滚动移出的 transform 与退出样式
      expect(card.style.transform).toContain('translateX(120%)');
      expect(card.style.transform).toContain('rotate(8deg)');
      expect(card.style.opacity).toBe('0');
      expect(card.style.maxHeight).toBe('0px');
      expect(card.style.overflow).toBe('hidden');

      // 动画完成前不应立即触发 onDelete
      expect(onDelete).not.toHaveBeenCalled();

      // 快进动画时间
      vi.advanceTimersByTime(360);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith('test-1');
    } finally {
      vi.useRealTimers();
    }
  });

  it('applies rightward roll-out transform when isDeleting prop is true', () => {
    const { container } = renderRow({ isDeleting: true });
    const card = container.firstChild as HTMLElement;

    expect(card.style.transform).toContain('translateX(120%)');
    expect(card.style.transform).toContain('rotate(8deg)');
    expect(card.style.opacity).toBe('0');
    expect(card.style.maxHeight).toBe('0px');
  });
});
