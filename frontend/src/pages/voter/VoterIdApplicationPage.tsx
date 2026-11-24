import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { applicationApi } from '../../api/applicationApi';
import axiosClient from '../../api/axiosClient';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { StatusBadge } from '../../components/common/StatusBadge';
import toast from 'react-hot-toast';

interface Constituency { id: number; name: string; state: string; district: string; }
interface VoterProfile {
  voterIdNumber: string;
  constituencyName: string;
  gender: string;
  address: string;
  photoUrl?: string;
  fullName?: string;
  dateOfBirth?: string;
}

type PincodeState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'resolved'; constituency: Constituency }
  | { status: 'not-found' }
  | { status: 'error' };

const schema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  dateOfBirth: z.string().min(1, 'Required').refine((val) => {
    if (!val) return false;
    const dob = new Date(val);
    const today = new Date();
    const age18 = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    return dob <= age18;
  }, 'You must be at least 18 years old to apply'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  addressLine: z.string().min(5, 'Enter your door no., street, and city'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'),
  nationalId: z.string().regex(/^\d{12}$/, 'Aadhaar number must be exactly 12 digits'),
});

type FormData = z.infer<typeof schema>;

export default function VoterIdApplicationPage() {
  const [existing, setExisting] = useState<any>(null);
  const [voterProfile, setVoterProfile] = useState<VoterProfile | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [pincodeState, setPincodeState] = useState<PincodeState>({ status: 'idle' });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { gender: 'MALE' },
  });

  useEffect(() => {
    const fetchData = async () => {
      // A voter who claimed an existing Voter ID has a profile but no application,
      // so load the profile on its own (404 just means "no Voter ID yet").
      try {
        const profileRes = await axiosClient.get('/voter/profile');
        setVoterProfile(profileRes.data.data);
      } catch {}
      try {
        const r = await applicationApi.getMine();
        const apps = r.data.data;
        if (apps && apps.length > 0) {
          // Show the latest application.
          setExisting(apps[apps.length - 1]);
        }
      } catch {}
      setLoadingExisting(false);
    };
    fetchData();
  }, []);

  const lookupPincode = async (pin: string) => {
    if (!/^\d{6}$/.test(pin)) return;
    setPincodeState({ status: 'loading' });
    try {
      const res = await axiosClient.get(`/constituencies/by-pincode/${pin}`);
      const constituency = res.data.data as Constituency;
      if (constituency) {
        setPincodeState({ status: 'resolved', constituency });
      } else {
        setPincodeState({ status: 'not-found' });
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setPincodeState({ status: 'not-found' });
      } else {
        setPincodeState({ status: 'error' });
      }
    }
  };

  const resolvedConstituency =
    pincodeState.status === 'resolved' ? pincodeState.constituency : null;

  const onSubmit = async (data: FormData) => {
    if (!resolvedConstituency) {
      toast.error('Please enter a valid PIN code to identify your constituency.');
      return;
    }
    try {
      await applicationApi.submit({
        fullName: data.fullName,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        address: `${data.addressLine}, ${data.pincode}`,
        pincode: data.pincode,
        nationalId: data.nationalId,
      });
      toast.success('Application submitted. A booth level officer will review it shortly.');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Submission failed');
    }
  };

  if (loadingExisting) return <LoadingSpinner />;

  if (voterProfile && existing?.status !== 'APPROVED') {
    return (
      <div className="page-wrap-sm page-content">
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="h1" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>Voter ID</h1>
        </div>
        <VoterIdCard
          fullName={voterProfile.fullName ?? ''}
          voterIdNumber={voterProfile.voterIdNumber}
          constituencyName={voterProfile.constituencyName}
          gender={voterProfile.gender}
          dateOfBirth={voterProfile.dateOfBirth}
          address={voterProfile.address}
          photoUrl={voterProfile.photoUrl}
        />
      </div>
    );
  }

  // A rejected applicant gets the form again, with the officer's reason shown above it.
  if (existing && existing.status !== 'REJECTED') {
    const isApproved = existing.status === 'APPROVED';
    return (
      <div className="page-wrap-sm page-content">
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="h1" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>Voter ID</h1>
        </div>

        {isApproved && voterProfile ? (
          <VoterIdCard
            fullName={existing.fullName}
            voterIdNumber={voterProfile.voterIdNumber}
            constituencyName={voterProfile.constituencyName}
            gender={existing.gender}
            dateOfBirth={existing.dateOfBirth}
            address={voterProfile.address || existing.address}
            photoUrl={voterProfile.photoUrl || existing.photoUrl}
          />
        ) : (
          <div className="card-padded">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 className="h3">Your application</h3>
              <StatusBadge status={existing.status} />
            </div>
            <hr className="divider" />
            <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.9375rem', color: 'var(--muted)' }}>
              {existing.status === 'PENDING' || existing.status === 'UNDER_REVIEW'
                ? 'Your application is under review. You will be notified once it is processed.'
                : existing.status === 'REJECTED'
                ? 'Your application was not approved.'
                : 'Your application has been received and is being processed.'}
            </p>
            {existing.remarks && (
              <div style={{
                marginTop: '1.25rem',
                background: 'rgba(15,25,35,0.04)',
                borderLeft: '3px solid var(--rule)',
                borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                padding: '0.875rem 1rem',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '0.875rem', color: 'var(--ink-80)',
              }}>
                <strong style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', color: 'var(--muted)' }}>
                  Officer remarks
                </strong>
                {existing.remarks}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page-wrap-sm page-content">
      <div style={{ marginBottom: '2rem' }}>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.8125rem', fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--muted)', marginBottom: '0.5rem',
        }}>Voter portal</p>
        <h1 className="h1" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>Apply for Voter ID</h1>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.9375rem', color: 'var(--muted)', marginTop: '0.5rem',
        }}>
          Fill in your details exactly as they appear on your Aadhaar card.
        </p>
      </div>

      {existing?.status === 'REJECTED' && (
        <div style={{
          marginBottom: '1.5rem', padding: '1rem 1.25rem',
          background: 'rgba(192,57,43,0.06)', border: '1.5px solid rgba(192,57,43,0.35)',
          borderRadius: 'var(--radius)', fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ink)', marginBottom: '0.25rem' }}>
            Your previous application was rejected
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-80)' }}>
            Officer's reason: {existing.remarks || 'No reason given'}. Correct the details below and submit again.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Personal details */}
        <div className="card-padded" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="section-heading" style={{ marginBottom: '0.5rem' }}>
            <h3 className="h3">Personal details</h3>
          </div>

          <div className="field">
            <label>Full name <span style={{ color: 'var(--saffron)' }}>*</span></label>
            <input {...register('fullName')} type="text" placeholder="As on Aadhaar"
              className={`input ${errors.fullName ? 'input-error' : ''}`} />
            {errors.fullName && <p className="error-msg">{errors.fullName.message}</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="field">
              <label>Date of birth <span style={{ color: 'var(--saffron)' }}>*</span></label>
              <input {...register('dateOfBirth')} type="date"
                max={(() => {
                  const d = new Date();
                  d.setFullYear(d.getFullYear() - 18);
                  return d.toISOString().split('T')[0];
                })()}
                className={`input ${errors.dateOfBirth ? 'input-error' : ''}`} />
              {errors.dateOfBirth && <p className="error-msg">{errors.dateOfBirth.message}</p>}
            </div>
            <div className="field">
              <label>Gender <span style={{ color: 'var(--saffron)' }}>*</span></label>
              <select {...register('gender')} className="input">
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other / Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>Aadhaar number <span style={{ color: 'var(--saffron)' }}>*</span></label>
            <input {...register('nationalId')} type="text" inputMode="numeric" maxLength={12}
              placeholder="12-digit Aadhaar number"
              className={`input ${errors.nationalId ? 'input-error' : ''}`} />
            {errors.nationalId && <p className="error-msg">{errors.nationalId.message}</p>}
          </div>
        </div>

        {/* Address */}
        <div className="card-padded" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="section-heading" style={{ marginBottom: '0.5rem' }}>
            <h3 className="h3">Address &amp; constituency</h3>
          </div>

          <div className="field">
            <label>Door no., Street, City <span style={{ color: 'var(--saffron)' }}>*</span></label>
            <textarea {...register('addressLine')} rows={2}
              placeholder="e.g. 12/A, MG Road, Basavanagudi, Bengaluru"
              className={`input ${errors.addressLine ? 'input-error' : ''}`}
              style={{ resize: 'vertical' }} />
            {errors.addressLine && <p className="error-msg">{errors.addressLine.message}</p>}
          </div>

          <div className="field">
            <label>PIN code <span style={{ color: 'var(--saffron)' }}>*</span></label>
            <input
              {...register('pincode')}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit PIN code"
              className={`input ${errors.pincode ? 'input-error' : ''}`}
              onBlur={(e) => {
                register('pincode').onBlur(e);
                lookupPincode(e.target.value);
              }}
            />
            {errors.pincode && <p className="error-msg">{errors.pincode.message}</p>}
          </div>

          {/* Constituency resolution panel */}
          {pincodeState.status !== 'idle' && (
            <ConstituencyPanel state={pincodeState} />
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !resolvedConstituency}
          className="btn btn-primary"
          style={{ padding: '0.875rem', fontSize: '1rem' }}
        >
          {isSubmitting ? 'Submitting application…' : 'Submit application'}
        </button>
        {!resolvedConstituency && pincodeState.status !== 'idle' && (
          <p style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '0.8125rem', color: 'var(--muted)',
            textAlign: 'center', marginTop: '-0.5rem',
          }}>
            Constituency must be resolved from your PIN code before submitting.
          </p>
        )}
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Voter ID Card ─────────────────────────────────────────────────────────────

function VoterIdCard({
  fullName, voterIdNumber, constituencyName, gender, dateOfBirth, address, photoUrl,
}: {
  fullName: string;
  voterIdNumber: string;
  constituencyName: string;
  gender: string;
  dateOfBirth?: string;
  address?: string;
  photoUrl?: string;
}) {
  const dob = dateOfBirth
    ? new Date(dateOfBirth).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .voter-id-card {
          position: relative;
          width: 100%;
          max-width: 480px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(15,25,35,0.18), 0 2px 8px rgba(15,25,35,0.10);
          font-family: 'Inter', system-ui, sans-serif;
          background: #FFFFFF;
          color: #0F1923;
        }
        .voter-id-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%);
          background-size: 400px 100%;
          animation: shimmer 4s ease-in-out infinite;
          pointer-events: none;
          border-radius: 16px;
        }
        .vid-stripe {
          display: flex;
          height: 6px;
        }
        .vid-stripe-s { background: #E8622A; flex: 1; }
        .vid-stripe-w { background: #FFFFFF; flex: 1; }
        .vid-stripe-g { background: #2D7A4F; flex: 1; }
        .vid-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 18px 10px;
          border-bottom: 1px solid rgba(15,25,35,0.1);
        }
        .vid-chakra {
          width: 28px; height: 28px;
          flex-shrink: 0;
          opacity: 0.9;
        }
        .vid-header-text {
          flex: 1;
        }
        .vid-header-title {
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(15,25,35,0.45);
          line-height: 1;
        }
        .vid-header-subtitle {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #0F1923;
          margin-top: 2px;
          line-height: 1.2;
        }
        .vid-eci-logo {
          font-size: 0.625rem;
          letter-spacing: 0.08em;
          font-weight: 700;
          color: rgba(15,25,35,0.35);
          text-transform: uppercase;
          text-align: right;
          line-height: 1.4;
        }
        .vid-body {
          display: flex;
          gap: 16px;
          padding: 16px 18px 14px;
        }
        .vid-photo {
          width: 76px;
          height: 90px;
          border-radius: 6px;
          border: 2px solid rgba(15,25,35,0.12);
          flex-shrink: 0;
          overflow: hidden;
          background: rgba(15,25,35,0.04);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .vid-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .vid-photo-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .vid-fields {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .vid-name {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.1rem;
          font-weight: 700;
          color: #0F1923;
          line-height: 1.2;
          margin-bottom: 2px;
        }
        .vid-field {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .vid-field-label {
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(15,25,35,0.4);
        }
        .vid-field-value {
          font-size: 0.8rem;
          font-weight: 500;
          color: #0F1923;
          line-height: 1.3;
        }
        .vid-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .vid-footer {
          border-top: 1px solid rgba(15,25,35,0.1);
          padding: 10px 18px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .vid-id-block {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .vid-id-label {
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(15,25,35,0.4);
        }
        .vid-id-number {
          font-family: 'Courier New', Courier, monospace;
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: #E8622A;
        }
        .vid-valid {
          font-size: 0.625rem;
          letter-spacing: 0.08em;
          font-weight: 600;
          text-transform: uppercase;
          color: rgba(15,25,35,0.3);
          text-align: right;
        }
        .vid-valid span {
          display: block;
          font-size: 0.75rem;
          color: rgba(15,25,35,0.5);
          letter-spacing: 0;
          font-weight: 500;
        }
        .vid-download-row {
          display: flex;
          justify-content: flex-end;
          margin-top: 1rem;
        }
      `}</style>

      <div className="voter-id-card">
        {/* Tricolour stripe */}
        <div className="vid-stripe">
          <div className="vid-stripe-s" />
          <div className="vid-stripe-w" />
          <div className="vid-stripe-g" />
        </div>

        {/* Header */}
        <div className="vid-header">
          <svg className="vid-chakra" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="44" stroke="#4B8BDD" strokeWidth="4" fill="none"/>
            <circle cx="50" cy="50" r="6" fill="#4B8BDD"/>
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i * 360) / 24;
              const rad = (angle * Math.PI) / 180;
              const x1 = 50 + 10 * Math.cos(rad);
              const y1 = 50 + 10 * Math.sin(rad);
              const x2 = 50 + 44 * Math.cos(rad);
              const y2 = 50 + 44 * Math.sin(rad);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4B8BDD" strokeWidth="1.5" opacity="0.7"/>;
            })}
          </svg>
          <div className="vid-header-text">
            <div className="vid-header-title">Election Commission of India</div>
            <div className="vid-header-subtitle">Electors Photo Identity Card</div>
          </div>
          <div className="vid-eci-logo">भारत<br/>निर्वाचन<br/>आयोग</div>
        </div>

        {/* Body */}
        <div className="vid-body">
          <div className="vid-photo">
            {photoUrl ? (
              <img src={photoUrl} alt={fullName} />
            ) : (
              <div className="vid-photo-placeholder">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(15,25,35,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <span style={{ fontSize: '0.5rem', color: 'rgba(15,25,35,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Photo</span>
              </div>
            )}
          </div>

          <div className="vid-fields">
            <div className="vid-name">{fullName}</div>
            <div className="vid-row">
              <div className="vid-field">
                <div className="vid-field-label">Gender</div>
                <div className="vid-field-value">{gender.charAt(0) + gender.slice(1).toLowerCase()}</div>
              </div>
              {dob && (
                <div className="vid-field">
                  <div className="vid-field-label">Date of Birth</div>
                  <div className="vid-field-value">{dob}</div>
                </div>
              )}
            </div>
            <div className="vid-field">
              <div className="vid-field-label">Constituency</div>
              <div className="vid-field-value">{constituencyName}</div>
            </div>
            {address && (
              <div className="vid-field">
                <div className="vid-field-label">Address</div>
                <div className="vid-field-value" style={{ fontSize: '0.75rem', opacity: 0.8 }}>{address}</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer — ID number */}
        <div className="vid-footer">
          <div className="vid-id-block">
            <div className="vid-id-label">Voter ID</div>
            <div className="vid-id-number">{voterIdNumber}</div>
          </div>
          <div className="vid-valid">
            Valid for<span>All Elections</span>
          </div>
        </div>
      </div>

      <p style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: '0.75rem', color: 'var(--muted)',
        marginTop: '0.875rem',
      }}>
        This is a digital representation of your Voter ID. Present a physical copy or government-verified digital ID at the polling booth.
      </p>
    </>
  );
}

function ConstituencyPanel({ state }: { state: PincodeState }) {
  if (state.status === 'loading') {
    return (
      <div style={panelBase}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span style={mutedText}>Looking up PIN code…</span>
      </div>
    );
  }

  if (state.status === 'resolved') {
    return (
      <div style={{ ...panelBase, background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.25)' }}>
        <span style={{
          width: 20, height: 20, borderRadius: '50%',
          background: 'rgba(22,163,74,0.15)', color: '#16a34a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
        }}>✓</span>
        <div>
          <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.2rem' }}>
            Constituency identified from PIN code
          </div>
          <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ink)' }}>
            {state.constituency.name}
          </div>
          <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
            {state.constituency.district} · {state.constituency.state}
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'not-found') {
    return (
      <div style={{ ...panelBase, background: 'rgba(232,98,42,0.06)', border: '1px solid rgba(232,98,42,0.25)' }}>
        <span style={warnDot}>!</span>
        <div>
          <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink)', marginBottom: '0.2rem' }}>
            PIN code not recognised
          </div>
          <p style={mutedText}>
            This PIN code doesn't match any constituency in our system.
            This demo supports Karnataka only. Please double-check your PIN code.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={panelBase}>
      <span style={warnDot}>!</span>
      <span style={mutedText}>Could not look up PIN code. Check your connection and try again.</span>
    </div>
  );
}

const panelBase: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
  padding: '0.875rem 1rem',
  background: 'rgba(15,25,35,0.04)',
  border: '1px solid var(--rule)',
  borderRadius: 'var(--radius-sm)',
};

const mutedText: React.CSSProperties = {
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: '0.8125rem', color: 'var(--muted)', lineHeight: 1.5,
};

const warnDot: React.CSSProperties = {
  width: 20, height: 20, borderRadius: '50%',
  background: 'rgba(232,98,42,0.12)', color: 'var(--saffron)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
};

