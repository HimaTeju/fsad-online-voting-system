import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import toast from 'react-hot-toast';

const schema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  electionType: z.enum(['GENERAL', 'STATE', 'LOCAL']),
  constituencyId: z.string().optional(),
  nominationStart: z.string().min(1, 'Required'),
  nominationEnd: z.string().min(1, 'Required'),
  votingStart: z.string().min(1, 'Required'),
  votingEnd: z.string().min(1, 'Required'),
});

type FormData = z.infer<typeof schema>;

export default function ElectionFormPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { electionType: 'GENERAL' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        constituencyId: data.constituencyId ? Number(data.constituencyId) : undefined,
      };
      await adminApi.createElection(payload);
      toast.success('Election created.');
      navigate('/admin/elections');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create election');
    }
  };

  return (
    <div className="page-wrap-sm page-content">
      <div style={{ marginBottom: '2rem' }}>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.8125rem', fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--muted)', marginBottom: '0.5rem',
        }}>Administration</p>
        <h1 className="h1" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>New election</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card-padded" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="section-heading" style={{ marginBottom: '0.25rem' }}>
            <h3 className="h3">Basic info</h3>
          </div>

          <div className="field">
            <label>Title <span style={{ color: 'var(--saffron)' }}>*</span></label>
            <input {...register('title')} className={`input ${errors.title ? 'input-error' : ''}`}
              placeholder="e.g. 2024 General Election" />
            {errors.title && <p className="error-msg">{errors.title.message}</p>}
          </div>

          <div className="field">
            <label>Description <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
            <textarea {...register('description')} className="input" rows={3} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="field">
              <label>Election type <span style={{ color: 'var(--saffron)' }}>*</span></label>
              <select {...register('electionType')} className="input">
                <option value="GENERAL">General</option>
                <option value="STATE">State</option>
                <option value="LOCAL">Local</option>
              </select>
            </div>
            <div className="field">
              <label>Constituency ID <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
              <input {...register('constituencyId')} type="number" className="input"
                placeholder="Leave blank for national" />
            </div>
          </div>
        </div>

        <div className="card-padded" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="section-heading" style={{ marginBottom: '0.25rem' }}>
            <h3 className="h3">Schedule</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              { name: 'nominationStart', label: 'Nominations open' },
              { name: 'nominationEnd',   label: 'Nominations close' },
              { name: 'votingStart',     label: 'Voting opens' },
              { name: 'votingEnd',       label: 'Voting closes' },
            ].map(({ name, label }) => (
              <div className="field" key={name}>
                <label>{label} <span style={{ color: 'var(--saffron)' }}>*</span></label>
                <input {...register(name as any)} type="datetime-local"
                  className={`input ${(errors as any)[name] ? 'input-error' : ''}`} />
                {(errors as any)[name] && <p className="error-msg">{(errors as any)[name].message}</p>}
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn btn-primary"
          style={{ padding: '0.875rem', fontSize: '1rem' }}>
          {isSubmitting ? 'Creating…' : 'Create election'}
        </button>
      </form>
    </div>
  );
}
