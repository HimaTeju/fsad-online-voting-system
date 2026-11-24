import { useEffect, useState } from 'react';
import { fieldOfficerApi } from '../../api/fieldOfficerApi';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useAuthContext } from '../../context/AuthContext';

interface VoterListItem {
  id: number;
  fullName: string;
  email: string;
  voterIdNumber?: string;
  gender?: string;
  address?: string;
  dateOfBirth?: string;
}

export default function ConstituencyVotersPage() {
  const { user } = useAuthContext();
  const [voters, setVoters] = useState<VoterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fieldOfficerApi.getVoters().then((res) => {
      setVoters(res.data.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = voters.filter((v) => {
    const q = search.toLowerCase();
    return (
      v.fullName.toLowerCase().includes(q) ||
      (v.voterIdNumber ?? '').toLowerCase().includes(q) ||
      (v.address ?? '').toLowerCase().includes(q)
    );
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-wrap page-content">
      <div style={{ marginBottom: '2rem' }}>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.8125rem', fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--muted)', marginBottom: '0.5rem',
        }}>Booth Level Officer</p>
        <h1 className="h1">Constituency Voters</h1>
        {user?.constituencyName && (
          <p style={{ fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--muted)', marginTop: '0.4rem' }}>
            {user.constituencyName} · {voters.length} registered voter{voters.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <input
        className="input"
        placeholder="Search by name, voter ID, or address…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: '1.5rem' }}
      />

      {filtered.length === 0 ? (
        <div style={{
          background: 'var(--paper)', border: '1px solid var(--rule)',
          borderRadius: 'var(--radius)', padding: '3rem', textAlign: 'center',
        }}>
          <p style={{ fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--muted)' }}>
            {search ? 'No voters match your search.' : 'No voters found in this constituency.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map((v) => (
            <div key={v.id} className="card-padded">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600, fontSize: '1rem', color: 'var(--ink)' }}>
                    {v.fullName}
                  </p>
                  {v.voterIdNumber && (
                    <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.8125rem', color: 'var(--muted)', marginTop: 2 }}>
                      {v.voterIdNumber}
                    </p>
                  )}
                  {v.address && (
                    <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.8125rem', color: 'var(--muted)', marginTop: 1 }}>
                      {v.address}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                  {v.gender && (
                    <span style={{
                      fontFamily: "'Inter', system-ui, sans-serif",
                      fontSize: '0.75rem', fontWeight: 600,
                      background: 'var(--surface)', borderRadius: 999, padding: '2px 10px',
                      color: 'var(--muted)', border: '1px solid var(--rule)',
                    }}>
                      {v.gender}
                    </span>
                  )}
                  {v.dateOfBirth && (
                    <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.8125rem', color: 'var(--muted)' }}>
                      DOB: {new Date(v.dateOfBirth).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
