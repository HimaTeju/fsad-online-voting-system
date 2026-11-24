import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { voterApi } from '../../api/voterApi';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/dateUtils';
import type { Election } from '../../types/election.types';

export default function ElectionListPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    voterApi.elections().then((r) => setElections(r.data.data ?? [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-wrap page-content">
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.8125rem', fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--muted)', marginBottom: '0.5rem',
        }}>Voter portal</p>
        <h1 className="h1">Elections</h1>
      </div>

      {elections.length === 0 ? (
        <div style={{
          background: 'var(--paper)', border: '1px solid var(--rule)',
          borderRadius: 'var(--radius)', padding: '3rem', textAlign: 'center',
        }}>
          <p style={{ fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--muted)' }}>No elections for your constituency yet. Elections appear here once you have a Voter ID.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {elections.map((e) => (
            <div key={e.id} style={{
              background: 'var(--paper)',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--radius)',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontWeight: 600, fontSize: '1rem',
                  color: 'var(--ink)', marginBottom: '0.3rem',
                }}>{e.title}</p>
                <p style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: '0.8125rem', color: 'var(--muted)',
                }}>
                  {e.constituencyName || 'National'} &middot; Voting: {formatDate(e.votingStart)} – {formatDate(e.votingEnd)}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                <StatusBadge status={e.status} />
                {e.status === 'VOTING_OPEN' && (e.hasVoted
                  ? <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.8125rem', fontWeight: 600, color: 'var(--success)' }}>Voted ✓</span>
                  : <Link to={`/vote/${e.id}`} className="btn btn-primary btn-sm">Vote now</Link>)}
                {e.status === 'RESULTS_DECLARED' && (
                  <Link to={`/results?election=${e.id}`} className="btn btn-secondary btn-sm">Results</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
