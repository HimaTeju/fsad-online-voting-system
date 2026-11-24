import { useEffect, useState } from 'react';
import { fieldOfficerApi } from '../../api/fieldOfficerApi';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { StatusBadge } from '../../components/common/StatusBadge';
import type { VoterIdApplication } from '../../types/application.types';
import { formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

// ── Detail drawer ────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.875rem', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <span style={{ color: 'var(--muted)', minWidth: 130, flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--ink)', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

function ApplicationDrawer({
  app,
  remarksValue,
  onRemarksChange,
  onReview,
  onVerifyToggle,
  onClose,
}: {
  app: VoterIdApplication;
  remarksValue: string;
  onRemarksChange: (v: string) => void;
  onReview: (approved: boolean) => void;
  onVerifyToggle: () => void;
  onClose: () => void;
}) {
  const canReview = app.status === 'PENDING' || app.status === 'UNDER_REVIEW';

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 40, backdropFilter: 'blur(2px)',
        }}
      />
      {/* panel */}
      <div style={{
        position: 'fixed', top: 56, right: 0, bottom: 0, width: '100%', maxWidth: 480,
        background: 'var(--paper)', zIndex: 50,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
      }}>
        {/* header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--rule)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 700, fontSize: '1.0625rem', color: 'var(--ink)' }}>
              {app.fullName}
            </p>
            <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.8125rem', color: 'var(--muted)', marginTop: 2 }}>
              Application #{app.id}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <StatusBadge status={app.status} />
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--muted)', fontSize: '1.25rem', lineHeight: 1, padding: 4,
              }}
              aria-label="Close"
            >✕</button>
          </div>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* photo */}
          {app.photoUrl && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <img
                src={app.photoUrl}
                alt="Applicant photo"
                style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--rule)' }}
              />
            </div>
          )}

          {/* personal details */}
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.25rem' }}>
              Personal details
            </p>
            <DetailRow label="Full name" value={app.fullName} />
            <DetailRow label="Date of birth" value={app.dateOfBirth ? formatDate(app.dateOfBirth) : undefined} />
            <DetailRow label="Gender" value={app.gender} />
            <DetailRow label="Address" value={app.address} />
            <DetailRow label="National ID" value={app.nationalId} />
            <DetailRow label="Constituency" value={app.constituencyName} />
            <DetailRow label="Submitted" value={app.submittedAt ? formatDate(app.submittedAt) : undefined} />
            {app.reviewedAt && <DetailRow label="Reviewed" value={formatDate(app.reviewedAt)} />}
            {app.remarks && <DetailRow label="Remarks" value={app.remarks} />}
          </div>

          {/* physical verification toggle */}
          <div style={{
            background: app.isPhysicalVerified ? 'rgba(16,185,129,0.08)' : 'var(--surface)',
            border: `1px solid ${app.isPhysicalVerified ? 'rgba(16,185,129,0.4)' : 'var(--rule)'}`,
            borderRadius: 'var(--radius)', padding: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          }}>
            <div>
              <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ink)' }}>
                Physical verification
              </p>
              <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.8125rem', color: 'var(--muted)', marginTop: 2 }}>
                {app.isPhysicalVerified
                  ? 'Marked as physically verified'
                  : 'Officer has physically verified the applicant documents'}
              </p>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={!!app.isPhysicalVerified}
                onChange={onVerifyToggle}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', cursor: 'pointer', inset: 0,
                background: app.isPhysicalVerified ? 'var(--accent, #2563eb)' : '#d1d5db',
                borderRadius: 24, transition: 'background 0.2s',
              }}>
                <span style={{
                  position: 'absolute', top: 3, left: app.isPhysicalVerified ? 23 : 3,
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </span>
            </label>
          </div>

          {/* review actions */}
          {canReview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Review decision
              </p>
              <input
                placeholder="Reason for rejection (required when rejecting)"
                value={remarksValue}
                onChange={(e) => onRemarksChange(e.target.value)}
                className="input"
              />
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => onReview(true)}
                  className="btn btn-success"
                  style={{ flex: 1, opacity: app.isPhysicalVerified ? 1 : 0.4, cursor: app.isPhysicalVerified ? 'pointer' : 'not-allowed' }}
                  disabled={!app.isPhysicalVerified}
                  title={!app.isPhysicalVerified ? 'Physical verification required before approving' : undefined}
                >
                  Approve
                </button>
                <button onClick={() => onReview(false)} className="btn btn-danger" style={{ flex: 1 }}>
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ApplicationQueuePage() {
  const [apps, setApps] = useState<VoterIdApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [remarksMap, setRemarksMap] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<VoterIdApplication | null>(null);

  const load = () => {
    fieldOfficerApi.getApplications({ page: 0, size: 20 }).then((res) => {
      const payload = res.data.data;
      setApps(Array.isArray(payload) ? payload : (payload?.content ?? []));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Keep the drawer in sync when list refreshes
  useEffect(() => {
    if (selected) {
      const updated = apps.find((a) => a.id === selected.id);
      if (updated) setSelected(updated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps]);

  const review = async (id: number, approved: boolean) => {
    try {
      await fieldOfficerApi.reviewApplication(id, { approved, remarks: remarksMap[id] || '' });
      toast.success(approved ? 'Application approved' : 'Application rejected');
      setSelected(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Review failed');
    }
  };

  const toggleVerify = async (app: VoterIdApplication) => {
    try {
      const res = await fieldOfficerApi.setPhysicalVerified(app.id, !app.isPhysicalVerified);
      const updated: VoterIdApplication = res.data.data;
      setApps((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setSelected(updated);
      toast.success(updated.isPhysicalVerified ? 'Marked as physically verified' : 'Verification removed');
    } catch {
      toast.error('Failed to update verification status');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-wrap page-content">
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.8125rem', fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--muted)', marginBottom: '0.5rem',
        }}>Booth Level Officer</p>
        <h1 className="h1">Voter ID applications</h1>
      </div>

      {apps.length === 0 ? (
        <div style={{
          background: 'var(--paper)', border: '1px solid var(--rule)',
          borderRadius: 'var(--radius)', padding: '3rem', textAlign: 'center',
        }}>
          <p style={{ fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--muted)' }}>
            No applications to review.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {apps.map((app) => (
            <div
              key={app.id}
              className="card-padded"
              style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onClick={() => setSelected(app)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <p style={{
                      fontFamily: "'Inter', system-ui, sans-serif",
                      fontWeight: 600, fontSize: '1rem', color: 'var(--ink)',
                    }}>{app.fullName}</p>
                    {app.isPhysicalVerified && (
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif",
                        background: 'rgba(16,185,129,0.12)', color: '#059669',
                        border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: 999, padding: '1px 8px', letterSpacing: '0.04em',
                      }}>
                        ✓ Physically verified
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.2rem',
                  }}>
                    {app.constituencyName} · Submitted {app.submittedAt ? formatDate(app.submittedAt) : '—'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  <StatusBadge status={app.status} />
                  <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontFamily: "'Inter', system-ui, sans-serif" }}>
                    View →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <ApplicationDrawer
          app={selected}
          remarksValue={remarksMap[selected.id] || ''}
          onRemarksChange={(v) => setRemarksMap({ ...remarksMap, [selected.id]: v })}
          onReview={(approved) => review(selected.id, approved)}
          onVerifyToggle={() => toggleVerify(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
