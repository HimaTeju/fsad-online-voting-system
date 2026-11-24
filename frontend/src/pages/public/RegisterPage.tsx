import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAuthContext } from '../../context/AuthContext';
import { authApi } from '../../api/authApi';
import { electionApi } from '../../api/electionApi';
import axiosClient from '../../api/axiosClient';
import toast from 'react-hot-toast';
import type { Election } from '../../types/election.types';

type PathId = 'choose' | 'first-time' | 'existing-voter' | 'candidate';

// ── Shared styles ──
const backBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: '0.875rem', color: 'var(--muted)',
  padding: '0 0 1.25rem 0', display: 'block',
};
const formHeadingStyle: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: '1.75rem', fontWeight: 700,
  color: 'var(--ink)', marginBottom: '0.375rem',
};
const subStyle: React.CSSProperties = {
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: '0.875rem', color: 'var(--muted)',
};

// ── First-time voter registration form ──
const voterSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
});
type VoterFormData = z.infer<typeof voterSchema>;

function FirstTimeVoterForm({ onBack }: { onBack: () => void }) {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<VoterFormData>({
    resolver: zodResolver(voterSchema),
  });

  const onSubmit = async (data: VoterFormData) => {
    try {
      await registerUser(data);
      toast.success('Account created! Sign in to continue.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div>
      <button type="button" onClick={onBack} style={backBtnStyle}>← Back</button>
      <h2 style={formHeadingStyle}>Create voter account</h2>
      <p style={subStyle}>You'll be able to apply for a Voter ID from your dashboard after signing in.</p>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
        <div className="field">
          <label>Full name</label>
          <input {...register('fullName')} type="text" placeholder="Raj Kumar"
            className={`input ${errors.fullName ? 'input-error' : ''}`} />
          {errors.fullName && <p className="error-msg">{errors.fullName.message}</p>}
        </div>
        <div className="field">
          <label>Email address</label>
          <input {...register('email')} type="email" placeholder="raj@example.com"
            className={`input ${errors.email ? 'input-error' : ''}`} />
          {errors.email && <p className="error-msg">{errors.email.message}</p>}
        </div>
        <div className="field">
          <label>Password</label>
          <input {...register('password')} type="password" placeholder="Minimum 8 characters"
            className={`input ${errors.password ? 'input-error' : ''}`} />
          {errors.password && <p className="error-msg">{errors.password.message}</p>}
        </div>
        <div className="field">
          <label>Phone <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
          <input {...register('phone')} type="tel" placeholder="+91 98765 43210" className="input" />
        </div>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary"
          style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </div>
  );
}

// ── Existing Voter ID → account claim form (4 steps) ──
type ClaimStep = 'enter-id' | 'confirm-details' | 'email-otp' | 'set-password';

interface VoterDetails {
  voterIdNumber: string;
  fullName: string;
  constituencyName: string;
  gender: string | null;
}

function ExistingVoterClaimForm({ onBack }: { onBack: () => void }) {
  const { setAuth } = useAuthContext();
  const navigate = useNavigate();
  const [step, setStep] = useState<ClaimStep>('enter-id');
  const [details, setDetails] = useState<VoterDetails | null>(null);
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [voterIdInput, setVoterIdInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Step 1: look up Voter ID
  const handleLookup = async () => {
    if (!voterIdInput.trim()) {
      setFieldErrors({ voterId: 'Please enter your Voter ID number' });
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await authApi.claimLookup(voterIdInput.trim().toUpperCase());
      setDetails(res.data.data);
      setStep('confirm-details');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Voter ID not found';
      setFieldErrors({ voterId: msg });
    } finally {
      setLoading(false);
    }
  };

  // Step 3: send OTP to email
  const handleSendOtp = async () => {
    if (!emailInput || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      setFieldErrors({ email: 'Enter a valid email address' });
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      await authApi.claimSendOtp(details!.voterIdNumber, emailInput);
      setEmail(emailInput);
      setOtpSent(true);
    } catch (err: any) {
      setFieldErrors({ email: err.response?.data?.message || 'Failed to send OTP' });
    } finally {
      setLoading(false);
    }
  };

  // Step 4: verify OTP + set password
  const handleVerify = async () => {
    const errs: Record<string, string> = {};
    if (!otp || otp.length < 4) errs.otp = 'Enter the 6-digit OTP';
    if (password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await authApi.claimVerify(details!.voterIdNumber, otp, password);
      setAuth(res.data.data);
      toast.success(`Welcome, ${res.data.data.fullName}!`);
      navigate('/voter');
    } catch (err: any) {
      setFieldErrors({ otp: err.response?.data?.message || 'Invalid or expired OTP' });
    } finally {
      setLoading(false);
    }
  };

  const stepNumber = step === 'enter-id' ? 1 : step === 'confirm-details' ? 2 : step === 'email-otp' ? 3 : 4;
  const steps = ['Enter Voter ID', 'Confirm details', 'Verify email', 'Create password'];

  return (
    <div>
      <button type="button" onClick={onBack} style={backBtnStyle}>← Back</button>
      <h2 style={formHeadingStyle}>Set up your account</h2>
      <p style={subStyle}>Link your existing Voter ID to a new online account.</p>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '0.5rem', margin: '1.5rem 0 2rem', alignItems: 'center' }}>
        {steps.map((label, i) => {
          const n = i + 1;
          const done = n < stepNumber;
          const active = n === stepNumber;
          return (
            <React.Fragment key={n}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: '0.75rem', fontWeight: 700,
                  background: done ? '#16a34a' : active ? 'var(--saffron)' : 'rgba(15,25,35,0.08)',
                  color: done || active ? '#fff' : 'var(--muted)',
                }}>
                  {done ? '✓' : n}
                </div>
                <span style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: '0.75rem', fontWeight: active ? 600 : 400,
                  color: active ? 'var(--ink)' : 'var(--muted)',
                  display: 'none',
                }}>{label}</span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: 2, background: done ? '#16a34a' : 'var(--rule)', minWidth: 12 }} />
              )}
            </React.Fragment>
          );
        })}
        <span style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.8125rem', fontWeight: 600,
          color: 'var(--ink)', marginLeft: '0.5rem',
        }}>{steps[stepNumber - 1]}</span>
      </div>

      {/* Step 1: Enter Voter ID */}
      {step === 'enter-id' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="field">
            <label>Voter ID number <span style={{ color: 'var(--saffron)' }}>*</span></label>
            <input
              type="text"
              value={voterIdInput}
              onChange={e => setVoterIdInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
              placeholder="e.g. VID-BNCS-2024-000001"
              className={`input ${fieldErrors.voterId ? 'input-error' : ''}`}
              style={{ textTransform: 'uppercase' }}
            />
            {fieldErrors.voterId && <p className="error-msg">{fieldErrors.voterId}</p>}
            <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.375rem' }}>
              This is printed on your physical Voter ID card.
            </p>
          </div>
          <button onClick={handleLookup} disabled={loading} className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem' }}>
            {loading ? 'Looking up…' : 'Find my Voter ID →'}
          </button>
        </div>
      )}

      {/* Step 2: Confirm details */}
      {step === 'confirm-details' && details && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{
            padding: '1.5rem',
            background: 'rgba(15,25,35,0.03)',
            border: '1px solid var(--rule)',
            borderRadius: 'var(--radius)',
          }}>
            <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '1rem' }}>
              Voter profile found
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[
                { label: 'Full name', value: details.fullName },
                { label: 'Voter ID', value: details.voterIdNumber },
                { label: 'Constituency', value: details.constituencyName },
                { label: 'Gender', value: details.gender ?? '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.2rem' }}>{label}</p>
                  <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ink)' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.9375rem', color: 'var(--ink)', fontWeight: 500 }}>
            Is this your voter profile?
          </p>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setStep('email-otp')} className="btn btn-primary" style={{ flex: 1, padding: '0.75rem' }}>
              Yes, this is me →
            </button>
            <button onClick={() => { setStep('enter-id'); setDetails(null); setVoterIdInput(''); }}
              className="btn" style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--rule)' }}>
              No, try another
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Verify email */}
      {step === 'email-otp' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {!otpSent ? (
            <>
              <div className="field">
                <label>Your email address <span style={{ color: 'var(--saffron)' }}>*</span></label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  placeholder="you@example.com"
                  className={`input ${fieldErrors.email ? 'input-error' : ''}`}
                />
                {fieldErrors.email && <p className="error-msg">{fieldErrors.email}</p>}
                <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.375rem' }}>
                  A one-time password will be sent to verify your email.
                </p>
              </div>
              <button onClick={handleSendOtp} disabled={loading} className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem' }}>
                {loading ? 'Sending OTP…' : 'Send verification code →'}
              </button>
            </>
          ) : (
            <>
              <div style={{
                padding: '0.875rem 1rem',
                background: 'rgba(22,163,74,0.06)',
                border: '1px solid rgba(22,163,74,0.25)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '0.875rem', color: 'var(--ink)',
              }}>
                OTP sent to <strong>{email}</strong>. Check your inbox.
              </div>
              <div className="field">
                <label>One-time password <span style={{ color: 'var(--saffron)' }}>*</span></label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  placeholder="6-digit code"
                  className={`input ${fieldErrors.otp ? 'input-error' : ''}`}
                  autoComplete="one-time-code"
                />
                {fieldErrors.otp && <p className="error-msg">{fieldErrors.otp}</p>}
              </div>
              <button onClick={() => setStep('set-password')} disabled={otp.length < 4} className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem' }}>
                Continue →
              </button>
              <button type="button" onClick={() => { setOtpSent(false); setOtp(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.8125rem', color: 'var(--muted)', textAlign: 'center' }}>
                Resend OTP
              </button>
            </>
          )}
        </div>
      )}

      {/* Step 4: Create password */}
      {step === 'set-password' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="field">
            <label>Create password <span style={{ color: 'var(--saffron)' }}>*</span></label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className={`input ${fieldErrors.password ? 'input-error' : ''}`} />
            {fieldErrors.password && <p className="error-msg">{fieldErrors.password}</p>}
          </div>
          <div className="field">
            <label>Confirm password <span style={{ color: 'var(--saffron)' }}>*</span></label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className={`input ${fieldErrors.confirmPassword ? 'input-error' : ''}`} />
            {fieldErrors.confirmPassword && <p className="error-msg">{fieldErrors.confirmPassword}</p>}
          </div>
          <button onClick={handleVerify} disabled={loading} className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem' }}>
            {loading ? 'Creating account…' : 'Create account & sign in →'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Candidate nomination form ──
const candidateSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email(),
  phone: z.string().optional(),
  electionId: z.string().min(1, 'Select an election'),
  constituencyId: z.string().min(1, 'Select a constituency'),
  partyName: z.string().optional(),
  manifesto: z.string().min(10, 'Manifesto must be at least 10 characters'),
  education: z.string().optional(),
  criminalRecord: z.string().optional(),
});
type CandidateFormData = z.infer<typeof candidateSchema>;

interface Constituency { id: number; name: string; state: string; }

function CandidateNominationForm({ onBack }: { onBack: () => void }) {
  const [elections, setElections] = useState<Election[]>([]);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CandidateFormData>({
    resolver: zodResolver(candidateSchema),
  });

  useEffect(() => {
    electionApi.list().then((r) => {
      const payload = r.data.data;
      const list: Election[] = Array.isArray(payload) ? payload : (payload?.content ?? []);
      setElections(list.filter((e) => e.status === 'NOMINATION_OPEN'));
    }).catch(() => {});
    axiosClient.get('/constituencies').then((r) =>
      setConstituencies(r.data.data || [])
    ).catch(() => {});
  }, []);

  const onSubmit = async (data: CandidateFormData) => {
    try {
      await authApi.registerCandidate({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        electionId: Number(data.electionId),
        constituencyId: Number(data.constituencyId),
        partyName: data.partyName,
        manifesto: data.manifesto,
        education: data.education,
        criminalRecord: data.criminalRecord,
      });
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Nomination submission failed');
    }
  };

  if (submitted) {
    return (
      <div>
        <button type="button" onClick={onBack} style={backBtnStyle}>← Back</button>
        <div style={{
          marginTop: '1.5rem', padding: '2rem',
          background: 'rgba(22,163,74,0.06)',
          border: '1px solid rgba(22,163,74,0.25)',
          borderRadius: 10, textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✓</div>
          <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.375rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.75rem' }}>
            Nomination submitted
          </h3>
          <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.9375rem', color: 'var(--muted)', lineHeight: 1.65, maxWidth: 380, margin: '0 auto' }}>
            Your nomination has been received. Once the Election Officer reviews and approves your application, you will receive your login credentials via email.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={onBack} style={backBtnStyle}>← Back</button>
      <h2 style={formHeadingStyle}>File nomination</h2>
      <p style={subStyle}>Complete the form below. Your account will be created after the Election Officer approves your nomination.</p>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
        <div className="field">
          <label>Full name <span style={{ color: 'var(--saffron)' }}>*</span></label>
          <input {...register('fullName')} type="text" placeholder="As on official ID"
            className={`input ${errors.fullName ? 'input-error' : ''}`} />
          {errors.fullName && <p className="error-msg">{errors.fullName.message}</p>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="field">
            <label>Email address <span style={{ color: 'var(--saffron)' }}>*</span></label>
            <input {...register('email')} type="email" placeholder="you@example.com"
              className={`input ${errors.email ? 'input-error' : ''}`} />
            {errors.email && <p className="error-msg">{errors.email.message}</p>}
          </div>
          <div className="field">
            <label>Phone <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
            <input {...register('phone')} type="tel" placeholder="+91 98765 43210" className="input" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="field">
            <label>Election <span style={{ color: 'var(--saffron)' }}>*</span></label>
            <select {...register('electionId')} className={`input ${errors.electionId ? 'input-error' : ''}`}>
              <option value="">Select election…</option>
              {elections.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
            {errors.electionId && <p className="error-msg">{errors.electionId.message}</p>}
          </div>
          <div className="field">
            <label>Constituency <span style={{ color: 'var(--saffron)' }}>*</span></label>
            <select {...register('constituencyId')} className={`input ${errors.constituencyId ? 'input-error' : ''}`}>
              <option value="">Select constituency…</option>
              {constituencies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.constituencyId && <p className="error-msg">{errors.constituencyId.message}</p>}
          </div>
        </div>
        <div className="field">
          <label>Party name <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(leave blank for Independent)</span></label>
          <input {...register('partyName')} className="input" placeholder="e.g. National Democratic Alliance" />
        </div>
        <div className="field">
          <label>Manifesto <span style={{ color: 'var(--saffron)' }}>*</span></label>
          <textarea {...register('manifesto')} rows={4}
            className={`input ${errors.manifesto ? 'input-error' : ''}`}
            placeholder="Describe your platform and goals for your constituency…" />
          {errors.manifesto && <p className="error-msg">{errors.manifesto.message}</p>}
        </div>
        <div className="field">
          <label>Educational qualifications <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
          <input {...register('education')} className="input" placeholder="e.g. B.A. Economics, Delhi University" />
        </div>
        <div className="field">
          <label>Criminal record disclosure <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(enter "None" if not applicable)</span></label>
          <textarea {...register('criminalRecord')} rows={2} className="input" placeholder="None" />
        </div>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary"
          style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', marginTop: '0.25rem' }}>
          {isSubmitting ? 'Submitting nomination…' : 'Submit nomination'}
        </button>
      </form>
    </div>
  );
}

// ── Path selection cards ──
const paths: { id: PathId; title: string; body: string; cta: string; accent?: boolean }[] = [
  {
    id: 'first-time',
    title: "I don't have a Voter ID yet",
    body: 'Create an account and apply for your Voter ID. A booth level officer will verify your application.',
    cta: 'Register as new voter',
  },
  {
    id: 'existing-voter',
    title: 'I already have a Voter ID',
    body: 'Enter your Voter ID to verify your identity and create an online account with email and password.',
    cta: 'Set up my account',
  },
  {
    id: 'candidate',
    title: 'I want to stand for election',
    body: 'File your nomination. The Election Officer will review it and send you login credentials if approved.',
    cta: 'File nomination',
    accent: true,
  },
];

// ── Main RegisterPage ──
export default function RegisterPage() {
  const [path, setPath] = useState<PathId>('choose');

  if (path === 'first-time') return (
    <div style={pageWrapStyle}>
      <FirstTimeVoterForm onBack={() => setPath('choose')} />
    </div>
  );

  if (path === 'existing-voter') return (
    <div style={pageWrapStyle}>
      <ExistingVoterClaimForm onBack={() => setPath('choose')} />
    </div>
  );

  if (path === 'candidate') return (
    <div style={{ ...pageWrapStyle, maxWidth: 680 }}>
      <CandidateNominationForm onBack={() => setPath('choose')} />
    </div>
  );

  // Default: path chooser
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
        }}>
          How would you<br />
          <span style={{ color: 'var(--saffron)' }}>like to participate?</span>
        </h1>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.9375rem', color: 'rgba(255,255,255,0.45)',
          lineHeight: 1.65, maxWidth: 360,
        }}>
          Choose the option that describes you. Each path is tailored to your role in the democratic process.
        </p>
      </div>

      {/* Right: path cards */}
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '4rem 3rem', gap: '1rem',
        maxWidth: 520, width: '100%', margin: '0 auto',
      }}>
        <h2 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '1.5rem', fontWeight: 700,
          color: 'var(--ink)', marginBottom: '0.5rem',
        }}>Get started</h2>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1rem',
        }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--saffron)', fontWeight: 500 }}>Sign in</Link>
        </p>

        {paths.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPath(p.id)}
            style={{
              width: '100%', textAlign: 'left',
              background: '#fff',
              border: `1.5px solid ${p.accent ? 'var(--saffron)' : 'var(--rule)'}`,
              borderRadius: 10, padding: '1.25rem 1.375rem',
              cursor: 'pointer',
              transition: 'box-shadow 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 12px rgba(15,25,35,0.1)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--saffron)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              (e.currentTarget as HTMLButtonElement).style.borderColor = p.accent ? 'var(--saffron)' : 'var(--rule)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div>
                <p style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontWeight: 600, fontSize: '0.9375rem',
                  color: 'var(--ink)', marginBottom: '0.375rem',
                }}>{p.title}</p>
                <p style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: '0.8125rem', color: 'var(--muted)', lineHeight: 1.55,
                }}>{p.body}</p>
              </div>
              <span style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '0.8125rem', fontWeight: 600,
                color: 'var(--saffron)', whiteSpace: 'nowrap',
                alignSelf: 'center',
              }}>{p.cta} →</span>
            </div>
          </button>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: '1fr 1fr'"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

const pageWrapStyle: React.CSSProperties = {
  maxWidth: 520, margin: '0 auto',
  padding: '3rem 1.5rem',
};
