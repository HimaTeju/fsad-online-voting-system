import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { voterApi } from '../../api/voterApi';
import { applicationApi } from '../../api/applicationApi';
import type { Election } from '../../types/election.types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/dateUtils';

const quickLinks = [
  {
    title: 'Voter ID application',
    desc: 'Apply or check your registration status',
    to: '/voter/apply',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <path d="M16 2v6M8 2v6M2 10h20"/>
      </svg>
    ),
  },
  {
    title: 'All elections',
    desc: 'Browse every election and its status',
    to: '/voter/elections',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
  {
    title: 'Published results',
    desc: 'View finalised and live counts',
    to: '/results',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10M12 20V4M6 20v-6"/>
      </svg>
    ),
  },
];

export default function VoterDashboard() {
  const { user } = useAuthContext();
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicationStatus, setApplicationStatus] = useState<string | null | 'none'>('none');
  const [voterProfile, setVoterProfile] = useState<{ voterIdNumber: string; constituencyName?: string } | null>(null);
  const hasVoterProfile = !!voterProfile;

  useEffect(() => {
    voterApi.elections().then((res) => setElections(res.data.data ?? [])).finally(() => setLoading(false));

    applicationApi.getMine().then((r) => {
      const apps = r.data.data;
      if (apps && apps.length > 0) setApplicationStatus(apps[apps.length - 1].status);
      else setApplicationStatus('none');
    }).catch(() => setApplicationStatus('none'));

    // If voter already has a profile (claimed voter ID or approved application),
    // suppress the "Apply for Voter ID" banner entirely.
    voterApi.profile().then((r) => setVoterProfile(r.data.data)).catch(() => {});
  }, []);

  const openElections = elections.filter((e) => e.status === 'VOTING_OPEN');

  return (
    <div className="page-wrap page-content">

      {/* Page header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.8125rem',
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: '0.5rem',
        }}>Voter portal</p>
        <h1 className="h1">Welcome, {user?.fullName?.split(' ')[0]}.</h1>
      </div>

      {voterProfile && (
        <div style={{
          marginBottom: '2rem', padding: '1.25rem 1.5rem',
          background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
          boxShadow: 'var(--shadow-card)',
        }}>
          <div>
            <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.25rem' }}>Your Voter ID</p>
            <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 700, fontSize: '1.125rem', color: 'var(--ink)', letterSpacing: '0.02em' }}>{voterProfile.voterIdNumber}</p>
            <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.8125rem', color: 'var(--muted)' }}>{voterProfile.constituencyName}</p>
          </div>
          <Link to="/voter/apply" className="btn btn-secondary btn-sm">View card →</Link>
        </div>
      )}
      {applicationStatus === 'REJECTED' && !hasVoterProfile && (
        <div style={{
          marginBottom: '2rem', padding: '1.25rem 1.5rem',
          background: 'rgba(192,57,43,0.06)', border: '1.5px solid rgba(192,57,43,0.35)', borderRadius: 'var(--radius)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ink)', marginBottom: '0.2rem' }}>Voter ID application rejected</p>
            <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.8125rem', color: 'var(--muted)' }}>See the officer's reason and apply again with corrected details.</p>
          </div>
          <Link to="/voter/apply" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>Review &amp; reapply →</Link>
        </div>
      )}

      {/* Voter ID application banner — hidden for voters who already have a profile */}
      {!hasVoterProfile && applicationStatus === 'none' && (
        <div style={{
          marginBottom: '2rem',
          padding: '1.25rem 1.5rem',
          background: 'rgba(232,98,42,0.07)',
          border: '1.5px solid rgba(232,98,42,0.35)',
          borderRadius: 'var(--radius)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '1rem', flexWrap: 'wrap',
        }}>
          <div>
            <p style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ink)',
              marginBottom: '0.2rem',
            }}>Apply for your Voter ID</p>
            <p style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: '0.8125rem', color: 'var(--muted)',
            }}>
              You haven't submitted a Voter ID application yet. A booth level officer will verify and approve it.
            </p>
          </div>
          <Link to="/voter/apply" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
            Apply now →
          </Link>
        </div>
      )}
      {applicationStatus === 'PENDING' && (
        <div style={{
          marginBottom: '2rem',
          padding: '1rem 1.5rem',
          background: 'rgba(15,25,35,0.04)',
          border: '1px solid var(--rule)',
          borderRadius: 'var(--radius)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <span style={{ color: 'var(--saffron)', fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.875rem' }}>
            Voter ID application pending —
          </span>
          <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.875rem', color: 'var(--muted)' }}>
            a booth level officer will review it shortly.
          </span>
        </div>
      )}

      {/* Quick links */}
      <div style={{ marginBottom: '3rem' }}>
        <div className="section-heading">
          <h2 className="h3" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>Quick actions</h2>
        </div>
        <div className="grid-3">
          {quickLinks.map((l) => (
            <Link key={l.to} to={l.to} style={{
              display: 'block',
              background: 'var(--paper)',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--radius)',
              padding: '1.5rem',
              textDecoration: 'none',
              transition: 'box-shadow 0.15s, border-color 0.15s',
              boxShadow: 'var(--shadow-card)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--saffron)';
              e.currentTarget.style.boxShadow = 'var(--shadow-lift)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--rule)';
              e.currentTarget.style.boxShadow = 'var(--shadow-card)';
            }}>
              <div style={{
                width: 40, height: 40,
                background: 'rgba(232,98,42,0.09)',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--saffron)',
                marginBottom: '1rem',
              }}>
                {l.icon}
              </div>
              <h3 className="h4" style={{ marginBottom: '0.25rem' }}>{l.title}</h3>
              <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.875rem', color: 'var(--muted)' }}>
                {l.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Open elections */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div className="section-heading" style={{ marginBottom: 0 }}>
            <h2 className="h3" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
              Open for voting
              {openElections.length > 0 && (
                <span style={{
                  marginLeft: '0.625rem',
                  background: 'var(--saffron)',
                  color: '#fff',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.125rem 0.5rem',
                  borderRadius: 99,
                }}>{openElections.length}</span>
              )}
            </h2>
          </div>
          <Link to="/voter/elections" className="btn-ghost" style={{ fontSize: '0.875rem' }}>
            View all elections →
          </Link>
        </div>

        {loading ? <LoadingSpinner /> : openElections.length === 0 ? (
          <div style={{
            background: 'var(--paper)',
            border: '1px solid var(--rule)',
            borderRadius: 'var(--radius)',
            padding: '2.5rem',
            textAlign: 'center',
          }}>
            <p style={{ fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--muted)', fontSize: '0.9375rem' }}>
              No elections are currently open for voting.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {openElections.map((e) => (
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
                    <StatusBadge status="VOTING_OPEN" />
                  </div>
                  <p style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontWeight: 600,
                    fontSize: '1rem',
                    color: 'var(--ink)',
                    marginBottom: '0.2rem',
                  }}>{e.title}</p>
                  <p style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: '0.8125rem',
                    color: 'var(--muted)',
                  }}>Closes {formatDate(e.votingEnd)}</p>
                </div>
                {e.hasVoted ? (
                  <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.8125rem', fontWeight: 600, color: 'var(--success)' }}>Voted ✓</span>
                ) : (
                  <Link to={`/vote/${e.id}`} className="btn btn-primary btn-sm">
                    Vote now
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
