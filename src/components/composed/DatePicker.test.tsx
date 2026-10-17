import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import DatePicker from './DatePicker';
import { format } from 'date-fns';

describe('DatePicker component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders with placeholder when no value is provided', () => {
    render(<DatePicker placeholder="选择目标日期" />);
    expect(screen.getByText('选择目标日期')).toBeInTheDocument();
  });

  it('renders formatted value when provided', () => {
    render(<DatePicker value="2026-10-18" />);
    expect(screen.getByText('2026-10-18')).toBeInTheDocument();
  });

  it('opens calendar popover when trigger is clicked', () => {
    render(<DatePicker value="2026-10-18" />);
    const trigger = screen.getByTestId('datepicker-trigger');
    fireEvent.click(trigger);

    // Popover content should now be visible
    expect(screen.getByText('2026年10月')).toBeInTheDocument();
    expect(screen.getByText('清除')).toBeInTheDocument();
    expect(screen.getByText('今天')).toBeInTheDocument();
  });

  it('selects date when day is clicked', () => {
    const handleChange = vi.fn();
    render(<DatePicker value="2026-10-18" onChange={handleChange} />);
    
    const trigger = screen.getByTestId('datepicker-trigger');
    fireEvent.click(trigger);

    // Click on 20th
    const day20 = screen.getByRole('button', { name: '20' });
    fireEvent.click(day20);

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: '2026-10-20',
        }),
      }),
    );
  });

  it('selects today when 今天 button is clicked', () => {
    const handleChange = vi.fn();
    render(<DatePicker value="2026-10-18" onChange={handleChange} />);

    const trigger = screen.getByTestId('datepicker-trigger');
    fireEvent.click(trigger);

    const todayButton = screen.getByRole('button', { name: '今天' });
    fireEvent.click(todayButton);

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: todayStr,
        }),
      }),
    );
  });

  it('clears date when 清除 button is clicked', () => {
    const handleChange = vi.fn();
    render(<DatePicker value="2026-10-18" onChange={handleChange} />);

    const trigger = screen.getByTestId('datepicker-trigger');
    fireEvent.click(trigger);

    const clearButton = screen.getByRole('button', { name: '清除' });
    fireEvent.click(clearButton);

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: '',
        }),
      }),
    );
  });

  it('switches between days, months, and years views', () => {
    render(<DatePicker value="2026-10-18" />);
    const trigger = screen.getByTestId('datepicker-trigger');
    fireEvent.click(trigger);

    const headerButton = screen.getByText('2026年10月');
    // Click header to switch to months view
    fireEvent.click(headerButton);
    expect(screen.getByText('10月')).toBeInTheDocument();

    // Click 5月
    fireEvent.click(screen.getByText('5月'));
    // Should switch back to days view with 2026年5月
    expect(screen.getByText('2026年5月')).toBeInTheDocument();
  });
});
