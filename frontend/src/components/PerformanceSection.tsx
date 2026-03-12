'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { useInView } from 'framer-motion';
import type { Activity } from '@/lib/api';
import { isIndoor } from '@/lib/utils';
import FadeIn from './FadeIn';

// ═══════════════════════════════════════════════════════════════════════════
// ATHLETE CONFIG
// ═══════════════════════════════════════════════════════════════════════════
const ATHLETE_AGE = 30;            // used for estimated max HR formula (220 − age)
const FALLBACK_FTP: number | null = 220; // used only if Strava has no FTP set
// ═══════════════════════════════════════════════════════════════════════════

interface PerformanceSectionProps { activities: Activity[]; stravaFtp?: number | null }

// ─── HR zone model ─────────────────────────────────────────────────────────
const ZONES = [
  { key: 'Z5', name: 'VO₂Max',    lo: 0.90, hi: 2.00, color: '#f43f5e' },
  { key: 'Z4', name: 'Threshold', lo: 0.80, hi: 0.90, color: '#fb923c' },
  { key: 'Z3', name: 'Tempo',     lo: 0.70, hi: 0.80, color: '#a78bfa' },
  { key: 'Z2', name: 'Endurance', lo: 0.60, hi: 0.70, color: '#22d3ee' },
  { key: 'Z1', name: 'Recovery',  lo: 0.00, hi: 0.60, color: '#475569' },
];

// ─── Data derivation helpers ───────────────────────────────────────────────

type FTPResult = {
  ftp: number; bestNP: number; source: string;
  date: string | null; confidence: 'tested' | 'estimated' | 'low';
};

function deriveFTP(acts: Activity[], knownFtp?: number | null): FTPResult | null {
  const override = knownFtp ?? FALLBACK_FTP;
  if (override) {
    return { ftp: override, bestNP: override, source: knownFtp ? 'Strava athlete profile' : 'Manual', date: null, confidence: 'tested' };
  }
  const np = acts.filter(a => (a.weighted_average_watts ?? 0) > 50);
  if (!np.length) return null;

  const inMins = (a: Activity, lo: number, hi: number) => {
    const m = a.moving_time_s / 60; return m >= lo && m <= hi;
  };

  let pool = np.filter(a => inMins(a, 17, 26));
  let factor = 0.95, source = 'Best ~20-min effort', conf: FTPResult['confidence'] = 'estimated';

  if (!pool.length) {
    pool = np.filter(a => inMins(a, 40, 80));
    factor = 0.92; source = 'Best ~60-min effort';
  }
  if (!pool.length) {
    pool = np; factor = 0.85; source = 'Insufficient test data'; conf = 'low';
  }

  const best = pool.sort((a, b) => (b.weighted_average_watts ?? 0) - (a.weighted_average_watts ?? 0))[0];
  return {
    ftp: Math.round(best.weighted_average_watts! * factor),
    bestNP: Math.round(best.weighted_average_watts!),
    source, date: best.start_date, confidence: conf,
  };
}

type MonthRow = { month: string; np: number | null; w: number | null; hr: number | null; cad: number | null };

function monthlyData(acts: Activity[]): MonthRow[] {
  const M = new Map<string, { sNP:number;cNP:number; sW:number;cW:number; sHR:number;cHR:number; sCad:number;cCad:number }>();
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (const a of acts) {
    const d = new Date(a.start_date);
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if (!M.has(k)) M.set(k, {sNP:0,cNP:0,sW:0,cW:0,sHR:0,cHR:0,sCad:0,cCad:0});
    const r = M.get(k)!;
    if (a.weighted_average_watts) { r.sNP += a.weighted_average_watts; r.cNP++; }
    if (a.average_watts)          { r.sW  += a.average_watts;          r.cW++;  }
    if (a.average_heartrate)      { r.sHR += a.average_heartrate;      r.cHR++; }
    if (a.average_cadence)        { r.sCad += a.average_cadence;       r.cCad++; }
  }
  return Array.from(M.entries()).sort(([a],[b]) => a.localeCompare(b)).slice(-8).map(([k, r]) => ({
    month: MONTHS[parseInt(k.split('-')[1]) - 1],
    np:  r.cNP  ? Math.round(r.sNP/r.cNP)  : null,
    w:   r.cW   ? Math.round(r.sW/r.cW)    : null,
    hr:  r.cHR  ? Math.round(r.sHR/r.cHR)  : null,
    cad: r.cCad ? Math.round(r.sCad/r.cCad) : null,
  }));
}

