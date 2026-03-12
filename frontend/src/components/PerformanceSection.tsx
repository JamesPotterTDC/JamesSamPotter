'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { useInView, motion, AnimatePresence } from 'framer-motion';
import type { Activity } from '@/lib/api';
import { isIndoor } from '@/lib/utils';
import FadeIn from './FadeIn';

// ═══════════════════════════════════════════════════════════════════════════
// ATHLETE CONFIG
// ═══════════════════════════════════════════════════════════════════════════
const ATHLETE_AGE        = 30;
const ATHLETE_WEIGHT_KG  = 72;   // used for w/kg display
const FALLBACK_FTP: number | null = 220;
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

// ─── Data derivation ────────────────────────────────────────────────────────
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
  const inMins = (a: Activity, lo: number, hi: number) => { const m = a.moving_time_s / 60; return m >= lo && m <= hi; };
  let pool = np.filter(a => inMins(a, 17, 26));
  let factor = 0.95, source = 'Best ~20-min effort', conf: FTPResult['confidence'] = 'estimated';
  if (!pool.length) { pool = np.filter(a => inMins(a, 40, 80)); factor = 0.92; source = 'Best ~60-min effort'; }
  if (!pool.length) { pool = np; factor = 0.85; source = 'Insufficient test data'; conf = 'low'; }
  const best = pool.sort((a, b) => (b.weighted_average_watts ?? 0) - (a.weighted_average_watts ?? 0))[0];
  return { ftp: Math.round(best.weighted_average_watts! * factor), bestNP: Math.round(best.weighted_average_watts!), source, date: best.start_date, confidence: conf };
}

type MonthRow = { month: string; np: number | null; w: number | null; hr: number | null; cad: number | null };

function monthlyData(acts: Activity[]): MonthRow[] {
  const M = new Map<string, { sNP:number;cNP:number;sW:number;cW:number;sHR:number;cHR:number;sCad:number;cCad:number }>();
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (const a of acts) {
    const d = new Date(a.start_date); const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if (!M.has(k)) M.set(k, {sNP:0,cNP:0,sW:0,cW:0,sHR:0,cHR:0,sCad:0,cCad:0});
    const r = M.get(k)!;
    if (a.weighted_average_watts) { r.sNP += a.weighted_average_watts; r.cNP++; }
    if (a.average_watts) { r.sW += a.average_watts; r.cW++; }
    if (a.average_heartrate) { r.sHR += a.average_heartrate; r.cHR++; }
    if (a.average_cadence) { r.sCad += a.average_cadence; r.cCad++; }
  }
  return Array.from(M.entries()).sort(([a],[b]) => a.localeCompare(b)).slice(-8).map(([k, r]) => ({
    month: MONTHS[parseInt(k.split('-')[1]) - 1],
    np: r.cNP ? Math.round(r.sNP/r.cNP) : null,
    w: r.cW ? Math.round(r.sW/r.cW) : null,
    hr: r.cHR ? Math.round(r.sHR/r.cHR) : null,
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
    bucket(17, 26, '~20 min'), bucket(40, 55, '~45 min'), bucket(55, 75, '~60 min'),
    withW.length  ? { label: 'Best avg',   watts: Math.max(...withW.map(a => a.average_watts!)) } : null,
    withNP.length ? { label: 'Best norm.', watts: Math.max(...withNP.map(a => a.weighted_average_watts!)) } : null,
  ].filter((e): e is Effort => e !== null);
  return res.sort((a,b) => b.watts - a.watts).slice(0, 5);
}

// ─── Primitives ─────────────────────────────────────────────────────────────

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

// ─── Gradient sparkline ─────────────────────────────────────────────────────
function SparklineGradient({ values, color, w = 120, h = 36, uid }: {
  values: number[]; color: string; w?: number; h?: number; uid: string;
}) {
  if (values.length < 2) return null;
  const vmin = Math.min(...values), vmax = Math.max(...values), vr = vmax - vmin || 1;
  const step = w / (values.length - 1);
  const pad = 4;
  const pts: [number, number][] = values.map((v, i) => [i * step, h - pad - ((v - vmin) / vr) * (h - pad * 2 - 4)]);
  const linePath = pts.map((p, i) => {
    if (i === 0) return `M ${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    const pp = pts[i-1]; const cx = (pp[0]+p[0])/2;
    return `C ${cx.toFixed(1)} ${pp[1].toFixed(1)} ${cx.toFixed(1)} ${p[1].toFixed(1)} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  }).join(' ');
  const last = pts[pts.length-1];
  const areaPath = linePath + ` L ${last[0].toFixed(1)} ${h} L 0 ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} overflow="visible">
      <defs>
        <linearGradient id={`sg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sg-${uid})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  );
}

