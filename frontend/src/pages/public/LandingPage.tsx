import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import IndiaMap from '../../components/public/IndiaMap';
import { STATE_SEATS } from '../../data/indiaSeats';

interface Constituency {
  id: number;
  name: string;
  state: string;
  district: string;
  seatType: string;
  totalVoters: number | null;
  region: string | null;
}

const REGIONS_ORDER = [
  'Bengaluru Metro',
  'South Karnataka',
  'Coastal Karnataka',
  'Central Karnataka',
  'North-West Karnataka',
  'North Karnataka',
];

const REGION_COLOR: Record<string, string> = {
  'Bengaluru Metro':      '#1a3a5c',
  'South Karnataka':      '#2d6a4f',
  'Coastal Karnataka':    '#1d6a8a',
  'Central Karnataka':    '#6b4226',
  'North-West Karnataka': '#4a3268',
  'North Karnataka':      '#7a4700',
};

const BLR_ASSEMBLY_SEGMENTS = [
  { name: 'Jayanagar',       desc: 'Old Bengaluru residential heart, JP Nagar' },
  { name: 'BTM Layout',      desc: 'IT corridor, Madiwala, Silk Board belt' },
  { name: 'Basavanagudi',    desc: 'Cultural hub, Bull Temple, Gandhibazar' },
  { name: 'Padmanabhanagar', desc: 'Uttarahalli, Banashankari' },
  { name: 'Vijayanagar',     desc: 'Vijayanagar, Attiguppe, West Bengaluru' },
  { name: 'Chickpet',        desc: 'Old commercial core, Cottonpet' },
  { name: 'Govindrajnagar',  desc: 'Govindrajnagar, Rajajinagar fringe' },
  { name: 'Dasarahalli',     desc: 'Peenya industrial area, NW fringe' },
];

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toString();
}

const STATES_SORTED = [...STATE_SEATS].sort((a, b) => b.seats - a.seats);

const heroStats = [
  { value: '947M', label: 'Registered voters' },
  { value: '28+', label: 'States covered' },
  { value: '100%', label: 'Verifiable results' },
];

const pillars = [
  {
    title: 'Register & verify',
    body: 'Apply for your Voter ID digitally. A booth level officer reviews your application — no queues, no lost paperwork.',
  },
  {
    title: 'Cast your vote',
    body: 'Vote from anywhere in India during the election window. One citizen, one vote, cryptographically enforced.',
  },
  {
    title: 'Follow the count',
    body: 'Results update in real time as votes are tallied. Booth counts are merged and published transparently.',
  },
];

