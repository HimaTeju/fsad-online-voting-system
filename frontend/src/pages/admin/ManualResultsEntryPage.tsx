import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { resultApi } from '../../api/resultApi';
import { electionApi } from '../../api/electionApi';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { StatusBadge } from '../../components/common/StatusBadge';
import type { Candidate } from '../../types/candidate.types';
import type { Election } from '../../types/election.types';
import toast from 'react-hot-toast';

const INTER = "'Inter', system-ui, sans-serif";
const SERIF = "'Playfair Display', Georgia, serif";
const COLUMNS = '1fr 110px 140px 110px';

interface UploadSummary { booths: number; rows: number; boothVotes: number; fileName: string }

/** A CSV the officer can fill in: one row per booth per candidate. */
function templateCsv(candidates: Candidate[]): string {
  const quote = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = ['booth,candidate_id,candidate_name,votes'];
  for (const booth of ['Booth 1', 'Booth 2', 'Booth 3']) {
    for (const c of candidates) lines.push([booth, String(c.id), quote(c.fullName), '0'].join(','));
  }
  return lines.join('\n') + '\n';
}

export default function ManualResultsEntryPage() {
  const { electionId } = useParams<{ electionId: string }>();
  const id = Number(electionId);
  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const applyResult = (result: any) => {
    setFinalized(!!result?.finalized);
    const saved: Record<number, number> = {};
    for (const r of result?.results ?? []) {
      if (r.manualBoothVotes) saved[r.candidateId] = r.manualBoothVotes;
    }
    setVotes(saved);
  };

  useEffect(() => {
    Promise.all([
      electionApi.getById(id),
      electionApi.getCandidates(id),
      resultApi.getResults(id).catch(() => null),
    ]).then(([elRes, candRes, resultRes]) => {
      setElection(elRes.data.data);
      setCandidates(candRes.data.data);
      if (resultRes) applyResult(resultRes.data.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const boothResults = () => candidates.map((c) => ({ candidateId: c.id, manualBoothVotes: votes[c.id] ?? 0 }));

  const downloadTemplate = () => {
    const blob = new Blob([templateCsv(candidates)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `booth-results-election-${id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const res = await adminApi.uploadBoothCsv(id, file);
      const data = res.data.data;
      applyResult(data.results);
      setSummary({ booths: data.booths, rows: data.rows, boothVotes: data.boothVotes, fileName: file.name });
      toast.dismiss(); // clear any error from an earlier, bad upload
      toast.success(`Imported ${data.boothVotes.toLocaleString()} booth votes from ${data.booths} booths`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed', { duration: 8000 });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.enterManualResults(id, { results: boothResults() });
      toast.success('Booth results saved');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const finalize = async () => {
    if (!confirm('Finalise and publish results? Booth counts are locked after this.')) return;
    try {
      // Save the table first so unsaved manual corrections aren't lost.
      await adminApi.enterManualResults(id, { results: boothResults() });
      await adminApi.finalizeResults(id);
      setFinalized(true);
      setElection((e) => (e ? { ...e, status: 'RESULTS_DECLARED' } : e));
      toast.success('Results finalised and announced');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Finalisation failed');
    }
  };

  if (loading) return <LoadingSpinner />;

  const votingClosed = election?.status === 'VOTING_CLOSED' || election?.status === 'RESULTS_DECLARED';
  const rows = candidates.map((c) => {
    const booth = votes[c.id] ?? 0;
    return { c, online: c.onlineVoteCount, booth, total: c.onlineVoteCount + booth };
  });
  const top = Math.max(0, ...rows.map((r) => r.total));
  const sum = (k: 'online' | 'booth' | 'total') => rows.reduce((n, r) => n + r[k], 0);

  return (
    <div className="page-wrap-sm page-content">
      <div style={{ marginBottom: '2rem' }}>
        <p style={{
          fontFamily: INTER, fontSize: '0.8125rem', fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem',
        }}>Results</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1 className="h1" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>{election?.title}</h1>
          {election && <StatusBadge status={election.status} />}
        </div>
        <p style={{ fontFamily: INTER, fontSize: '0.9375rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
          Online votes are counted automatically. Add the booth (offline) counts, check the totals,
          then finalise to announce the result.
        </p>
      </div>

      {!votingClosed && (
        <div className="card-padded" style={{ marginBottom: '1.5rem', fontFamily: INTER, color: 'var(--ink-80)' }}>
          Voting is still open. Close voting from <Link to="/admin/elections">Elections</Link> before entering booth results.
        </div>
      )}

      {votingClosed && !finalized && (
        <div className="card-padded" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <h3 className="h3">1. Upload booth results (CSV)</h3>
          <p style={{ fontFamily: INTER, fontSize: '0.875rem', color: 'var(--muted)' }}>
            One row per booth per candidate, with columns <code>booth, candidate_id, candidate_name, votes</code>.
            Votes are added up across booths. Uploading again replaces the previous booth counts.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={downloadTemplate} className="btn btn-secondary">
              Download template
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn btn-primary">
              {uploading ? 'Uploading…' : 'Upload CSV'}
            </button>
            <input
              ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
              data-testid="booth-csv-input"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
            />
          </div>
          {summary && (
            <p style={{ fontFamily: INTER, fontSize: '0.875rem', color: 'var(--success)', fontWeight: 600 }}>
              ✓ {summary.fileName}: {summary.rows} rows from {summary.booths} booths,{' '}
              {summary.boothVotes.toLocaleString()} booth votes imported.
            </p>
          )}
        </div>
      )}

      <div className="card-padded" style={{ display: 'flex', flexDirection: 'column' }}>
        <h3 className="h3" style={{ marginBottom: '1rem' }}>
          {votingClosed && !finalized ? '2. Check the totals' : 'Vote count'}
        </h3>
        <div style={{
          display: 'grid', gridTemplateColumns: COLUMNS, gap: '1rem',
          paddingBottom: '0.75rem', borderBottom: '1px solid var(--rule)',
        }}>
          {['Candidate', 'Online', 'Booth', 'Total'].map((h) => (
            <span key={h} style={{
              fontFamily: INTER, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: 'var(--muted)', textAlign: h === 'Candidate' ? 'left' : 'right',
            }}>{h}</span>
          ))}
        </div>

        {rows.map(({ c, online, total }) => {
          const leading = top > 0 && total === top;
          return (
            <div key={c.id} style={{
              display: 'grid', gridTemplateColumns: COLUMNS, gap: '1rem', alignItems: 'center',
              padding: '0.875rem 0', borderBottom: '1px solid var(--rule)',
              background: leading ? 'rgba(45,122,79,0.06)' : undefined,
            }}>
              <div>
                <p style={{ fontFamily: INTER, fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ink)' }}>
                  {c.fullName}{leading && <span style={{ color: 'var(--success)', marginLeft: '0.4rem' }}>
                    {finalized ? '· Winner' : '· Leading'}</span>}
                </p>
                <p style={{ fontFamily: INTER, fontSize: '0.8125rem', color: 'var(--muted)' }}>{c.partyName || 'Independent'}</p>
              </div>
              <div style={{ textAlign: 'right', fontFamily: SERIF, fontWeight: 600 }}>{online.toLocaleString()}</div>
              <input
                type="number" min={0} placeholder="0" aria-label={`Booth votes for ${c.fullName}`}
                value={votes[c.id] ?? ''}
                onChange={(e) => setVotes({ ...votes, [c.id]: Math.max(0, Number(e.target.value) || 0) })}
                className="input" disabled={finalized || !votingClosed}
                style={{ textAlign: 'right', fontFamily: SERIF, fontWeight: 600 }}
              />
              <div style={{ textAlign: 'right', fontFamily: SERIF, fontWeight: 700, fontSize: '1.05rem',
                color: leading ? 'var(--success)' : 'var(--ink)' }}>{total.toLocaleString()}</div>
            </div>
          );
        })}

        <div style={{
          display: 'grid', gridTemplateColumns: COLUMNS, gap: '1rem', padding: '0.875rem 0',
          fontFamily: INTER, fontWeight: 700, fontSize: '0.875rem',
        }}>
          <span>All candidates</span>
          <span style={{ textAlign: 'right' }}>{sum('online').toLocaleString()}</span>
          <span style={{ textAlign: 'right', paddingRight: '0.9rem' }}>{sum('booth').toLocaleString()}</span>
          <span style={{ textAlign: 'right' }}>{sum('total').toLocaleString()}</span>
        </div>

        {finalized ? (
          <p style={{ paddingTop: '0.5rem', fontFamily: INTER, color: 'var(--muted)' }}>
            Results are finalised and announced. Booth counts can no longer be changed.{' '}
            <Link to={`/results?election=${id}`}>View public results →</Link>
          </p>
        ) : votingClosed && (
          <>
            <h3 className="h3" style={{ marginTop: '1rem' }}>3. Announce</h3>
            <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.75rem' }}>
              <button onClick={save} disabled={saving} className="btn btn-secondary" style={{ flex: 1, padding: '0.75rem' }}>
                {saving ? 'Saving…' : 'Save corrections'}
              </button>
              <button onClick={finalize} className="btn btn-success" style={{ flex: 1, padding: '0.75rem' }}>
                Finalise &amp; announce results
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
