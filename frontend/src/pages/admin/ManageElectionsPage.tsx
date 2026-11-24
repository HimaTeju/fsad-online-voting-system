import { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { StatusBadge } from '../../components/common/StatusBadge';
import type { Election } from '../../types/election.types';
import { Link } from 'react-router-dom';
import { formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

const NEXT_STATUS: Record<string, string> = {
  DRAFT: 'NOMINATION_OPEN',
  NOMINATION_OPEN: 'NOMINATION_CLOSED',
  NOMINATION_CLOSED: 'VOTING_OPEN',
  VOTING_OPEN: 'VOTING_CLOSED',
};

const NEXT_LABEL: Record<string, string> = {
  DRAFT: 'Open nominations',
  NOMINATION_OPEN: 'Close nominations',
  NOMINATION_CLOSED: 'Open voting',
  VOTING_OPEN: 'Close voting',
};

export default function ManageElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    adminApi.listElections({ page: 0, size: 20 }).then((res) => {
      const payload = res.data.data;
      setElections(Array.isArray(payload) ? payload : (payload?.content ?? []));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const advance = async (id: number, current: string) => {
    const next = NEXT_STATUS[current];
    if (!next) return;
    try {
      await adminApi.updateElectionStatus(id, next);
      toast.success(`Advanced to ${next.replace(/_/g, ' ').toLowerCase()}`);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-wrap page-content">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '0.8125rem', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--muted)', marginBottom: '0.5rem',
          }}>Administration</p>
          <h1 className="h1">Manage elections</h1>
        </div>
        <Link to="/admin/elections/new" className="btn btn-primary">
          + New election
        </Link>
      </div>

      {elections.length === 0 ? (
        <div style={{
          background: 'var(--paper)', border: '1px solid var(--rule)',
          borderRadius: 'var(--radius)', padding: '3rem', textAlign: 'center',
        }}>
          <p style={{ fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--muted)' }}>No elections yet.</p>
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
                  color: 'var(--ink)', marginBottom: '0.25rem',
                }}>{e.title}</p>
                <p style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: '0.8125rem', color: 'var(--muted)',
                }}>
                  {e.constituencyName || 'National'} · Voting from {formatDate(e.votingStart)}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                <StatusBadge status={e.status} />
                {NEXT_STATUS[e.status] && (
                  <button onClick={() => advance(e.id, e.status)}
                    className="btn btn-secondary btn-sm">
                    {NEXT_LABEL[e.status]} →
                  </button>
                )}
                {e.status === 'VOTING_CLOSED' && (
                  <Link to={`/admin/results/${e.id}`} className="btn btn-secondary btn-sm">
                    Enter results &amp; declare →
                  </Link>
                )}
                {e.status === 'RESULTS_DECLARED' && (
                  <Link to={`/admin/results/${e.id}`} className="btn btn-ghost btn-sm">
                    View results
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
