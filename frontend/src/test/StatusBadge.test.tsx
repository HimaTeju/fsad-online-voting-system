import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/common/StatusBadge';

describe('StatusBadge', () => {
  const cases: Array<[string, string]> = [
    ['APPROVED', 'Approved'],
    ['REJECTED', 'Rejected'],
    ['PENDING', 'Pending'],
    ['SUBMITTED', 'Submitted'],
    ['UNDER_REVIEW', 'Under review'],
    ['DRAFT', 'Draft'],
    ['NOMINATION_OPEN', 'Nominations open'],
    ['NOMINATION_CLOSED', 'Nominations closed'],
    ['VOTING_OPEN', 'Voting open'],
    ['VOTING_CLOSED', 'Voting closed'],
    ['RESULTS_DECLARED', 'Results declared'],
    ['ACTIVE', 'Active'],
    ['INACTIVE', 'Inactive'],
    ['FINALIZED', 'Finalized'],
  ];

  it.each(cases)('renders correct label for status %s', (status, expectedLabel) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });

  it('renders an unknown status as a formatted label', () => {
    render(<StatusBadge status="CUSTOM_STATUS" />);
    expect(screen.getByText('Custom status')).toBeInTheDocument();
  });

  it('renders a dot indicator element', () => {
    const { container } = render(<StatusBadge status="APPROVED" />);
    const spans = container.querySelectorAll('span');
    // outer badge + inner dot = 2 spans
    expect(spans.length).toBe(2);
  });
});
