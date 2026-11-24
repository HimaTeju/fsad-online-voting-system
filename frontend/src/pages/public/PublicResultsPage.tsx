import { useEffect, useState } from 'react';
import { resultApi } from '../../api/resultApi';
import { electionApi } from '../../api/electionApi';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { StatusBadge } from '../../components/common/StatusBadge';
import type { Election } from '../../types/election.types';
import type { ElectionResult } from '../../types/vote.types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#E8622A', '#0F1923', '#2D7A4F', '#B45309', '#6B4FBB'];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--ink)', color: '#fff',
      borderRadius: 8, padding: '0.625rem 0.875rem',
      fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.8125rem',
    }}>
      <div style={{ fontWeight: 600 }}>{payload[0].payload.fullName}</div>
      <div style={{ color: 'var(--saffron)', fontWeight: 700, marginTop: '0.125rem' }}>
        {payload[0].value.toLocaleString()} votes
      </div>
    </div>
  );
}

export default function PublicResultsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [result, setResult] = useState<ElectionResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    electionApi.list({ page: 0, size: 20 }).then((res) => {
      const payload = res.data.data;
      const els: Election[] = Array.isArray(payload) ? payload : (payload?.content ?? []);
      setElections(els.filter((e) => ['VOTING_OPEN', 'VOTING_CLOSED', 'RESULTS_DECLARED'].includes(e.status)));
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    resultApi.getResults(selectedId).then((res) => setResult(res.data.data)).finally(() => setLoading(false));
  }, [selectedId]);

  const chartData = result?.results.map((r) => ({
    name: r.candidateName.split(' ')[0],
    fullName: r.candidateName,
    votes: r.totalVotes,
    winner: r.winner,
  })) ?? [];

  return (
    <div className="page-wrap page-content">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="h1">Election results</h1>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.9375rem', color: 'var(--muted)', marginTop: '0.5rem',
        }}>
          Live counts and declared outcomes across all elections.
        </p>
      </div>

      <div className="field" style={{ maxWidth: 400, marginBottom: '2.5rem' }}>
        <label>Select election</label>
        <select className="input" onChange={(e) => setSelectedId(Number(e.target.value))}>
          <option value="">Choose an election…</option>
          {elections.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>

      {loading && <LoadingSpinner />}

      {result && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Result header card */}
          <div className="card-padded">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <h2 className="h2" style={{ fontSize: '1.375rem' }}>{result.electionTitle}</h2>
              <StatusBadge status={result.finalized ? 'FINALIZED' : 'VOTING_OPEN'} />
            </div>
            {!result.finalized && (
              <p style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '0.8125rem', color: 'var(--muted)',
              }}>
                Online votes only — booth results pending
              </p>
            )}
          </div>

          {/* Chart */}
          <div className="card-padded">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" vertical={false} />
                <XAxis dataKey="name"
                  tick={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, fill: 'var(--muted)' }}
                  axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11, fill: 'var(--muted)' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(15,25,35,0.04)' }} />
                <Bar dataKey="votes" radius={[4, 4, 0, 0]} maxBarSize={64}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.winner ? 'var(--success)' : COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="card-padded" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                  {['Candidate', 'Party', 'Online votes', ...(result.finalized ? ['Booth votes'] : []), 'Total'].map((h) => (
                    <th key={h} style={{
                      paddingBottom: '0.75rem',
                      textAlign: h === 'Candidate' || h === 'Party' ? 'left' : 'right',
                      fontWeight: 600, fontSize: '0.75rem',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      color: 'var(--muted)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.results.map((r) => (
                  <tr key={r.candidateId} style={{
                    borderBottom: '1px solid var(--rule)',
                    background: r.winner ? 'rgba(45,122,79,0.05)' : 'transparent',
                  }}>
                    <td style={{
                      padding: '0.875rem 0',
                      fontWeight: r.winner ? 700 : 400,
                      color: 'var(--ink)',
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}>
                      {r.winner && (
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: 'var(--success)', display: 'block', flexShrink: 0,
                        }} />
                      )}
                      {r.candidateName}
                    </td>
                    <td style={{ padding: '0.875rem 0', color: 'var(--muted)' }}>{r.partyName || '—'}</td>
                    <td style={{ padding: '0.875rem 0', textAlign: 'right' }}>{r.onlineVotes.toLocaleString()}</td>
                    {result.finalized && (
                      <td style={{ padding: '0.875rem 0', textAlign: 'right' }}>{r.manualBoothVotes.toLocaleString()}</td>
                    )}
                    <td style={{
                      padding: '0.875rem 0', textAlign: 'right',
                      fontWeight: r.winner ? 700 : 600,
                      color: r.winner ? 'var(--success)' : 'var(--ink)',
                    }}>
                      {r.totalVotes.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
