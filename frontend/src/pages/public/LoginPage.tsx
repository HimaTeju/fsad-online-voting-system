import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

type TabId = 'voter' | 'candidate' | 'staff';

const tabs: { id: TabId; label: string }[] = [
  { id: 'voter',     label: 'Voter' },
  { id: 'candidate', label: 'Candidate' },
  { id: 'staff',     label: 'Election Staff' },
];

const emailSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type EmailFormData = z.infer<typeof emailSchema>;

function EmailLoginForm({ roleLabel }: { roleLabel: string }) {
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const onSubmit = async (data: EmailFormData) => {
    try {
      await login(data);
    } catch {
      toast.error('Invalid email or password');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="field">
        <label>Email address</label>
        <input {...register('email')} type="email" placeholder="you@example.com"
          className={`input ${errors.email ? 'input-error' : ''}`} />
        {errors.email && <p className="error-msg">{errors.email.message}</p>}
      </div>
      <div className="field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label>Password</label>
          <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--saffron)', fontFamily: "'Inter', system-ui, sans-serif" }}>
            Forgot password?
          </Link>
        </div>
        <input {...register('password')} type="password" placeholder="••••••••"
          className={`input ${errors.password ? 'input-error' : ''}`} />
        {errors.password && <p className="error-msg">{errors.password.message}</p>}
      </div>
      <button type="submit" disabled={isSubmitting} className="btn btn-primary"
        style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}>
        {isSubmitting ? 'Signing in…' : `Sign in`}
      </button>
      {roleLabel === 'Voter' && (
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.8125rem', color: 'var(--muted)',
          textAlign: 'center', marginTop: '0.25rem',
        }}>
          Have a Voter ID but no account?{' '}
          <Link to="/register" style={{ color: 'var(--saffron)', fontWeight: 600 }}>Set one up here</Link>
        </p>
      )}
    </form>
  );
}

export default function LoginPage() {
  const [params] = useSearchParams();
  const initialTab = (params.get('tab') as TabId | null) ?? 'voter';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const leftPanelCopy: Record<TabId, { headline: string; sub: string }> = {
    voter: {
      headline: 'Welcome back.\nYour vote matters.',
      sub: 'Sign in with the email and password you created when setting up your account.',
    },
    candidate: {
      headline: 'Candidate portal.',
      sub: 'Sign in with the credentials sent to you after your nomination was approved.',
    },
    staff: {
      headline: 'Election staff portal.',
      sub: 'Secure access for Election Officers, Booth Level Officers, and Administrators.',
    },
  };

  const copy = leftPanelCopy[activeTab];

  return (
    <div style={{
      minHeight: 'calc(100vh - 56px)',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      background: 'var(--ivory)',
    }}>
      {/* Left editorial panel */}
      <div style={{
        background: 'var(--ink)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '4rem 3rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '2.5rem' }}>
          <span style={{ width: 4, height: 18, background: 'var(--saffron)', borderRadius: 2, display: 'block' }} />
          <span style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '0.75rem', fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.4)',
          }}>VoteIndia Online</span>
        </div>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 'clamp(1.75rem, 3vw, 2.75rem)',
          fontWeight: 700, lineHeight: 1.15,
          color: '#fff', marginBottom: '1rem',
          whiteSpace: 'pre-line',
        }}>
          {copy.headline.split('\n').map((line, i) => (
            <span key={i}>
              {i === 1 ? <span style={{ color: 'var(--saffron)' }}>{line}</span> : line}
              {i === 0 && <br />}
            </span>
          ))}
        </h1>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.9375rem', color: 'rgba(255,255,255,0.45)',
          lineHeight: 1.65, maxWidth: 360,
        }}>{copy.sub}</p>
      </div>

      {/* Right form panel */}
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '4rem 3rem', maxWidth: 480, width: '100%', margin: '0 auto',
      }}>
        <h2 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '1.75rem', fontWeight: 700,
          color: 'var(--ink)', marginBottom: '0.375rem',
        }}>Sign in</h2>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1.75rem',
        }}>
          New here? <Link to="/register" style={{ color: 'var(--saffron)', fontWeight: 500 }}>Register</Link>
        </p>

        {/* Tab selector */}
        <div style={{
          display: 'flex', gap: '0.5rem',
          background: 'rgba(15,25,35,0.06)',
          borderRadius: 8, padding: '4px',
          marginBottom: '2rem',
        }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                flex: 1, padding: '0.5rem 0.25rem',
                borderRadius: 6, border: 'none', cursor: 'pointer',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '0.8125rem', fontWeight: 600,
                transition: 'background 0.15s, color 0.15s',
                background: activeTab === t.id ? 'var(--ink)' : 'transparent',
                color: activeTab === t.id ? '#fff' : 'var(--muted)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <EmailLoginForm roleLabel={
          activeTab === 'voter' ? 'Voter' :
          activeTab === 'candidate' ? 'Candidate' : 'Staff'
        } />
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: '1fr 1fr'"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="background: var(--ink)"] {
            padding: 2.5rem 1.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}
