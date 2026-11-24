import { Link } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';

const adminLinks = [
  {
    to: '/admin/elections',
    title: 'Elections',
    desc: 'Schedule and advance election stages',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    to: '/admin/elections/new',
    title: 'New election',
    desc: 'Create and configure an upcoming election',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
  },
  {
    to: '/admin/nominations',
    title: 'Nominations',
    desc: 'Approve or reject candidate nominations',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    to: '/results',
    title: 'Results',
    desc: 'Monitor live counts and declared results',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10M12 20V4M6 20v-6"/>
      </svg>
    ),
  },
];

export default function AdminDashboard() {
  const { user } = useAuthContext();
  return (
    <div className="page-wrap page-content">
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.8125rem', fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--muted)', marginBottom: '0.5rem',
        }}>Administration</p>
        <h1 className="h1">Election control</h1>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.9375rem', color: 'var(--muted)', marginTop: '0.5rem',
        }}>Signed in as {user?.fullName}</p>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {adminLinks.map((l) => (
          <Link key={l.to} to={l.to} style={{
            display: 'block',
            background: 'var(--paper)',
            border: '1px solid var(--rule)',
            borderRadius: 'var(--radius)',
            padding: '1.75rem',
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
              width: 44, height: 44,
              background: 'rgba(232,98,42,0.09)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--saffron)',
              marginBottom: '1.125rem',
            }}>
              {l.icon}
            </div>
            <h3 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 600, fontSize: '1.125rem',
              color: 'var(--ink)', marginBottom: '0.375rem',
            }}>{l.title}</h3>
            <p style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: '0.875rem', color: 'var(--muted)',
            }}>{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
