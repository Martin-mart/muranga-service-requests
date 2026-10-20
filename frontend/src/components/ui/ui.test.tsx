import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StatusBadge } from './Badge';
import { Button } from './Button';
import { EmptyState, ErrorState } from './EmptyState';
import { Input } from './Input';

describe('StatusBadge', () => {
  it.each([
    ['pending', 'Pending', 'bx-time-five'],
    ['in_progress', 'In progress', 'bx-loader-circle'],
    ['resolved', 'Resolved', 'bx-check-circle'],
  ] as const)('shows %s as text plus an icon, never colour alone', (status, label, icon) => {
    const { container } = render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    const glyph = container.querySelector('i');
    expect(glyph).toHaveClass('bx', icon);
    expect(glyph).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Button', () => {
  it('is disabled and announces busy while loading', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Submit
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('icon-only buttons are named by aria-label', () => {
    render(<Button icon="bx-x" aria-label="Close dialog" />);
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
  });
});

describe('Input', () => {
  it('links label, hint and error for assistive technology', () => {
    render(
      <Input
        label="Email address"
        hint="We never share it"
        error="Enter a valid email address"
        required
      />,
    );
    const input = screen.getByLabelText(/Email address/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('We never share it Enter a valid email address');
  });
});

describe('EmptyState / ErrorState', () => {
  it('renders the title, text and action', () => {
    render(
      <EmptyState
        icon="bx-clipboard"
        title="No requests yet"
        text="Report your first issue"
        action={<a href="/new">New</a>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'No requests yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New' })).toBeInTheDocument();
  });

  it('error state is announced and offers a retry', async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Server unavailable" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Server unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