type Effort = { label: string; watts: number };

function bestEfforts(acts: Activity[]): Effort[] {
  const withW  = acts.filter(a => (a.average_watts ?? 0) > 0);
  const withNP = acts.filter(a => (a.weighted_average_watts ?? 0) > 0);

  const bucket = (lo: number, hi: number, label: string) => {
    const pool = withW.filter(a => { const m = a.moving_time_s/60; return m >= lo && m <= hi; });
    if (!pool.length) return null;
    return { label, watts: Math.max(...pool.map(a => a.average_watts!)) };
  };

  const res: Effort[] = [
    bucket(17, 26, '~20 min'),
    bucket(40, 55, '~45 min'),
    bucket(55, 75, '~60 min'),
    withW.length  ? { label: 'Best avg',    watts: Math.max(...withW.map(a => a.average_watts!))  } : null,
    withNP.length ? { label: 'Best norm.',  watts: Math.max(...withNP.map(a => a.weighted_average_watts!)) } : null,
  ].filter((e): e is Effort => e !== null);

  return res.sort((a,b) => b.watts - a.watts).slice(0, 5);
}

// ─── Primitive components ──────────────────────────────────────────────────

function useCountUp(target: number, active: boolean, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active || target === 0) return;
    let raf: number;
    const t0 = performance.now();
    const run = (t: number) => {
      const p = Math.min((t - t0) / duration, 1);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return val;
}

function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const n = useCountUp(value, inView);
  return <span ref={ref}>{n.toLocaleString('en-GB')}{suffix}</span>;
}

