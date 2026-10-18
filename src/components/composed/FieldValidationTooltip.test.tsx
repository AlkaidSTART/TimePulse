import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FieldValidationTooltip } from './FieldValidationTooltip';

describe('FieldValidationTooltip', () => {
  it('renders nothing when error is not provided', () => {
    const { container } = render(<FieldValidationTooltip />);
    expect(container.firstChild).toBeNull();
  });

  it('renders error message with alert role and correct id', () => {
    render(<FieldValidationTooltip id="test-error" error="请填写此字段" />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('id', 'test-error');
    expect(screen.getByText('请填写此字段')).toBeInTheDocument();
  });
});
