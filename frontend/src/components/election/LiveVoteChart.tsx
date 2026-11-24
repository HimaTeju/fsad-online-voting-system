import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useLiveVoteStats } from '../../hooks/useLiveVoteStats';
import { LoadingSpinner } from '../common/LoadingSpinner';

const COLORS = ['#E8622A', '#0F1923', '#2D7A4F', '#B45309', '#6B4FBB', '#0E7490'];

interface Props {
  electionId: number;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--ink)',
      color: '#fff',
      borderRadius: 8,
      padding: '0.625rem 0.875rem',
      fontFamily: "'Inter', system-ui, sans-serif",
      fontSize: '0.8125rem',
      boxShadow: 'var(--shadow-lift)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{payload[0].payload.fullName}</div>
      {payload[0].payload.party && (
        <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '0.2rem' }}>{payload[0].payload.party}</div>
      )}
      <div style={{ color: 'var(--saffron)', fontWeight: 700 }}>{payload[0].value.toLocaleString()} votes</div>
    </div>
  );
}

export function LiveVoteChart({ electionId }: Props) {
  const stats = useLiveVoteStats(electionId);

  if (!stats) return <LoadingSpinner />;

  const data = stats.candidates.map((c) => ({
    name: c.candidateName.split(' ')[0],
    fullName: c.candidateName,
    votes: c.voteCount,
    party: c.partyName || '',
  }));

  return (
    <div style={{
      background: 'var(--paper)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius)',
      padding: '1.5rem',
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
        <h3 style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 600,
          fontSize: '0.9375rem',
          color: 'var(--ink)',
        }}>Live vote count</h3>
        <span style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 700,
          fontSize: '1.125rem',
          color: 'var(--ink)',
        }}>
          {stats.totalVotes.toLocaleString()}
          <span style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 400,
            fontSize: '0.75rem',
            color: 'var(--muted)',
            marginLeft: '0.375rem',
          }}>total</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, fill: 'var(--muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11, fill: 'var(--muted)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(15,25,35,0.04)' }} />
          <Bar dataKey="votes" radius={[4, 4, 0, 0]} maxBarSize={60}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
