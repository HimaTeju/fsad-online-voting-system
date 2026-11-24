import { Link } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';

function NavCard({ to, icon, title, subtitle }: { to: string; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <Link to={to} style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.75rem',
      background: 'var(--paper)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius)',
      padding: '1.5rem 2rem',
      textDecoration: 'none',
      boxShadow: 'var(--shadow-card)',
      transition: 'box-shadow 0.15s, border-color 0.15s',
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
      }}>
        {icon}
      </div>
      <div>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 600, fontSize: '1rem', color: 'var(--ink)',
        }}>{title}</p>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.875rem', color: 'var(--muted)',
        }}>{subtitle}</p>
      </div>
      <svg style={{ marginLeft: 'auto', color: 'var(--muted)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </Link>
  );
}

export default function FieldOfficerDashboard() {
  const { user } = useAuthContext();
  return (
    <div className="page-wrap page-content">
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.8125rem', fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--muted)', marginBottom: '0.5rem',
        }}>Booth Level Officer</p>
        <h1 className="h1">Welcome, {user?.fullName}.</h1>
        {user?.constituencyName && (
          <p style={{ fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--muted)', marginTop: '0.4rem' }}>
            Assigned constituency: <strong>{user.constituencyName}</strong>
          </p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <NavCard
          to="/field-officer/applications"
          title="Voter ID applications"
          subtitle="Review, approve, or reject pending applications"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          }
        />
        <NavCard
          to="/field-officer/voters"
          title="Constituency voters"
          subtitle="View all registered voters in your constituency"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
            </svg>
          }
        />
      </div>
    </div>
  );
}
