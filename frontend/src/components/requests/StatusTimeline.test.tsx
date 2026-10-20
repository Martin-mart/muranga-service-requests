import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { StatusHistoryEntry } from '../../types/api';
import { StatusTimeline } from './StatusTimeline';

const history: StatusHistoryEntry[] = [
  {
    id: '1',
    fromStatus: null,
    toStatus: 'pending',
    actorRole: 'citizen',
    actorName: null,
    note: null,
    createdAt: '2026-10-01T08:00:00+00:00',
  },
  {
    id: '2',
    fromStatus: 'pending',
    toStatus: 'in_progress',
    actorRole: 'admin',
    actorName: 'Officer Njeri',
    note: 'Crew dispatched',
    createdAt: '2026-10-02T09:00:00+00:00',
  },
];

describe('StatusTimeline', () => {
  it('shows each change with the officer note and the remaining step', () => {
    render(<StatusTimeline history={history} currentStatus="in_progress" />);
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Request received');
    expect(items[1]).toHaveTextContent('Crew dispatched');
    expect(items[2]).toHaveTextContent('ResolvedNot yet');
  });

  it('hides officer names from citizens but shows them to admins', () => {
    const { rerender } = render(<StatusTimeline history={history} currentStatus="in_progress" />);
    expect(screen.queryByText(/Officer Njeri/)).not.toBeInTheDocument();
    expect(screen.getByText(/Updated by a county officer/)).toBeInTheDocument();
    rerender(<StatusTimeline history={history} currentStatus="in_progress" showActorNames />);
    expect(screen.getByText(/Updated by Officer Njeri/)).toBeInTheDocument();
  });
});
