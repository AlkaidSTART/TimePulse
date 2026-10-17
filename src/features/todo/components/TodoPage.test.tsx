import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import TodoPage from './TodoPage';
import TodoListWidget from './TodoListWidget';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import * as vibrationService from '@/services/vibration';

describe('TodoPage component and Widget coexistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderPage = (props = {}) => {
    return render(
      <ThemeProvider>
        <TodoPage {...props} />
      </ThemeProvider>,
    );
  };

  it('renders TodoPage full page view with title, tabs, input and navigation buttons', () => {
    const onBack = vi.fn();
    const onOpenAsWidget = vi.fn();

    renderPage({ onBack, onOpenAsWidget });

    expect(screen.getByRole('heading', { name: '待办与核对清单' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回计时器' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '切回桌面小窗挂件模式' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '切换到待办事项' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '切换到核对清单' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '返回计时器' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '切回桌面小窗挂件模式' }));
    expect(onOpenAsWidget).toHaveBeenCalledTimes(1);
  });

  it('allows adding and completing todo items on TodoPage', async () => {
    const triggerHapticSpy = vi
      .spyOn(vibrationService, 'triggerHaptic')
      .mockResolvedValue(true);

    renderPage();

    const input = screen.getByPlaceholderText(/添加新的待办事项/i);
    fireEvent.change(input, { target: { value: '全屏页面测试任务' } });
    const addBtn = screen.getByRole('button', { name: /添加/i });
    fireEvent.click(addBtn);

    fireEvent.change(input, { target: { value: '第二项全屏任务' } });
    fireEvent.click(addBtn);

    expect(screen.getByText('全屏页面测试任务')).toBeInTheDocument();
    expect(screen.getByText('第二项全屏任务')).toBeInTheDocument();

    const toggleBtn = screen.getByRole('button', { name: '将全屏页面测试任务标记为已完成' });
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(triggerHapticSpy).toHaveBeenCalledWith('item_complete');
    });
  });

  it('triggers onOpenAsPage when clicking maximize in TodoListWidget', () => {
    const onOpenAsPage = vi.fn();
    render(
      <ThemeProvider>
        <TodoListWidget isOpen={true} onOpenAsPage={onOpenAsPage} />
      </ThemeProvider>,
    );

    const maxBtn = screen.getByRole('button', { name: '在独立新页面打开' });
    expect(maxBtn).toBeInTheDocument();

    fireEvent.click(maxBtn);
    expect(onOpenAsPage).toHaveBeenCalledTimes(1);
  });

  it('triggers onHideWidget when clicking hide in TodoListWidget', () => {
    const onHideWidget = vi.fn();
    render(
      <ThemeProvider>
        <TodoListWidget isOpen={true} onHideWidget={onHideWidget} />
      </ThemeProvider>,
    );

    const hideBtn = screen.getByRole('button', { name: '隐藏桌面悬浮挂件' });
    expect(hideBtn).toBeInTheDocument();

    fireEvent.click(hideBtn);
    expect(onHideWidget).toHaveBeenCalledTimes(1);
  });
});