// ─── Arc dial with tick marks ────────────────────────────────────────────────
function ArcDial({ value, max, color, size = 110 }: { value: number; max: number; color: string; size?: number }) {
  const ref = useRef<SVGCircleElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const R = size / 2 - 12, CX = size / 2, CY = size / 2;
  const circ = 2 * Math.PI * R;
  const arcFrac = 0.75;
  const arcLen = circ * arcFrac;
  const pct = Math.min(Math.max(value / max, 0), 1);
  const offset = arcLen * (1 - pct);
  const uid = `arc-${size}-${color.replace('#', '')}`;

  // 16 tick marks around the 270° arc
  const TICKS = 16;
  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const angleDeg = 135 + (i / (TICKS - 1)) * 270;
    const angle = (angleDeg * Math.PI) / 180;
    const isMajor = i % 4 === 0;
    const outerR = R + (isMajor ? 7 : 5);
    const innerR = R + 2;
    return { x1: CX + innerR * Math.cos(angle), y1: CY + innerR * Math.sin(angle), x2: CX + outerR * Math.cos(angle), y2: CY + outerR * Math.sin(angle), isMajor };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <filter id={uid}>
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Track */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.05)"
        strokeWidth="7" strokeDasharray={`${arcLen.toFixed(2)} ${circ.toFixed(2)}`}
        strokeLinecap="round" transform={`rotate(135 ${CX} ${CY})`} />
      {/* Fill */}
      <circle ref={ref} cx={CX} cy={CY} r={R} fill="none" stroke={color}
        strokeWidth="7" strokeDasharray={`${arcLen.toFixed(2)} ${circ.toFixed(2)}`}
        strokeDashoffset={inView ? offset.toFixed(2) : arcLen.toFixed(2)}
        strokeLinecap="round" transform={`rotate(135 ${CX} ${CY})`}
        filter={`url(#${uid})`}
        style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.22,1,0.36,1) 0.2s' }}
      />
      {/* Tick marks */}
      {ticks.map((t, i) => (
        <line key={i}
          x1={t.x1.toFixed(2)} y1={t.y1.toFixed(2)}
          x2={t.x2.toFixed(2)} y2={t.y2.toFixed(2)}
          stroke={t.isMajor ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}
          strokeWidth={t.isMajor ? '1.2' : '0.8'}
        />
      ))}
    </svg>
  );
}

// ─── REACTOR RINGS (HR zone visualiser) ─────────────────────────────────────
type ZoneWithTime = (typeof ZONES)[number] & { secs: number; pct: number };