function Sparkline({ values, color, w = 120, h = 28 }: { values: number[]; color: string; w?: number; h?: number }) {
  if (values.length < 2) return null;
  const vmin = Math.min(...values), vmax = Math.max(...values), vr = vmax - vmin || 1;
  const step = w / (values.length - 1);
  const pad = 3;
  const pts: [number, number][] = values.map((v, i) => [
    i * step,
    h - pad - ((v - vmin) / vr) * (h - pad * 2),
  ]);
  const d = pts.map((p, i) => {
    if (i === 0) return `M ${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    const pp = pts[i - 1]; const cx = (pp[0] + p[0]) / 2;
    return `C ${cx.toFixed(1)} ${pp[1].toFixed(1)} ${cx.toFixed(1)} ${p[1].toFixed(1)} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <circle cx={pts[pts.length - 1][0].toFixed(1)} cy={pts[pts.length - 1][1].toFixed(1)} r="2.5" fill={color} />
    </svg>
  );
}

function AnimBar({ pct, color, delay = 0, height = 'h-1' }: { pct: number; color: string; delay?: number; height?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className={`${height} bg-white/[0.05] rounded-full overflow-hidden`}>
      <div className="h-full rounded-full" style={{
        width: inView ? `${Math.min(pct, 100)}%` : '0%',
        background: color,
        transition: `width 1.1s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }} />
    </div>
  );
}

// Circular arc dial (3/4 circle)
function ArcDial({ value, max, color, size = 96 }: { value: number; max: number; color: string; size?: number }) {
  const ref = useRef<SVGCircleElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const R = size / 2 - 8, CX = size / 2, CY = size / 2;
  const circ = 2 * Math.PI * R;
  const arcFrac = 0.75;
  const arcLen = circ * arcFrac;
  const pct = Math.min(Math.max(value / max, 0), 1);
  const offset = arcLen * (1 - pct);
  const id = `arc-glow-${color.replace('#', '')}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <filter id={id}>
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9"
        strokeDasharray={`${arcLen} ${circ}`} strokeLinecap="round"
        transform={`rotate(135 ${CX} ${CY})`} />
      <circle ref={ref} cx={CX} cy={CY} r={R} fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={`${arcLen} ${circ}`}
        strokeDashoffset={inView ? offset : arcLen}
        strokeLinecap="round"
        transform={`rotate(135 ${CX} ${CY})`}
        style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.22,1,0.36,1) 0.25s' }}
        filter={`url(#${id})`}
      />
    </svg>
  );
}

// ─── FTP CARD ──────────────────────────────────────────────────────────────

function FTPCard({ ftpData, avgPower, npVals }: {
  ftpData: FTPResult | null;
  avgPower: number;
  npVals: number[];
}) {
  const confStyle = {
    tested:    'bg-emerald-400/10 border-emerald-400/25 text-emerald-400',
    estimated: 'bg-orange-400/10  border-orange-400/25  text-orange-400',
    low:       'bg-slate-400/10   border-slate-400/20   text-slate-500',
  };
  const confLabel = { tested: 'Tested', estimated: 'Estimated', low: 'Low data' };
  const ftp  = ftpData?.ftp ?? 0;
  const conf = ftpData?.confidence ?? 'low';
  const avgVsFTP = ftp > 0 && avgPower > 0 ? Math.round((avgPower / ftp) * 100) : 0;

  return (
    <div className="card flex flex-col p-5 gap-4" style={{ minHeight: 260 }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="stat-label">FTP / Threshold</p>
        {ftpData && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border tracking-wide ${confStyle[conf]}`}>
            {confLabel[conf]}
          </span>
        )}
      </div>

      {ftpData ? (
        <>
          {/* Hero number */}
          <div className="flex items-end gap-1.5 leading-none">
            <span className="font-bebas text-6xl text-white" style={{ textShadow: '0 0 40px rgba(251,146,60,0.25)' }}>
              <CountUp value={ftp} />
            </span>
            <span className="text-slate-500 text-lg mb-1.5">W</span>
          </div>

          {/* NP sparkline */}
          {npVals.length >= 2 && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-700 tracking-wider">NP TREND</span>
              <Sparkline values={npVals} color="#fb923c" w={100} h={24} />
            </div>
          )}

          {/* Source label */}
          <p className="text-[11px] text-slate-600 leading-relaxed -mt-1">
            {ftpData.source}{ftpData.date ? ` · ${new Date(ftpData.date).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}` : ''}
          </p>

          {/* Avg vs FTP */}
          {avgVsFTP > 0 && (
            <div className="mt-auto pt-3 border-t border-white/[0.05] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-600">Period avg {avgPower}W</span>
                <span className="text-[11px] font-medium" style={{ color: avgVsFTP >= 80 ? '#fb923c' : '#64748b' }}>
                  {avgVsFTP}% of FTP
                </span>
              </div>
              <AnimBar pct={avgVsFTP} color="#fb923c" />
            </div>
          )}

          {/* Best effort */}
          {ftpData.bestNP > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Best effort</span>
              <span className="font-bebas text-lg text-orange-400">{ftpData.bestNP}W</span>
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-4">
          <span className="text-3xl opacity-20">⚡</span>
          <p className="text-xs text-slate-600">No power data for FTP estimate</p>
        </div>
      )}
    </div>
  );
}

// ─── POWER PROFILE CARD ────────────────────────────────────────────────────

function PowerProfileCard({ efforts, avgPower, strongestRide, ftp }: {
  efforts: Effort[];
  avgPower: number;
  strongestRide: Activity | undefined;
  ftp: number | undefined;
}) {
  const maxW = efforts.length > 0 ? efforts[0].watts : 0;

  return (
    <div className="card flex flex-col p-5 gap-4" style={{ minHeight: 260 }}>
      <p className="stat-label">Power Profile</p>

      {efforts.length > 0 ? (
        <>
          {/* Effort ladder */}
          <div className="flex-1 space-y-2.5">
            {efforts.map((e, i) => (
              <div key={e.label} className="group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-slate-600">{e.label}</span>
                  <span className="font-bebas text-base leading-none text-orange-400">{e.watts}W</span>
                </div>
                <div className="h-[5px] bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full relative"
                    style={{
                      background: `linear-gradient(90deg, rgba(251,146,60,0.5), #fb923c)`,
                      boxShadow: '2px 0 8px rgba(251,146,60,0.4)',
                    }}
                  >
                    <AnimBar pct={(e.watts / maxW) * 100} color="transparent" delay={i * 80} height="h-full" />
                    {/* We use the outer div for the glow, AnimBar for the actual width */}
                  </div>
                </div>
                {/* Actual animated bar overlaid */}
                <div className="h-[5px] -mt-[5px] bg-white/[0.04] rounded-full overflow-hidden">
                  <AnimBar pct={(e.watts / maxW) * 100} color={`rgba(251,146,60,${0.85 - i * 0.1})`} delay={i * 80} height="h-full" />
                </div>
              </div>
            ))}
          </div>

          {/* Strongest ride */}
          {strongestRide && (
            <div className="mt-auto pt-3 border-t border-white/[0.05]">
              <p className="text-[10px] text-slate-700 tracking-wider mb-1">STRONGEST EFFORT</p>
              <p className="text-xs text-slate-300 truncate">{strongestRide.name}</p>
              {strongestRide.weighted_average_watts && ftp && (
                <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', color: '#fb923c' }}>
                  {Math.round((strongestRide.weighted_average_watts / ftp) * 100)}% of FTP
                </span>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-4">
          <span className="text-3xl opacity-20">📊</span>
          <p className="text-xs text-slate-600">No power data available</p>
        </div>
      )}
    </div>
  );
}

// ─── HEART RATE CARD ───────────────────────────────────────────────────────

type ZoneWithTime = (typeof ZONES)[number] & { secs: number; pct: number };

function HeartRateCard({ estimatedMax, achievedMax, avgHR, zones, hasHR }: {
  estimatedMax: number;
  achievedMax: number;
  avgHR: number;
  zones: ZoneWithTime[] | null;
  hasHR: boolean;
}) {
  const gap = estimatedMax - achievedMax;
  const pctOfMax = achievedMax > 0 ? Math.round((achievedMax / estimatedMax) * 100) : 0;
  const dominant = zones?.filter(z => z.secs > 0).sort((a,b) => b.secs - a.secs)[0];
  const maxZonePct = zones ? Math.max(...zones.map(z => z.pct), 0.01) : 0.01;

  return (
    <div className="card flex flex-col p-5 gap-4" style={{ minHeight: 260 }}>
      <p className="stat-label">Heart Rate</p>

      {hasHR && achievedMax > 0 ? (
        <>
          {/* Max HR comparison */}
          <div className="flex items-end gap-6">
            <div>
              <p className="text-[10px] text-slate-700 tracking-wider mb-1">ACHIEVED MAX</p>
              <div className="flex items-end gap-1 leading-none">
                <span className="font-bebas text-5xl text-rose-400" style={{ textShadow: '0 0 30px rgba(244,63,94,0.2)' }}>
                  <CountUp value={achievedMax} />
                </span>
                <span className="text-slate-600 text-sm mb-1">bpm</span>
              </div>
            </div>
            <div className="pb-1">
              <p className="text-[10px] text-slate-700 tracking-wider mb-1">EST. MAX</p>
              <p className="font-bebas text-2xl text-slate-500">{estimatedMax}</p>
              <p className="text-[9px] text-slate-700 -mt-0.5">age {ATHLETE_AGE}</p>
            </div>
          </div>

          {/* Achieved vs estimated bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-700">Achieved vs estimated</span>
              <span style={{ color: gap <= 5 ? '#f43f5e' : '#64748b' }}>
                {pctOfMax}%{gap > 0 ? ` · ${gap}bpm headroom` : ' · at limit'}
              </span>
            </div>
            <AnimBar pct={pctOfMax} color="#f43f5e" height="h-1.5" />
          </div>

          {/* Zone distribution */}
          {zones && (
            <div className="flex-1 space-y-1.5">
              {zones.map((z, i) => (
                <div key={z.key} className="flex items-center gap-2">
                  <span className="text-[10px] w-5 flex-shrink-0 font-medium" style={{ color: z.color }}>{z.key}</span>
                  <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <AnimBar pct={z.pct > 0 ? (z.pct / maxZonePct) * 100 : 0} color={z.color} delay={i * 60} height="h-full" />
                  </div>
                  <span className="text-[10px] text-slate-700 w-7 text-right">{Math.round(z.pct * 100)}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
            <div>
              <p className="text-[10px] text-slate-700 tracking-wider">PERIOD AVG</p>
              <p className="font-bebas text-xl text-slate-300">{avgHR} <span className="text-sm font-sans font-normal text-slate-600">bpm</span></p>
            </div>
            {dominant && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                style={{ color: dominant.color, borderColor: dominant.color + '40', background: dominant.color + '10' }}>
                {dominant.key} dominant
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-4">
          <span className="text-3xl opacity-20">❤️</span>
          <p className="text-xs text-slate-600">No heart rate data</p>
        </div>
      )}
    </div>
  );
}

// ─── CADENCE CARD ──────────────────────────────────────────────────────────

function CadenceCard({ avgCad, avgIndCad, avgOutCad, cadVals, hasCad }: {
  avgCad: number;
  avgIndCad: number | null;
  avgOutCad: number | null;
  cadVals: number[];
  hasCad: boolean;
}) {
  // Cadence "smoothness" score: coefficient of variation inverted
  // (lower variation = higher score)
  const cadConsistency = cadVals.length >= 3
    ? (() => {
        const mean = cadVals.reduce((s,v)=>s+v,0)/cadVals.length;
        const sd = Math.sqrt(cadVals.reduce((s,v)=>s+Math.pow(v-mean,2),0)/cadVals.length);
        return Math.max(0, Math.round(100 - (sd/mean)*200));
      })()
    : null;

  const typical = { min: 75, max: 105 }; // typical road cycling cadence range
  const cadPct  = avgCad > 0 ? Math.min(((avgCad - typical.min) / (typical.max - typical.min)) * 100, 100) : 0;

  return (
    <div className="card flex flex-col p-5 gap-4" style={{ minHeight: 260 }}>
      <p className="stat-label">Cadence</p>

      {hasCad && avgCad > 0 ? (
        <>
          {/* Dial + number */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <ArcDial value={avgCad} max={110} color="#22d3ee" size={96} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-bebas text-2xl text-white leading-none">
                  <CountUp value={avgCad} />
                </span>
                <span className="text-[9px] text-slate-600 tracking-wider">RPM</span>
              </div>
            </div>

            {/* Split stats */}
            <div className="flex-1 space-y-3">
              {avgIndCad !== null && (
                <div>
                  <p className="text-[10px] text-slate-700 tracking-wider mb-0.5">INDOOR</p>
                  <p className="font-bebas text-2xl text-cyan-400 leading-none">{avgIndCad} <span className="text-xs font-sans text-slate-600">rpm</span></p>
                </div>
              )}
              {avgOutCad !== null && (
                <div>
                  <p className="text-[10px] text-slate-700 tracking-wider mb-0.5">OUTDOOR</p>
                  <p className="font-bebas text-2xl text-orange-400 leading-none">{avgOutCad} <span className="text-xs font-sans text-slate-600">rpm</span></p>
                </div>
              )}
            </div>
          </div>

          {/* Cadence band context */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-700">Cadence band</span>
              <span className="text-slate-600">{typical.min}–{typical.max} rpm road range</span>
            </div>
            <AnimBar pct={cadPct} color="#22d3ee" height="h-1.5" />
          </div>

          {/* Monthly sparkline */}
          {cadVals.length >= 2 && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-700 tracking-wider">MONTHLY TREND</span>
              <Sparkline values={cadVals} color="#22d3ee" w={110} h={24} />
            </div>
          )}

          {/* Consistency */}
          {cadConsistency !== null && (
            <div className="mt-auto pt-3 border-t border-white/[0.05]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-slate-600">Monthly consistency</span>
                <span className="font-bebas text-base leading-none text-cyan-400">{cadConsistency}%</span>
              </div>
              <AnimBar pct={cadConsistency} color="#22d3ee" />
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-4">
          <span className="text-3xl opacity-20">🔄</span>
          <p className="text-xs text-slate-600">No cadence data available</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default function PerformanceSection({ activities, stravaFtp }: PerformanceSectionProps) {
  const hasPower = activities.some(a => a.average_watts || a.weighted_average_watts);
  const hasHR    = activities.some(a => a.average_heartrate);
  const hasCad   = activities.some(a => a.average_cadence);
  if (!hasPower && !hasHR && !hasCad) return null;

  const ftpData  = useMemo(() => deriveFTP(activities, stravaFtp), [activities, stravaFtp]);
  const monthly  = useMemo(() => monthlyData(activities), [activities]);
  const efforts  = useMemo(() => bestEfforts(activities), [activities]);

  // Period average power
  const pwActs   = activities.filter(a => a.average_watts);
  const avgPower = pwActs.length
    ? Math.round(pwActs.reduce((s,a) => s + a.average_watts!, 0) / pwActs.length)
    : 0;

  // Strongest ride by NP or avg watts
  const strongestRide = activities
    .filter(a => a.average_watts || a.weighted_average_watts)
    .sort((a,b) => ((b.weighted_average_watts||b.average_watts||0) - (a.weighted_average_watts||a.average_watts||0)))[0];

  // HR
  const hrActs     = activities.filter(a => a.average_heartrate);
  const maxHRActs  = activities.filter(a => a.max_heartrate);
  const estimatedMax = 220 - ATHLETE_AGE;
  const achievedMax  = maxHRActs.length ? Math.max(...maxHRActs.map(a => a.max_heartrate!)) : 0;
  const avgHR        = hrActs.length ? Math.round(hrActs.reduce((s,a)=>s+a.average_heartrate!,0)/hrActs.length) : 0;

  const hrZones: ZoneWithTime[] | null = hasHR && achievedMax > 0
    ? ZONES.map(z => {
        const secs = hrActs.reduce((s, a) => {
          const pct = a.average_heartrate! / achievedMax;
          return pct >= z.lo && pct < z.hi ? s + a.moving_time_s : s;
        }, 0);
        const total = hrActs.reduce((s,a)=>s+a.moving_time_s, 0) || 1;
        return { ...z, secs, pct: secs / total };
      })
    : null;

  // Cadence
  const cadActs   = activities.filter(a => (a.average_cadence ?? 0) > 0);
  const avgCad    = cadActs.length ? Math.round(cadActs.reduce((s,a)=>s+a.average_cadence!,0)/cadActs.length) : 0;
  const indCad    = cadActs.filter(a => isIndoor(a.trainer, a.sport_type));
  const outCad    = cadActs.filter(a => !isIndoor(a.trainer, a.sport_type));
  const avgIndCad = indCad.length  ? Math.round(indCad.reduce((s,a)=>s+a.average_cadence!,0)/indCad.length)  : null;
  const avgOutCad = outCad.length  ? Math.round(outCad.reduce((s,a)=>s+a.average_cadence!,0)/outCad.length) : null;
  const cadVals   = monthly.map(m => m.cad).filter((v): v is number => v !== null);
  const npVals    = monthly.map(m => m.np).filter((v):  v is number => v !== null);

  return (
    <FadeIn>
      <section className="max-w-7xl mx-auto px-6 pb-16">
        {/* Section header */}
        <div className="flex items-center gap-4 mb-6">
          <h2 className="font-display font-semibold text-white text-lg">Performance</h2>
          <span className="h-px flex-1 max-w-[60px]" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <span className="text-[10px] text-slate-700 tracking-[0.3em] uppercase">Year to date</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <FTPCard ftpData={ftpData} avgPower={avgPower} npVals={npVals} />
          <PowerProfileCard efforts={efforts} avgPower={avgPower} strongestRide={strongestRide} ftp={ftpData?.ftp} />
          <HeartRateCard estimatedMax={estimatedMax} achievedMax={achievedMax} avgHR={avgHR} zones={hrZones} hasHR={hasHR} />
          <CadenceCard avgCad={avgCad} avgIndCad={avgIndCad} avgOutCad={avgOutCad} cadVals={cadVals} hasCad={hasCad} />
        </div>
      </section>
    </FadeIn>
  );
}
