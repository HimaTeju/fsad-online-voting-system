import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { electionApi } from '../../api/electionApi';
import { LiveVoteChart } from '../../components/election/LiveVoteChart';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Candidate } from '../../types/candidate.types';
import type { Election } from '../../types/election.types';
import toast from 'react-hot-toast';

export default function VotingPage() {
  const { electionId } = useParams<{ electionId: string }>();
  const id = Number(electionId);
  const navigate = useNavigate();
  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    Promise.all([
      electionApi.getById(id),
      electionApi.getCandidates(id),
      import('../../api/axiosClient').then(({ default: ax }) => ax.get(`/voter/vote-status/${id}`)),
    ]).then(([elRes, candRes, statusRes]) => {
      setElection(elRes.data.data);
      setCandidates(candRes.data.data);
      setHasVoted(!!statusRes.data.data.voted);
    });
  }, [id]);

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await electionApi.castVote(id, selected);
      toast.success('Your vote has been recorded.');
      navigate('/voter');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cast vote');
    } finally {
      setSubmitting(false);
    }
  };

  if (!election) return <LoadingSpinner />;

  if (hasVoted) {
    return (
      <div className="page-wrap page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{
            width: 64, height: 64,
            background: 'rgba(45,122,79,0.1)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <h2 className="h2" style={{ marginBottom: '0.5rem' }}>Vote recorded</h2>
          <p style={{ fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--muted)', fontSize: '0.9375rem' }}>
            You have already voted in {election.title}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap page-content">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.8125rem', fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--muted)', marginBottom: '0.5rem',
        }}>Cast your vote</p>
        <h1 className="h1" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}>{election.title}</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2rem', alignItems: 'start' }}>
        {/* Candidate selection */}
        <div>
          <p style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '0.875rem',
            color: 'var(--muted)',
            marginBottom: '1.25rem',
          }}>
            Select one candidate, then confirm your vote. This action cannot be undone.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {candidates.map((c) => {
              const isSelected = selected === c.id;
              return (
                <label key={c.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius)',
                  border: `2px solid ${isSelected ? 'var(--saffron)' : 'var(--rule)'}`,
                  background: isSelected ? 'rgba(232,98,42,0.04)' : 'var(--paper)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                  boxShadow: isSelected ? '0 0 0 3px rgba(232,98,42,0.1)' : 'none',
                }}>
                  <input type="radio" name="candidate" value={c.id}
                    onChange={() => setSelected(c.id)} style={{ display: 'none' }} />

                  {/* Avatar */}
                  {c.photoUrl ? (
                    <img src={c.photoUrl} alt={c.fullName}
                      style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: isSelected ? 'var(--saffron)' : 'rgba(15,25,35,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Inter', system-ui, sans-serif",
                      fontWeight: 700, fontSize: '1.125rem',
                      color: isSelected ? '#fff' : 'var(--ink-80)',
                      flexShrink: 0,
                      transition: 'background 0.15s, color 0.15s',
                    }}>
                      {c.fullName.charAt(0)}
                    </div>
                  )}

                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontFamily: "'Inter', system-ui, sans-serif",
                      fontWeight: 600, fontSize: '0.9375rem',
                      color: 'var(--ink)',
                    }}>{c.fullName}</p>
                    <p style={{
                      fontFamily: "'Inter', system-ui, sans-serif",
                      fontSize: '0.8125rem', color: 'var(--muted)',
                    }}>
                      {c.partyName || 'Independent'}
                      {c.constituencyName && ` · ${c.constituencyName}`}
                    </p>
                  </div>

                  {isSelected && (
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'var(--saffron)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </div>
                  )}
                </label>
              );
            })}
          </div>

          <button onClick={submit} disabled={!selected || submitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', fontWeight: 600 }}>
            {submitting ? 'Submitting…' : 'Confirm vote'}
          </button>

          {!selected && (
            <p style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: '0.8125rem', color: 'var(--muted)',
              textAlign: 'center', marginTop: '0.625rem',
            }}>Select a candidate above to continue</p>
          )}
        </div>

        {/* Live chart */}
        <div style={{ position: 'sticky', top: 72 }}>
          <LiveVoteChart electionId={id} />
        </div>
      </div>

      {/* Mobile: chart below on small screens */}
      <style>{`
        @media (max-width: 900px) {
          div[style*="gridTemplateColumns: '1fr 360px'"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