function ReactorRings({ zones, achievedMax, estimatedMax }: {
  zones: ZoneWithTime[]; achievedMax: number; estimatedMax: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const inView = useInView(svgRef as React.RefObject<Element>, { once: true });

  const SIZE = 176; const CX = 88; const CY = 88;
  // zones[0]=Z5 (innermost), zones[4]=Z1 (outermost)
  const ringDefs = [
    { R: 22, sw: 6 },
    { R: 33, sw: 6 },
    { R: 44, sw: 5 },
    { R: 55, sw: 5 },
    { R: 66, sw: 4 },
  ];

  return (
    <svg ref={svgRef} width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <defs>
        {zones.map((z) => (
          <filter key={z.key} id={`rr-${z.key}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        ))}
      </defs>

      {/* Outer marker ring (estimated max boundary) */}
      <circle cx={CX} cy={CY} r={74} fill="none"
        stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="2 5" />

      {/* Zone rings */}
      {zones.map((zone, i) => {
        const { R, sw } = ringDefs[i];
        const circ = 2 * Math.PI * R;
        const arcLen = circ * 0.75;
        const filled = arcLen * zone.pct;
        const dashOffset = inView ? (arcLen - filled).toFixed(2) : arcLen.toFixed(2);
        return (
          <g key={zone.key} transform={`rotate(135 ${CX} ${CY})`}>
            <circle cx={CX} cy={CY} r={R} fill="none"
              stroke="rgba(255,255,255,0.05)" strokeWidth={sw}
              strokeDasharray={`${arcLen.toFixed(2)} ${circ.toFixed(2)}`}
              strokeLinecap="round" />
            <circle cx={CX} cy={CY} r={R} fill="none"
              stroke={zone.color} strokeWidth={sw}
              strokeDasharray={`${arcLen.toFixed(2)} ${circ.toFixed(2)}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              filter={`url(#rr-${zone.key})`}
              style={{
                transition: `stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1) ${i * 0.1}s`,
                opacity: zone.pct > 0.02 ? 0.9 : 0.12,
              }}
            />
          </g>
        );
      })}

      {/* Center: peak HR */}
      <text x={CX} y={CY - 7} textAnchor="middle"
        style={{ fontFamily: 'var(--font-bebas)', fontSize: '30px', fill: 'white' }}>
        {achievedMax}
      </text>
      <text x={CX} y={CY + 8} textAnchor="middle"
        style={{ fontFamily: 'var(--font-inter)', fontSize: '8px', fill: '#64748b', letterSpacing: '1.5px' }}>
        BPM PEAK
      </text>
      <text x={CX} y={CY + 20} textAnchor="middle"
        style={{ fontFamily: 'var(--font-inter)', fontSize: '7.5px', fill: '#334155' }}>
        est. max {estimatedMax}
      </text>
    </svg>
  );
}

// ─── NEON EQUALISER (Power profile) ─────────────────────────────────────────
const EFFORT_COLORS = ['#f43f5e', '#fb923c', '#f59e0b', '#a78bfa', '#22d3ee'];

function NeonEqualiser({ efforts, ftp }: { efforts: Effort[]; ftp: number | undefined }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const [hovered, setHovered] = useState<number | null>(null);

  if (!efforts.length) return null;

  const SVG_W = 200;
  const MAX_H = 72;
  const BAR_W = Math.floor((SVG_W - 20) / efforts.length - 8);
  const GAP   = (SVG_W - efforts.length * BAR_W) / (efforts.length + 1);
  const maxWatts = efforts[0].watts;
  const SVG_H = MAX_H + 38;
  const ftpY  = ftp && ftp < maxWatts ? MAX_H - (ftp / maxWatts) * MAX_H : null;

  return (
    <div className="relative w-full">
      <svg ref={ref} width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          {efforts.map((_, i) => {
            const c = EFFORT_COLORS[i % EFFORT_COLORS.length];
            return (
              <linearGradient key={i} id={`eq-g${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity="1" />
                <stop offset="100%" stopColor={c} stopOpacity="0.25" />
              </linearGradient>
            );
          })}
          {efforts.map((_, i) => {
            const c = EFFORT_COLORS[i % EFFORT_COLORS.length];
            return (
              <filter key={i} id={`eq-f${i}`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3.5" result="b" />
                <feFlood floodColor={c} floodOpacity="0.4" result="flood" />
                <feComposite in="flood" in2="b" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            );
          })}
        </defs>

        {/* FTP threshold line */}
        {ftpY !== null && (
          <g>
            <line x1="0" y1={ftpY} x2={SVG_W} y2={ftpY}
              stroke="rgba(251,146,60,0.3)" strokeWidth="0.8" strokeDasharray="3 5" />
            <text x={SVG_W - 2} y={ftpY - 3} textAnchor="end"
              style={{ fontFamily: 'var(--font-inter)', fontSize: '7px', fill: 'rgba(251,146,60,0.55)' }}>
              FTP
            </text>
          </g>
        )}

        {/* Bars */}
        {efforts.map((effort, i) => {
          const c = EFFORT_COLORS[i % EFFORT_COLORS.length];
          const barH = (effort.watts / maxWatts) * MAX_H;
          const x = GAP + i * (BAR_W + GAP);
          const isH = hovered === i;

          return (
            <g key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'crosshair' }}>
              {/* Hover bg glow */}
              {isH && (
                <rect x={x - 4} y={0} width={BAR_W + 8} height={MAX_H}
                  rx="4" fill={c} opacity="0.04" />
              )}
              {/* Bar */}
              <motion.rect
                x={x} width={BAR_W} rx="3" ry="3"
                fill={`url(#eq-g${i})`}
                filter={isH ? `url(#eq-f${i})` : undefined}
                initial={{ y: MAX_H, height: 0, opacity: 0 }}
                animate={inView ? { y: MAX_H - barH, height: barH, opacity: isH ? 1 : 0.85 } : {}}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: i * 0.09 }}
              />
              {/* Top cap glow */}
              <motion.rect
                x={x} width={BAR_W} height="2.5" rx="1.5"
                fill={c}
                initial={{ y: MAX_H, opacity: 0 }}
                animate={inView ? { y: MAX_H - barH, opacity: isH ? 1 : 0.5 } : {}}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: i * 0.09 }}
              />
              {/* Watts label above */}
              <motion.text
                x={x + BAR_W / 2} textAnchor="middle"
                style={{ fontFamily: 'var(--font-bebas)', fontSize: '11px', fill: c }}
                initial={{ y: MAX_H - 6, opacity: 0 }}
                animate={inView ? { y: MAX_H - barH - 5, opacity: 1 } : {}}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: i * 0.09 + 0.1 }}
              >
                {effort.watts}
              </motion.text>
              {/* Duration label below */}
              <text x={x + BAR_W / 2} y={MAX_H + 13} textAnchor="middle"
                style={{
                  fontFamily: 'var(--font-inter)', fontSize: '8px',
                  fill: isH ? c : '#475569', transition: 'fill 0.2s',
                }}>
                {effort.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hovered !== null && efforts[hovered] && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-1 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{ whiteSpace: 'nowrap' }}
          >
            <div className="px-3 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-2"
              style={{ background: 'rgba(7,9,15,0.96)', border: `1px solid ${EFFORT_COLORS[hovered % EFFORT_COLORS.length]}35` }}>
              <span style={{ color: EFFORT_COLORS[hovered % EFFORT_COLORS.length] }}>
                {efforts[hovered].watts}W
              </span>
              {ftp && (
                <span className="text-slate-500">
                  {Math.round((efforts[hovered].watts / ftp) * 100)}% FTP
                </span>
              )}
              <span className="text-slate-700">{efforts[hovered].label}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── FTP CARD ────────────────────────────────────────────────────────────────

function FTPCard({ ftpData, avgPower, npVals, ftp }: {
  ftpData: FTPResult | null; avgPower: number; npVals: number[]; ftp: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  const confStyle = {
    tested:    'bg-emerald-400/10 border-emerald-400/25 text-emerald-400',
    estimated: 'bg-orange-400/10  border-orange-400/25  text-orange-400',
    low:       'bg-slate-700/20   border-slate-700/30   text-slate-600',
  };
  const confLabel = { tested: 'Tested', estimated: 'Estimated', low: 'Low data' };
  const conf = ftpData?.confidence ?? 'low';
  const avgVsFTP = ftp > 0 && avgPower > 0 ? Math.round((avgPower / ftp) * 100) : 0;
  const wkg = ftp > 0 ? (ftp / ATHLETE_WEIGHT_KG).toFixed(2) : null;

  // Background arc: shows FTP as % of 450W (broad road cyclist power ceiling)
  const ARC_SIZE = 180;
  const ARC_R = 78;
  const ARC_CX = ARC_SIZE / 2;
  const ARC_CY = ARC_SIZE / 2;
  const arcCirc = 2 * Math.PI * ARC_R;
  const arcLen  = arcCirc * 0.75;
  const arcPct  = ftp > 0 ? Math.min(ftp / 450, 1) : 0;
  const arcOffset = inView ? arcLen * (1 - arcPct) : arcLen;

  return (
    <motion.div
      ref={ref}
      className="card flex flex-col p-5 gap-4 relative overflow-hidden"
      style={{ minHeight: 280 }}
      whileHover={{ borderColor: 'rgba(251,146,60,0.2)' } as any}
      transition={{ duration: 0.2 }}
    >
      {/* Background decorative arc */}
      <svg
        width={ARC_SIZE} height={ARC_SIZE}
        viewBox={`0 0 ${ARC_SIZE} ${ARC_SIZE}`}
        className="absolute -top-4 -right-10 pointer-events-none"
        aria-hidden
      >
        <circle cx={ARC_CX} cy={ARC_CY} r={ARC_R} fill="none"
          stroke="rgba(251,146,60,0.04)" strokeWidth="14"
          strokeDasharray={`${arcLen.toFixed(2)} ${arcCirc.toFixed(2)}`}
          strokeLinecap="round" transform={`rotate(135 ${ARC_CX} ${ARC_CY})`} />
        <circle cx={ARC_CX} cy={ARC_CY} r={ARC_R} fill="none"
          stroke="rgba(251,146,60,0.12)" strokeWidth="14"
          strokeDasharray={`${arcLen.toFixed(2)} ${arcCirc.toFixed(2)}`}
          strokeDashoffset={arcOffset.toFixed(2)}
          strokeLinecap="round" transform={`rotate(135 ${ARC_CX} ${ARC_CY})`}
          style={{ transition: 'stroke-dashoffset 2s cubic-bezier(0.22,1,0.36,1) 0.3s', filter: 'blur(1px)' }}
        />
      </svg>

      {/* Header */}
      <div className="relative flex items-center justify-between">
        <p className="stat-label">FTP / Threshold</p>
        {ftpData && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border tracking-wide ${confStyle[conf]}`}
            style={conf === 'tested' ? { boxShadow: '0 0 8px rgba(52,211,153,0.15)' } : {}}>
            {confLabel[conf]}
          </span>
        )}
      </div>

      {ftpData ? (
        <>
          {/* Hero number */}
          <div className="relative flex items-end gap-2 leading-none">
            <span className="font-bebas text-[72px] text-white leading-none"
              style={{ textShadow: '0 0 60px rgba(251,146,60,0.35), 0 0 20px rgba(251,146,60,0.15)' }}>
              <CountUp value={ftp} />
            </span>
            <div className="flex flex-col mb-2 gap-1">
              <span className="text-slate-500 text-lg leading-none">W</span>
              {wkg && (
                <span className="font-bebas text-sm leading-none"
                  style={{ color: 'rgba(251,146,60,0.6)' }}>
                  {wkg}w/kg
                </span>
              )}
            </div>
          </div>

          {/* NP trend sparkline */}
          {npVals.length >= 2 && (
            <div className="flex items-center justify-between -mt-1">
              <span className="text-[10px] text-slate-700 tracking-wider">NP TREND</span>
              <SparklineGradient values={npVals} color="#fb923c" w={100} h={28} uid="ftp-np" />
            </div>
          )}

          {/* Source */}
          <p className="text-[11px] text-slate-600 leading-relaxed -mt-1">
            {ftpData.source}
            {ftpData.date ? ` · ${new Date(ftpData.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
          </p>

          {/* Avg vs FTP */}
          {avgVsFTP > 0 && (
            <div className="mt-auto pt-3 border-t border-white/[0.05] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-600">Period avg {avgPower}W</span>
                <span className="text-[11px] font-medium"
                  style={{ color: avgVsFTP >= 80 ? '#fb923c' : '#64748b' }}>
                  {avgVsFTP}% of FTP
                </span>
              </div>
              <AnimBar pct={avgVsFTP} color="linear-gradient(90deg,rgba(251,146,60,0.5),#fb923c)" />
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-4">
          <div className="w-12 h-12 rounded-full border border-white/[0.06] flex items-center justify-center">
            <span className="text-xl opacity-20">⚡</span>
          </div>
          <p className="text-xs text-slate-600">No power data for FTP estimate</p>
        </div>
      )}
    </motion.div>
  );
}

// ─── POWER PROFILE CARD ──────────────────────────────────────────────────────

function PowerProfileCard({ efforts, strongestRide, ftp }: {
  efforts: Effort[]; strongestRide: Activity | undefined; ftp: number | undefined;
}) {
  return (
    <motion.div
      className="card flex flex-col p-5 gap-4"
      style={{ minHeight: 280 }}
      whileHover={{ borderColor: 'rgba(244,63,94,0.15)' } as any}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <p className="stat-label">Power Profile</p>
        <span className="text-[10px] text-slate-700 tracking-wider">BEST EFFORTS</span>
      </div>

      {efforts.length > 0 ? (
        <>
          <div className="flex-1 flex items-end">
            <NeonEqualiser efforts={efforts} ftp={ftp} />
          </div>

          {strongestRide && (
            <div className="pt-3 border-t border-white/[0.05]">
              <p className="text-[10px] text-slate-700 tracking-wider mb-1">STRONGEST EFFORT</p>
              <p className="text-xs text-slate-300 truncate">{strongestRide.name}</p>
              {strongestRide.weighted_average_watts && ftp && (
                <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e' }}>
                  {Math.round((strongestRide.weighted_average_watts / ftp) * 100)}% of FTP
                </span>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-4">
          <div className="w-12 h-12 rounded-full border border-white/[0.06] flex items-center justify-center">
            <span className="text-xl opacity-20">📊</span>
          </div>
          <p className="text-xs text-slate-600">No power data available</p>
        </div>
      )}
    </motion.div>
  );
}

// ─── HEART RATE CARD ─────────────────────────────────────────────────────────

function HeartRateCard({ estimatedMax, achievedMax, avgHR, zones, hasHR }: {
  estimatedMax: number; achievedMax: number; avgHR: number;
  zones: ZoneWithTime[] | null; hasHR: boolean;
}) {
  const gap = estimatedMax - achievedMax;
  const dominant = zones?.filter(z => z.secs > 0).sort((a,b) => b.secs - a.secs)[0];

  const summaryLine = (() => {
    if (!dominant) return null;
    if (dominant.key === 'Z2') return 'Endurance-heavy this block';
    if (dominant.key === 'Z3') return 'Tempo work increasing';
    if (dominant.key === 'Z4') return 'Threshold focus this period';
    if (dominant.key === 'Z5') return 'VO₂Max work dominating';
    return 'Recovery-focused riding';
  })();

  return (
    <motion.div
      className="card flex flex-col p-5 gap-3"
      style={{ minHeight: 280 }}
      whileHover={{ borderColor: 'rgba(244,63,94,0.15)' } as any}
      transition={{ duration: 0.2 }}
    >
      <p className="stat-label">Heart Rate</p>

      {hasHR && achievedMax > 0 && zones ? (
        <>
          {/* Reactor rings + zone legend side by side */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <ReactorRings zones={zones} achievedMax={achievedMax} estimatedMax={estimatedMax} />
            </div>

            {/* Zone legend */}
            <div className="flex-1 space-y-1.5 min-w-0">
              {[...zones].reverse().map((z) => (
                <div key={z.key} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: z.color }} />
                  <span className="text-[9px] text-slate-600 flex-shrink-0 w-14 truncate">{z.name}</span>
                  <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <AnimBar pct={z.pct * 100} color={z.color} delay={0} height="h-full" />
                  </div>
                  <span className="text-[9px] text-slate-700 w-6 text-right flex-shrink-0">
                    {Math.round(z.pct * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer: avg HR + summary + headroom */}
          <div className="pt-2 border-t border-white/[0.05] space-y-2 mt-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-700 tracking-wider">PERIOD AVG</p>
                <p className="font-bebas text-xl text-slate-300 leading-none">
                  {avgHR} <span className="text-xs font-sans font-normal text-slate-600">bpm</span>
                </p>
              </div>
              {gap > 0 && (
                <div className="text-right">
                  <p className="text-[10px] text-slate-700 tracking-wider">HEADROOM</p>
                  <p className="font-bebas text-xl text-slate-500 leading-none">
                    {gap} <span className="text-xs font-sans font-normal text-slate-700">bpm</span>
                  </p>
                </div>
              )}
            </div>
            {summaryLine && (
              <p className="text-[10px] text-slate-600 italic">{summaryLine}</p>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-4">
          <div className="w-12 h-12 rounded-full border border-white/[0.06] flex items-center justify-center">
            <span className="text-xl opacity-20">❤️</span>
          </div>
          <p className="text-xs text-slate-600">No heart rate data</p>
        </div>
      )}
    </motion.div>
  );
}

// ─── CADENCE CARD ─────────────────────────────────────────────────────────────

function CadenceCard({ avgCad, avgIndCad, avgOutCad, cadVals, hasCad }: {
  avgCad: number; avgIndCad: number | null; avgOutCad: number | null;
  cadVals: number[]; hasCad: boolean;
}) {
  const cadConsistency = cadVals.length >= 3
    ? (() => {
        const mean = cadVals.reduce((s,v)=>s+v,0)/cadVals.length;
        const sd = Math.sqrt(cadVals.reduce((s,v)=>s+Math.pow(v-mean,2),0)/cadVals.length);
        return Math.max(0, Math.round(100 - (sd/mean)*200));
      })()
    : null;

  const typical = { min: 75, max: 105 };
  const cadPct  = avgCad > 0 ? Math.min(((avgCad - typical.min) / (typical.max - typical.min)) * 100, 100) : 0;

  return (
    <motion.div
      className="card flex flex-col p-5 gap-4"
      style={{ minHeight: 280 }}
      whileHover={{ borderColor: 'rgba(34,211,238,0.15)' } as any}
      transition={{ duration: 0.2 }}
    >
      <p className="stat-label">Cadence</p>

      {hasCad && avgCad > 0 ? (
        <>
          {/* Dial + number */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <ArcDial value={avgCad} max={110} color="#22d3ee" size={110} />
              {/* Pulsing ring behind dial */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: '1px solid rgba(34,211,238,0.12)' }}
                animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.1, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-bebas text-2xl text-white leading-none">
                  <CountUp value={avgCad} />
                </span>
                <span className="text-[9px] text-slate-600 tracking-wider">RPM</span>
              </div>
            </div>

            {/* Indoor / outdoor split */}
            <div className="flex-1 space-y-3">
              {avgIndCad !== null && (
                <div>
                  <p className="text-[10px] text-slate-700 tracking-wider mb-0.5">INDOOR</p>
                  <p className="font-bebas text-2xl text-cyan-400 leading-none">
                    {avgIndCad} <span className="text-xs font-sans text-slate-600">rpm</span>
                  </p>
                </div>
              )}
              {avgOutCad !== null && (
                <div>
                  <p className="text-[10px] text-slate-700 tracking-wider mb-0.5">OUTDOOR</p>
                  <p className="font-bebas text-2xl text-orange-400 leading-none">
                    {avgOutCad} <span className="text-xs font-sans text-slate-600">rpm</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Road range band */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-700">Road cadence band</span>
              <span className="text-slate-600">{typical.min}–{typical.max} rpm</span>
            </div>
            <AnimBar pct={cadPct} color="linear-gradient(90deg,rgba(34,211,238,0.4),#22d3ee)" height="h-1.5" />
          </div>

          {/* Monthly sparkline */}
          {cadVals.length >= 2 && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-700 tracking-wider">MONTHLY TREND</span>
              <SparklineGradient values={cadVals} color="#22d3ee" w={100} h={26} uid="cad" />
            </div>
          )}

          {/* Consistency score — shown as dot matrix */}
          {cadConsistency !== null && (
            <div className="mt-auto pt-3 border-t border-white/[0.05]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-slate-600">Monthly consistency</span>
                <span className="font-bebas text-base leading-none text-cyan-400">{cadConsistency}%</span>
              </div>
              {/* 10 dot indicator */}
              <div className="flex items-center gap-1">
                {Array.from({ length: 10 }, (_, i) => {
                  const filled = i < Math.round(cadConsistency / 10);
                  return (
                    <div key={i} className="flex-1 h-1 rounded-full"
                      style={{ background: filled ? '#22d3ee' : 'rgba(255,255,255,0.05)',
                               boxShadow: filled ? '0 0 4px rgba(34,211,238,0.4)' : 'none',
                               transition: `background 0.3s ease ${i * 0.06}s` }} />
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-4">
          <div className="w-12 h-12 rounded-full border border-white/[0.06] flex items-center justify-center">
            <span className="text-xl opacity-20">🔄</span>
          </div>
          <p className="text-xs text-slate-600">No cadence data available</p>
        </div>
      )}
    </motion.div>
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
  const ftp      = ftpData?.ftp ?? 0;

  const pwActs   = activities.filter(a => a.average_watts);
  const avgPower = pwActs.length
    ? Math.round(pwActs.reduce((s,a) => s + a.average_watts!, 0) / pwActs.length)
    : 0;

  const strongestRide = activities
    .filter(a => a.average_watts || a.weighted_average_watts)
    .sort((a,b) => ((b.weighted_average_watts||b.average_watts||0) - (a.weighted_average_watts||a.average_watts||0)))[0];

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

  const cadActs   = activities.filter(a => (a.average_cadence ?? 0) > 0);
  const avgCad    = cadActs.length ? Math.round(cadActs.reduce((s,a)=>s+a.average_cadence!,0)/cadActs.length) : 0;
  const indCad    = cadActs.filter(a => isIndoor(a.trainer, a.sport_type));
  const outCad    = cadActs.filter(a => !isIndoor(a.trainer, a.sport_type));
  const avgIndCad = indCad.length  ? Math.round(indCad.reduce((s,a)=>s+a.average_cadence!,0)/indCad.length)  : null;
  const avgOutCad = outCad.length  ? Math.round(outCad.reduce((s,a)=>s+a.average_cadence!,0)/outCad.length) : null;
  const cadVals   = monthly.map(m => m.cad).filter((v): v is number => v !== null);
  const npVals    = monthly.map(m => m.np).filter((v): v is number  => v !== null);

  return (
    <FadeIn>
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="flex items-center gap-4 mb-6">
          <h2 className="font-display font-semibold text-white text-lg">Performance</h2>
          <span className="h-px flex-1 max-w-[60px]" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <span className="text-[10px] text-slate-700 tracking-[0.3em] uppercase">Year to date</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <FTPCard ftpData={ftpData} avgPower={avgPower} npVals={npVals} ftp={ftp} />
          <PowerProfileCard efforts={efforts} strongestRide={strongestRide} ftp={ftpData?.ftp} />
          <HeartRateCard estimatedMax={estimatedMax} achievedMax={achievedMax} avgHR={avgHR} zones={hrZones} hasHR={hasHR} />
          <CadenceCard avgCad={avgCad} avgIndCad={avgIndCad} avgOutCad={avgOutCad} cadVals={cadVals} hasCad={hasCad} />
        </div>
      </section>
    </FadeIn>
  );
}
