import { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Candidate } from '../../types/candidate.types';
import toast from 'react-hot-toast';

export default function ManageNominationsPage() {
  const [nominations, setNominations] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasonMap, setReasonMap] = useState<Record<number, string>>({});

  const load = () => {
    adminApi.getPendingNominations({ page: 0, size: 20 }).then((res) => {
      const payload = res.data.data;
      setNominations(Array.isArray(payload) ? payload : (payload?.content ?? []));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const review = async (id: number, approved: boolean) => {
    try {
      await adminApi.reviewNomination(id, { approved, rejectionReason: reasonMap[id] || '' });
      toast.success(approved ? 'Nomination approved' : 'Nomination rejected');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-wrap page-content">
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.8125rem', fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--muted)', marginBottom: '0.5rem',
        }}>Administration</p>
        <h1 className="h1">Pending nominations</h1>
      </div>

      {nominations.length === 0 ? (
        <div style={{
          background: 'var(--paper)', border: '1px solid var(--rule)',
          borderRadius: 'var(--radius)', padding: '3rem', textAlign: 'center',
        }}>
          <p style={{ fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--muted)' }}>
            All nominations have been reviewed.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {nominations.map((n) => (
            <div key={n.id} className="card-padded">
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
                <div>
                  <p style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontWeight: 600, fontSize: '1rem', color: 'var(--ink)',
                  }}>{n.fullName}</p>
                  <p style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.125rem',
                  }}>
                    {n.partyName || 'Independent'} · {n.electionTitle} · {n.constituencyName}
                  </p>
                </div>
              </div>

              {n.manifesto && (
                <p style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: '0.875rem', color: 'var(--ink-80)',
                  lineHeight: 1.6,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as any,
                  overflow: 'hidden',
                  marginBottom: '1rem',
                }}>{n.manifesto}</p>
              )}

              <hr className="divider" />

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  placeholder="Reason for rejection (if rejecting)"
                  value={reasonMap[n.id] || ''}
                  onChange={(e) => setReasonMap({ ...reasonMap, [n.id]: e.target.value })}
                  className="input"
                  style={{ flex: 1, minWidth: 200 }}
                />
                <button onClick={() => review(n.id, true)} className="btn btn-success btn-sm">
                  Approve
                </button>
                <button onClick={() => review(n.id, false)} className="btn btn-danger btn-sm">
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
