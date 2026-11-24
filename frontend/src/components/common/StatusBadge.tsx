type StatusVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

const STATUS_MAP: Record<string, StatusVariant> = {
  APPROVED: 'success',
  ACTIVE: 'success',
  RESULTS_DECLARED: 'success',
  FINALIZED: 'success',
  VERIFIED: 'success',
  REJECTED: 'danger',
  VOTING_CLOSED: 'danger',
  PENDING: 'warning',
  UNDER_REVIEW: 'warning',
  SUBMITTED: 'warning',
  NOMINATION_OPEN: 'info',
  VOTING_OPEN: 'info',
  OPEN: 'info',
  NOMINATION_CLOSED: 'neutral',
  DRAFT: 'neutral',
  INACTIVE: 'neutral',
};

const STYLES: Record<StatusVariant, { bg: string; color: string; dot: string }> = {
  success: { bg: 'rgba(45,122,79,0.1)', color: 'var(--success)', dot: 'var(--success)' },
  danger:  { bg: 'rgba(192,57,43,0.1)', color: 'var(--danger)',  dot: 'var(--danger)' },
  warning: { bg: 'rgba(180,83,9,0.1)',  color: 'var(--warn)',    dot: 'var(--warn)' },
  info:    { bg: 'rgba(232,98,42,0.1)', color: 'var(--saffron)', dot: 'var(--saffron)' },
  neutral: { bg: 'rgba(15,25,35,0.06)', color: 'var(--muted)',   dot: 'var(--muted)' },
};

const LABELS: Record<string, string> = {
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PENDING: 'Pending',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  VERIFIED: 'Verified',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  DRAFT: 'Draft',
  NOMINATION_OPEN: 'Nominations open',
  NOMINATION_CLOSED: 'Nominations closed',
  VOTING_OPEN: 'Voting open',
  VOTING_CLOSED: 'Voting closed',
  RESULTS_DECLARED: 'Results declared',
  FINALIZED: 'Finalized',
  OPEN: 'Open',
};

interface Props {
  status: string;
}

export function StatusBadge({ status }: Props) {
  const variant = STATUS_MAP[status] ?? 'neutral';
  const style = STYLES[variant];
  const label = LABELS[status] ?? status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.375rem',
      fontFamily: "'Inter', system-ui, sans-serif",
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.01em',
      padding: '0.25rem 0.625rem',
      borderRadius: 99,
      background: style.bg,
      color: style.color,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: style.dot,
        flexShrink: 0,
      }} />
      {label}
    </span>
  );
}
