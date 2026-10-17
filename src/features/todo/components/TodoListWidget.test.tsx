import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import TodoListWidget from './TodoListWidget';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import * as vibrationService from '@/services/vibration';

describe('TodoListWidget component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderWidget = (props = {}) => {
    return render(
      <ThemeProvider>
        <TodoListWidget {...props} />
      </ThemeProvider>,
    );
  };

  it('renders minimized button initially and expands on click', () => {
    renderWidget();
    const openBtn = screen.getByRole('button', { name: /打开待办与核对清单/i });
    expect(openBtn).toBeInTheDocument();

    fireEvent.click(openBtn);
    expect(screen.getByRole('button', { name: '切换到待办事项' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '切换到核对清单' })).toBeInTheDocument();
  });

  it('allows adding a new todo item and toggling completion to trigger haptics', async () => {
    const triggerHapticSpy = vi
      .spyOn(vibrationService, 'triggerHaptic')
      .mockResolvedValue(true);

    renderWidget({ isOpen: true });

    // 查找输入框并输入
    const input = screen.getByPlaceholderText(/添加新待办/i);
    fireEvent.change(input, { target: { value: '我的重要任务ABC' } });

    const addBtn = screen.getByRole('button', { name: /添加/i });
    fireEvent.click(addBtn);

    expect(screen.getByText('我的重要任务ABC')).toBeInTheDocument();

    // 找到该待办的勾选按钮
    const toggleBtn = screen.getByRole('button', { name: '将我的重要任务ABC标记为已完成' });
    fireEvent.click(toggleBtn);

    // 验证调用了系统振动 API！
    await waitFor(() => {
      expect(triggerHapticSpy).toHaveBeenCalledWith('item_complete');
    });
  });

  it('switches tabs between todo and checklist', () => {
    renderWidget({ isOpen: true });

    const checklistTab = screen.getByRole('button', { name: '切换到核对清单' });
    fireEvent.click(checklistTab);

    expect(screen.getByPlaceholderText(/添加检查项/i)).toBeInTheDocument();
  });

  it('renders correctly in English when ?lang=en is present', async () => {
    delete (window as any).location;
    (window as any).location = new URL('https://example.com/?lang=en');

    renderWidget({ isOpen: true });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Switch to Checklist' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Switch to Tasks' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Add task, press Enter/i)).toBeInTheDocument();
    });
  });
});
