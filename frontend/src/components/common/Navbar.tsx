import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { ROLE_HOME } from '../../utils/roleUtils';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <nav style={{
      background: 'var(--ink)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1120,
        margin: '0 auto',
        padding: '0 1.5rem',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo with saffron rule */}
        <Link to={isAuthenticated && user ? ROLE_HOME[user.role] : '/'} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <span style={{
            display: 'block',
            width: 4,
            height: 22,
            background: 'var(--saffron)',
            borderRadius: 2,
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 700,
            fontSize: '1.125rem',
            color: '#fff',
            letterSpacing: '-0.01em',
          }}>VoteIndia</span>
          <span style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 300,
            fontSize: '0.875rem',
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>Online</span>
        </Link>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
{!isAuthenticated ? (
            <>
              <Link to="/login" style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.7)',
                padding: '0.4rem 0.875rem',
                borderRadius: 6,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              >
                Sign in
              </Link>
              <Link to="/register" style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--ink)',
                background: 'var(--saffron)',
                padding: '0.4rem 1rem',
                borderRadius: 6,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--saffron-d)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--saffron)')}
              >
                Register
              </Link>
            </>
          ) : (
            <>
              <Link
                to={ROLE_HOME[user!.role]}
                style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.85)',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 6,
                  maxWidth: 180,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user!.fullName}
              </Link>

              <Link to="/notifications" style={{ position: 'relative', padding: '0.4rem', display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    background: 'var(--saffron)',
                    color: '#fff',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--ink)',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              <button
                onClick={logout}
                style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.65)',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  padding: '0.35rem 0.875rem',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                }}
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
