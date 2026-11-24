import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { electionApi } from '../../api/electionApi';
import { candidateApi } from '../../api/candidateApi';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Election } from '../../types/election.types';
import toast from 'react-hot-toast';

const schema = z.object({
  electionId: z.string().min(1, 'Select an election'),
  partyName: z.string().optional(),
  manifesto: z.string().min(10, 'Manifesto must be at least 10 characters'),
  education: z.string().optional(),
  criminalRecord: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NominationPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselectedId = params.get('electionId');
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { electionId: preselectedId ?? '' },
  });

  useEffect(() => {
    electionApi.list().then((r) =>
      setElections((r.data.data as Election[]).filter((e) => e.status === 'NOMINATION_OPEN'))
    ).finally(() => setLoading(false));
  }, []);

  const onSubmit = async (data: FormData) => {
    try {
      await candidateApi.nominate({ ...data, electionId: Number(data.electionId) });
      toast.success('Nomination submitted. Awaiting admin review.');
      navigate('/candidate');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Nomination failed');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-wrap-sm page-content">
      <div style={{ marginBottom: '2rem' }}>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.8125rem', fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--muted)', marginBottom: '0.5rem',
        }}>Candidate portal</p>
        <h1 className="h1" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>Submit nomination</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card-padded" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="section-heading" style={{ marginBottom: '0.25rem' }}>
            <h3 className="h3">Election & party</h3>
          </div>

          <div className="field">
            <label>Election <span style={{ color: 'var(--saffron)' }}>*</span></label>
            <select {...register('electionId')} className={`input ${errors.electionId ? 'input-error' : ''}`}>
              <option value="">Select an election…</option>
              {elections.map((e) => (
                <option key={e.id} value={e.id}>{e.title} — {e.constituencyName || 'National'}</option>
              ))}
            </select>
            {errors.electionId && <p className="error-msg">{errors.electionId.message}</p>}
          </div>

          <div className="field">
            <label>Party name <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional — leave blank for Independent)</span></label>
            <input {...register('partyName')} className="input" placeholder="e.g. National Democratic Alliance" />
          </div>
        </div>

        <div className="card-padded" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="section-heading" style={{ marginBottom: '0.25rem' }}>
            <h3 className="h3">Candidate declaration</h3>
          </div>

          <div className="field">
            <label>Manifesto <span style={{ color: 'var(--saffron)' }}>*</span></label>
            <textarea {...register('manifesto')} rows={5} className={`input ${errors.manifesto ? 'input-error' : ''}`}
              placeholder="Describe your platform, policies, and goals for your constituency…" />
            {errors.manifesto && <p className="error-msg">{errors.manifesto.message}</p>}
          </div>

          <div className="field">
            <label>Educational qualifications <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
            <input {...register('education')} className="input" placeholder="e.g. B.A. Economics, Delhi University" />
          </div>

          <div className="field">
            <label>Criminal record disclosure <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(required by law — enter None if not applicable)</span></label>
            <textarea {...register('criminalRecord')} rows={2} className="input" placeholder="None" />
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn btn-primary"
          style={{ padding: '0.875rem', fontSize: '1rem' }}>
          {isSubmitting ? 'Submitting nomination…' : 'Submit nomination'}
        </button>
      </form>
    </div>
  );
}
