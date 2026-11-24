import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '../../api/authApi';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';

const emailSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(8, 'Minimum 8 characters'),
});

type EmailForm = z.infer<typeof emailSchema>;
type ResetForm = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const navigate = useNavigate();

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  const sendOtp = async (data: EmailForm) => {
    await authApi.forgotPassword(data.email);
    setEmail(data.email);
    setStep('reset');
    toast.success('Check your inbox — OTP sent');
  };

  const resetPassword = async (data: ResetForm) => {
    try {
      await authApi.resetPassword(email, data.otp, data.newPassword);
      toast.success('Password updated. Please sign in.');
      navigate('/login');
    } catch {
      toast.error('Invalid or expired OTP');
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 56px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--ivory)',
      padding: '2rem 1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Back link */}
        <Link to="/login" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.8125rem',
          color: 'var(--muted)',
          marginBottom: '2rem',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back to sign in
        </Link>

        <div className="card-padded">
          {/* Header */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ width: 3, height: 18, background: 'var(--saffron)', borderRadius: 2, display: 'block' }} />
              <span style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}>
                {step === 'email' ? 'Step 1 of 2' : 'Step 2 of 2'}
              </span>
            </div>
            <h2 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--ink)',
              marginBottom: '0.375rem',
            }}>
              {step === 'email' ? 'Reset your password' : 'Enter the OTP'}
            </h2>
            <p style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: '0.875rem',
              color: 'var(--muted)',
            }}>
              {step === 'email'
                ? "We'll send a one-time code to your registered email."
                : `Enter the 6-digit code sent to ${email}`}
            </p>
          </div>

          <hr className="divider" />

          {step === 'email' ? (
            <form onSubmit={emailForm.handleSubmit(sendOtp)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="field">
                <label>Email address</label>
                <input {...emailForm.register('email')} type="email" placeholder="you@example.com"
                  className={`input ${emailForm.formState.errors.email ? 'input-error' : ''}`} />
                {emailForm.formState.errors.email && (
                  <p className="error-msg">{emailForm.formState.errors.email.message}</p>
                )}
              </div>
              <button type="submit" disabled={emailForm.formState.isSubmitting}
                className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
                {emailForm.formState.isSubmitting ? 'Sending…' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={resetForm.handleSubmit(resetPassword)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="field">
                <label>OTP code</label>
                <input {...resetForm.register('otp')}
                  placeholder="— — — — — —"
                  maxLength={6}
                  className={`input ${resetForm.formState.errors.otp ? 'input-error' : ''}`}
                  style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.25rem', fontWeight: 600 }} />
                {resetForm.formState.errors.otp && (
                  <p className="error-msg">{resetForm.formState.errors.otp.message}</p>
                )}
              </div>
              <div className="field">
                <label>New password</label>
                <input {...resetForm.register('newPassword')} type="password" placeholder="Minimum 8 characters"
                  className={`input ${resetForm.formState.errors.newPassword ? 'input-error' : ''}`} />
                {resetForm.formState.errors.newPassword && (
                  <p className="error-msg">{resetForm.formState.errors.newPassword.message}</p>
                )}
              </div>
              <button type="submit" disabled={resetForm.formState.isSubmitting}
                className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
                {resetForm.formState.isSubmitting ? 'Updating…' : 'Set new password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
