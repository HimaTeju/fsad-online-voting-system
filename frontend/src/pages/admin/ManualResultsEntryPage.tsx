import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { resultApi } from '../../api/resultApi';
import { electionApi } from '../../api/electionApi';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Candidate } from '../../types/candidate.types';
import toast from 'react-hot-toast';

export default function ManualResultsEntryPage() {
  const { electionId } = useParams<{ electionId: string }>();
  const id = Number(electionId);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      electionApi.getCandidates(id),
      resultApi.getResults(id).catch(() => null),
    ]).then(([candRes]) => {
      setCandidates(candRes.data.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      const results = Object.entries(votes).map(([candidateId, manualBoothVotes]) => ({
        candidateId: Number(candidateId), manualBoothVotes,
      }));
      await adminApi.enterManualResults(id, { results });
      toast.success('Booth results saved');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const finalize = async () => {
    if (!confirm('Finalise and publish results? This cannot be undone.')) return;
    try {
      await adminApi.finalizeResults(id);
      toast.success('Results finalised and published');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Finalization failed');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-wrap-sm page-content">
      <div style={{ marginBottom: '2rem' }}>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.8125rem', fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--muted)', marginBottom: '0.5rem',
        }}>Administration</p>
        <h1 className="h1" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>Enter booth results</h1>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.9375rem', color: 'var(--muted)', marginTop: '0.5rem',
        }}>
          Enter the physical booth vote counts for each candidate. Online votes are read-only.
        </p>
      </div>

      <div className="card-padded" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 120px 160px',
          gap: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--rule)',
          marginBottom: '0.25rem',
        }}>
          {['Candidate', 'Online votes', 'Booth votes'].map((h) => (
            <span key={h} style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: '0.75rem', fontWeight: 600,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--muted)',
              textAlign: h !== 'Candidate' ? 'right' : 'left',
            }}>{h}</span>
          ))}
        </div>

        {candidates.map((c) => (
          <div key={c.id} style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px 160px',
            gap: '1rem',
            alignItems: 'center',
            padding: '1rem 0',
            borderBottom: '1px solid var(--rule)',
          }}>
            <div>
              <p style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ink)',
              }}>{c.fullName}</p>
              <p style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '0.8125rem', color: 'var(--muted)',
              }}>{c.partyName || 'Independent'}</p>
            </div>
            <div style={{
              textAlign: 'right',
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 600, fontSize: '1rem', color: 'var(--ink)',
            }}>
              {c.onlineVoteCount.toLocaleString()}
            </div>
            <input
              type="number" min={0}
              placeholder="0"
              value={votes[c.id] ?? ''}
              onChange={(e) => setVotes({ ...votes, [c.id]: Number(e.target.value) })}
              className="input"
              style={{ textAlign: 'right', fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600 }}
            />
          </div>
        ))}

        <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1.25rem' }}>
          <button onClick={save} disabled={saving} className="btn btn-secondary" style={{ flex: 1, padding: '0.75rem' }}>
            {saving ? 'Saving…' : 'Save booth results'}
          </button>
          <button onClick={finalize} className="btn btn-success" style={{ flex: 1, padding: '0.75rem' }}>
            Finalise &amp; publish
          </button>
        </div>
      </div>
    </div>
  );
}