export default function LandingPage() {
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState<'all' | 'state' | 'ut'>('all');

  useEffect(() => {
    axiosClient.get('/constituencies/karnataka')
      .then(r => setConstituencies(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const womenDistricts = constituencies
    .filter(c => c.seatType === 'WOMEN_RESERVED')
    .map(c => c.district);

  const grouped = REGIONS_ORDER.reduce<Record<string, Constituency[]>>((acc, r) => {
    acc[r] = constituencies.filter(c => c.region === r);
    return acc;
  }, {});

  const womenCount = constituencies.filter(c => c.seatType === 'WOMEN_RESERVED').length;
  const filtered = STATES_SORTED.filter(s =>
    stateFilter === 'all' ? true : s.type === stateFilter
  );
  const totalSeats = filtered.reduce((s, x) => s + x.seats, 0);

  return (
    <div style={{ background: 'var(--ivory)' }}>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{
        background: 'var(--ink)',
        color: '#fff',
        padding: '5rem 1.5rem 4.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.03,
          backgroundImage: 'repeating-linear-gradient(135deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
          backgroundSize: '18px 18px',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 1120, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.75rem' }}>
            <span style={{ display: 'block', width: 4, height: 18, background: 'var(--saffron)', borderRadius: 2 }} />
            <span style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)',
            }}>
              Election Commission of India — Digital Platform
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(2.5rem, 7vw, 5rem)',
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: '#fff',
            maxWidth: 780,
            marginBottom: '1.5rem',
          }}>
            Your vote.<br />
            <span style={{ color: 'var(--saffron)' }}>Your democracy.</span>
          </h1>

          <p style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 'clamp(1rem, 2vw, 1.1875rem)',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.6)',
            maxWidth: 520,
            lineHeight: 1.65,
            marginBottom: '2.5rem',
          }}>
            Participate in free and fair elections from anywhere in India.
            Secure, auditable, and open to every registered citizen.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-lg">
              Register to vote
            </Link>
            <Link to="/login" className="btn btn-secondary btn-lg" style={{
              background: 'rgba(255,255,255,0.06)',
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.15)',
            }}>
              Sign in
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{
          maxWidth: 1120,
          margin: '4rem auto 0',
          display: 'flex',
          gap: '3rem',
          paddingTop: '2.5rem',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          {heroStats.map(s => (
            <div key={s.label}>
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '-0.02em',
              }}>{s.value}</div>
              <div style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '0.8125rem',
                color: 'rgba(255,255,255,0.4)',
                marginTop: '0.125rem',
              }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>

          <div className="section-heading">
            <h2 className="h2">How it works</h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            marginTop: '2rem',
          }}>
            {pillars.map((p, i) => (
              <div key={p.title} style={{
                background: 'var(--paper)',
                border: '1px solid var(--rule)',
                borderRadius: 'var(--radius)',
                padding: '2rem',
                boxShadow: 'var(--shadow-card)',
              }}>
                <div style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--saffron)',
                  marginBottom: '1rem',
                }}>
                  0{i + 1}
                </div>
                <h3 style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 600,
                  fontSize: '1.25rem',
                  color: 'var(--ink)',
                  marginBottom: '0.625rem',
                }}>{p.title}</h3>
                <p style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: '0.9375rem',
                  color: 'var(--muted)',
                  lineHeight: 1.65,
                }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── National stats strip ─────────────────────────────── */}
      <section style={{ background: 'var(--paper)', borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)', padding: '2rem 1.5rem' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          {[
            { value: '543',           label: 'Lok Sabha seats',         sub: 'Total parliamentary constituencies' },
            { value: '28',            label: 'States',                   sub: '+ 8 Union Territories' },
            { value: '947M+',         label: 'Registered voters',        sub: 'As of 2024 General Election' },
            { value: `${womenCount}`, label: 'Women-reserved (demo)',    sub: 'Karnataka seats marked for demo' },
          ].map(s => (
            <div key={s.label} style={{
              flex: '1 1 170px',
              padding: '1.125rem 1.375rem',
              background: 'var(--ivory)',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--radius)',
            }}>
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
                fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em',
              }}>{s.value}</div>
              <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)', marginTop: '0.2rem' }}>{s.label}</div>
              <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.1rem' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Women's reservation notice ───────────────────────── */}
      <section style={{ padding: '1.25rem 1.5rem 0' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{
            padding: '0.875rem 1.125rem',
            background: 'rgba(232,98,42,0.07)',
            borderLeft: '4px solid var(--saffron)',
            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '0.875rem', lineHeight: 1.6,
          }}>
            <strong style={{ color: 'var(--saffron)' }}>Women's Reservation — Nari Shakti Vandan Adhiniyam (2023):</strong>
            {' '}The 106th Constitutional Amendment reserving 33% of Lok Sabha seats for women was passed in
            September 2023. It comes into force only after the next delimitation following the upcoming Census.
            {' '}<strong>Women-reserved seats shown below are demo-only.</strong>
          </div>
        </div>
      </section>

      {/* ── India map + State table ───────────────────────────── */}
      <section style={{ padding: '3rem 1.5rem' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '0.75rem', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--muted)', marginBottom: '0.4rem',
          }}>Lok Sabha 2024 · 543 Seats</p>
          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 700,
            color: 'var(--ink)', marginBottom: '0.5rem',
          }}>Seats by State & Union Territory</h2>
          <p style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '0.9rem', color: 'var(--muted)',
            marginBottom: '2rem',
          }}>Hover over any state on the map to see its seat count. Karnataka is highlighted in orange — our demo election state.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
            <div>
              <IndiaMap womenDistricts={womenDistricts} />
            </div>

            <div style={{
              background: 'var(--paper)',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              maxHeight: 640,
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--rule)', background: 'var(--ivory)' }}>
                {(['all', 'state', 'ut'] as const).map(f => (
                  <button key={f} onClick={() => setStateFilter(f)} style={{
                    flex: 1, padding: '0.75rem 0.5rem',
                    border: 'none', cursor: 'pointer',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: '0.8125rem', fontWeight: 600,
                    background: stateFilter === f ? 'var(--paper)' : 'transparent',
                    color: stateFilter === f ? 'var(--ink)' : 'var(--muted)',
                    borderBottom: stateFilter === f ? '2px solid var(--saffron)' : '2px solid transparent',
                    transition: 'color 0.15s',
                  }}>
                    {f === 'all' ? 'All (36)' : f === 'state' ? 'States (28)' : 'UTs (8)'}
                  </button>
                ))}
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.625rem 1rem',
                background: 'rgba(15,25,35,0.04)',
                borderBottom: '1px solid var(--rule)',
              }}>
                <span style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>Total</span>
                <span style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '1.125rem', fontWeight: 700, color: 'var(--ink)',
                }}>{totalSeats}</span>
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {filtered.map((s, i) => {
                  const pct = (s.seats / 543) * 100;
                  const isKarnataka = s.name === 'Karnataka';
                  return (
                    <div key={s.name} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.625rem 1rem',
                      background: isKarnataka ? 'rgba(232,98,42,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(15,25,35,0.02)',
                      borderBottom: '1px solid rgba(15,25,35,0.05)',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{
                            fontFamily: "'Inter', system-ui, sans-serif",
                            fontSize: '0.8125rem', fontWeight: isKarnataka ? 700 : 500,
                            color: isKarnataka ? 'var(--saffron)' : 'var(--ink)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{s.name}</span>
                          <span style={{
                            fontFamily: "'Inter', system-ui, sans-serif",
                            fontWeight: 700, fontSize: '0.875rem',
                            color: isKarnataka ? 'var(--saffron)' : 'var(--ink)',
                            flexShrink: 0, marginLeft: '0.5rem',
                          }}>{s.seats}</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(15,25,35,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 2,
                            width: `${pct}%`,
                            background: isKarnataka ? 'var(--saffron)' : 'var(--ink)',
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Karnataka constituency grid ───────────────────────── */}
      <section style={{ padding: '3rem 1.5rem', background: 'var(--paper)', borderTop: '1px solid var(--rule)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '0.75rem', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--saffron)', marginBottom: '0.4rem',
          }}>Zoom in — Karnataka</p>
          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 700,
            color: 'var(--ink)', marginBottom: '0.5rem',
          }}>28 Lok Sabha Constituencies by Region</h2>

          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            {[
              { color: 'var(--ink)', label: 'General seat' },
              { color: 'var(--saffron)', label: 'Women Reserved (demo)' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, background: l.color, display: 'inline-block' }} />
                <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.8125rem', color: 'var(--ink-80)' }}>{l.label}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
              {REGIONS_ORDER.map(r => (
                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: REGION_COLOR[r], display: 'inline-block' }} />
                  <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.75rem', color: 'var(--muted)' }}>{r}</span>
                </div>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--muted)' }}>
              Loading…
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {REGIONS_ORDER.map(region => {
                const seats = grouped[region] || [];
                if (!seats.length) return null;
                return (
                  <div key={region}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}>
                      <span style={{ width: 12, height: 12, borderRadius: 2, background: REGION_COLOR[region], display: 'inline-block', flexShrink: 0 }} />
                      <h3 style={{
                        fontFamily: "'Inter', system-ui, sans-serif",
                        fontSize: '0.875rem', fontWeight: 700,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        color: REGION_COLOR[region],
                      }}>{region}</h3>
                      <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {seats.length} seat{seats.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                      {seats.map(c => {
                        const isWomen = c.seatType === 'WOMEN_RESERVED';
                        const isDemo = c.name === 'Bengaluru South';
                        return (
                          <div key={c.id} style={{
                            background: isWomen ? 'rgba(232,98,42,0.05)' : 'var(--ivory)',
                            border: `1.5px solid ${isDemo ? 'var(--saffron)' : isWomen ? 'rgba(232,98,42,0.35)' : 'var(--rule)'}`,
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.875rem 1rem',
                            position: 'relative',
                            boxShadow: isDemo ? '0 0 0 3px rgba(232,98,42,0.12)' : 'none',
                          }}>
                            {isDemo && (
                              <span style={{
                                position: 'absolute', top: 6, right: 8,
                                fontFamily: "'Inter', system-ui, sans-serif",
                                fontSize: '0.625rem', fontWeight: 700,
                                letterSpacing: '0.08em', textTransform: 'uppercase',
                                color: 'var(--saffron)',
                                background: 'rgba(232,98,42,0.1)',
                                padding: '2px 6px', borderRadius: 4,
                              }}>DEMO</span>
                            )}
                            <div style={{
                              fontFamily: "'Inter', system-ui, sans-serif",
                              fontWeight: 600, fontSize: '0.875rem',
                              color: 'var(--ink)', marginBottom: '0.2rem',
                              paddingRight: isDemo ? '3rem' : 0,
                            }}>{c.name}</div>
                            <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.75rem', color: 'var(--muted)' }}>{c.district}</div>
                            {c.totalVoters && (
                              <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.75rem', color: 'var(--ink-40)', marginTop: '0.35rem' }}>
                                {fmt(c.totalVoters)} voters
                              </div>
                            )}
                            {isWomen && (
                              <div style={{
                                marginTop: '0.5rem', display: 'inline-flex',
                                alignItems: 'center', gap: '0.3rem',
                                fontFamily: "'Inter', system-ui, sans-serif",
                                fontSize: '0.6875rem', fontWeight: 600,
                                color: 'var(--saffron)',
                                background: 'rgba(232,98,42,0.08)',
                                padding: '2px 7px', borderRadius: 4,
                              }}>♀ Women Reserved</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Bengaluru South deep-dive ─────────────────────────── */}
      <section style={{ padding: '3.5rem 1.5rem', borderTop: '1px solid var(--rule)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '0.75rem', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--saffron)', marginBottom: '0.5rem',
          }}>Demo Constituency Spotlight</p>
          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 700,
            color: 'var(--ink)', marginBottom: '0.5rem',
          }}>Bengaluru South — PC No. 26</h2>
          <p style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '0.9375rem', color: 'var(--muted)',
            maxWidth: 600, lineHeight: 1.65, marginBottom: '2.5rem',
          }}>
            General seat covering affluent south Bengaluru — Jayanagar, BTM Layout, Basavanagudi
            and surroundings. ~1.95 million registered voters.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
            {[
              { label: 'Seat type',           value: 'General (Unreserved)' },
              { label: 'Registered voters',   value: '~1.95 million' },
              { label: 'Assembly segments',   value: '8 Vidhan Sabha seats' },
              { label: 'Constituency No.',    value: 'PC 26, Karnataka' },
            ].map(f => (
              <div key={f.label} style={{
                padding: '1rem 1.25rem', background: 'var(--paper)',
                border: '1px solid var(--rule)', borderRadius: 'var(--radius-sm)',
              }}>
                <div style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: '0.75rem', fontWeight: 600,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--muted)', marginBottom: '0.375rem',
                }}>{f.label}</div>
                <div style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ink)',
                }}>{f.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
            <div>
              <h3 style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '1rem',
              }}>8 Vidhan Sabha Assembly Segments</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {BLR_ASSEMBLY_SEGMENTS.map((seg, i) => (
                  <div key={seg.name} style={{
                    display: 'flex', gap: '0.875rem', alignItems: 'flex-start',
                    padding: '0.75rem 1rem',
                    background: 'var(--paper)', border: '1px solid var(--rule)',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'var(--ink)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Inter', system-ui, sans-serif",
                      fontSize: '0.6875rem', fontWeight: 700,
                      flexShrink: 0, marginTop: 1,
                    }}>{i + 1}</span>
                    <div>
                      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink)', marginBottom: '0.15rem' }}>{seg.name}</div>
                      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.4 }}>{seg.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '1rem',
              }}>Recent Members of Parliament</h3>
              <div style={{ background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Inter', system-ui, sans-serif", fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(15,25,35,0.04)', borderBottom: '1px solid var(--rule)' }}>
                      {['Year', 'MP', 'Party', 'Margin'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 0.875rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { year: '2024', name: 'Tejasvi Surya',  party: 'BJP',  margin: '2,31,765' },
                      { year: '2019', name: 'Tejasvi Surya',  party: 'BJP',  margin: '3,31,598' },
                      { year: '2014', name: 'Ananth Kumar',   party: 'BJP',  margin: '2,23,136' },
                      { year: '2009', name: 'Ananth Kumar',   party: 'BJP',  margin: '96,374'   },
                      { year: '2004', name: 'Ananth Kumar',   party: 'BJP',  margin: '62,671'   },
                    ].map((row, i) => (
                      <tr key={row.year} style={{ borderBottom: '1px solid rgba(15,25,35,0.06)', background: i % 2 === 1 ? 'rgba(15,25,35,0.02)' : 'transparent' }}>
                        <td style={{ padding: '0.75rem 0.875rem', fontWeight: 700, color: 'var(--ink)' }}>{row.year}</td>
                        <td style={{ padding: '0.75rem 0.875rem', color: 'var(--ink)' }}>{row.name}</td>
                        <td style={{ padding: '0.75rem 0.875rem' }}>
                          <span style={{ background: '#FF9933', color: '#fff', fontWeight: 700, fontSize: '0.7rem', padding: '2px 7px', borderRadius: 4 }}>{row.party}</span>
                        </td>
                        <td style={{ padding: '0.75rem 0.875rem', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums', fontSize: '0.8rem' }}>{row.margin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA band ─────────────────────────────────────────── */}
      <section style={{
        background: 'var(--ink)',
        padding: '3.5rem 1.5rem',
      }}>
        <div style={{
          maxWidth: 1120,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}>
          <div>
            <p style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(1.25rem, 3vw, 1.625rem)',
              fontWeight: 700,
              color: '#fff',
              marginBottom: '0.375rem',
            }}>
              Ready to participate?
            </p>
            <p style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: '0.9375rem',
              color: 'rgba(255,255,255,0.5)',
            }}>
              Register as a voter, or view the live election for Bengaluru South.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/results" className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', borderColor: 'rgba(255,255,255,0.18)' }}>
              View results
            </Link>
            <Link to="/register" className="btn btn-primary">Register to vote</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={{
        padding: '2rem 1.5rem',
        maxWidth: 1120,
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ width: 3, height: 14, background: 'var(--saffron)', borderRadius: 2, display: 'block' }} />
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 700,
            fontSize: '0.9375rem',
            color: 'var(--ink)',
          }}>VoteIndia Online</span>
        </div>
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '0.8125rem',
          color: 'var(--muted)',
        }}>
          © {new Date().getFullYear()} Election Commission of India
        </p>
      </footer>

    </div>
  );
}
