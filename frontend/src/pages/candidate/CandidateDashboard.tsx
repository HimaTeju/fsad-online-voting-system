import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { electionApi } from '../../api/electionApi';
import { candidateApi } from '../../api/candidateApi';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/dateUtils';
import type { Election } from '../../types/election.types';
import type { Candidate } from '../../types/candidate.types';

export default function CandidateDashboard() {
  const [elections, setElections] = useState<Election[]>([]);
  const [nominations, setNominations] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      electionApi.list(),
      candidateApi.getMyNominations(),
    ]).then(([elRes, nomRes]) => {
      setElections(elRes.data.data?.content ?? elRes.data.data ?? []);
      setNominations(nomRes.data.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const openForNomination = elections.filter((e) => e.status === 'NOMINATION_OPEN');

  return (
    <div className="page-wrap page-content">
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.8125rem', fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--muted)', marginBottom: '0.5rem',
        }}>Candidate portal</p>
        <h1 className="h1">My nominations</h1>
      </div>

      {/* My nominations */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div className="section-heading" style={{ marginBottom: 0 }}>
            <h2 className="h3" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>Submitted nominations</h2>
          </div>
          <Link to="/candidate/nominate" className="btn btn-primary btn-sm">
            + Nominate
          </Link>
        </div>

        {nominations.length === 0 ? (
          <div style={{
            background: 'var(--paper)', border: '1px solid var(--rule)',
            borderRadius: 'var(--radius)', padding: '2rem', textAlign: 'center',
          }}>
            <p style={{ fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--muted)', fontSize: '0.9375rem' }}>
              No nominations submitted yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {nominations.map((n) => (
              <div key={n.id} style={{
                background: 'var(--paper)',
                border: '1px solid var(--rule)',
                borderRadius: 'var(--radius)',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                boxShadow: 'var(--shadow-card)',
              }}>
                <div>
                  <p style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontWeight: 600, fontSize: '1rem', color: 'var(--ink)',
                    marginBottom: '0.2rem',
                  }}>{n.electionTitle}</p>
                  <p style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: '0.8125rem', color: 'var(--muted)',
                  }}>
                    {n.constituencyName} · {n.partyName || 'Independent'}
                  </p>
                </div>
                <StatusBadge status={n.nominationStatus} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open for nomination */}
      <div>
        <div className="section-heading">
          <h2 className="h3" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            Open for nomination
            {openForNomination.length > 0 && (
              <span style={{
                marginLeft: '0.625rem',
                background: 'rgba(232,98,42,0.12)',
                color: 'var(--saffron)',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.125rem 0.5rem',
                borderRadius: 99,
              }}>{openForNomination.length}</span>
            )}
          </h2>
        </div>

        {openForNomination.length === 0 ? (
          <div style={{
            background: 'var(--paper)', border: '1px solid var(--rule)',
            borderRadius: 'var(--radius)', padding: '2rem', textAlign: 'center',
          }}>
            <p style={{ fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--muted)', fontSize: '0.9375rem' }}>
              No elections are currently accepting nominations.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {openForNomination.map((e) => (
              <div key={e.id} style={{
                background: 'var(--paper)',
                border: '1px solid var(--rule)',
                borderRadius: 'var(--radius)',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                boxShadow: 'var(--shadow-card)',
              }}>
                <div>
                  <p style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontWeight: 600, fontSize: '1rem', color: 'var(--ink)',
                    marginBottom: '0.2rem',
                  }}>{e.title}</p>
                  <p style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: '0.8125rem', color: 'var(--muted)',
                  }}>
                    {e.constituencyName || 'National'} · Nominations close {formatDate(e.nominationEnd)}
                  </p>
                </div>
                <Link to={`/candidate/nominate?electionId=${e.id}`} className="btn btn-secondary btn-sm">
                  Nominate →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
