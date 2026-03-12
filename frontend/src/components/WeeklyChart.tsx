'use client';

import { useRef, useState, useCallback } from 'react';
import { useInView } from 'framer-motion';

interface WeeklyChartProps {
  data: Array<{
    week_start_date: string;
    totals_json: {
      total_distance_m: number;
      indoor_distance_m: number;
      outdoor_distance_m: number;
    };
  }>;
}

const W = 640;
const H = 140;
const PAD_B = 20;
const CHART_H = H - PAD_B;

function smooth(pts: [number, number][]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;
  const d = [`M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`];
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx = (prev[0] + curr[0]) / 2;
    d.push(`C ${cpx.toFixed(1)} ${prev[1].toFixed(1)} ${cpx.toFixed(1)} ${curr[1].toFixed(1)} ${curr[0].toFixed(1)} ${curr[1].toFixed(1)}`);
  }
  return d.join(' ');
}

function area(pts: [number, number][], firstX: number, lastX: number): string {
  return smooth(pts) + ` L ${lastX.toFixed(1)} ${CHART_H} L ${firstX.toFixed(1)} ${CHART_H} Z`;
}

export default function WeeklyChart({ data }: WeeklyChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [cursor, setCursor] = useState<{ x: number; i: number } | null>(null);

  const weeks = [...data].reverse().map((w) => ({
    label: new Date(w.week_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    total: w.totals_json.total_distance_m / 1000,
    outdoor: w.totals_json.outdoor_distance_m / 1000,
    indoor: w.totals_json.indoor_distance_m / 1000,
  }));

  const N = weeks.length;
  const maxVal = Math.max(...weeks.map((w) => w.total), 1);
  const colW = W / N;

  const toY = (v: number) => CHART_H - (v / maxVal) * CHART_H;
  const toX = (i: number) => i * colW + colW / 2;

  const totalPts: [number, number][] = weeks.map((w, i) => [toX(i), toY(w.total)]);
  const outdoorPts: [number, number][] = weeks.map((w, i) => [toX(i), toY(w.outdoor)]);
  const indoorPts: [number, number][] = weeks.map((w, i) => [toX(i), toY(w.indoor)]);

  const hasIndoor = weeks.some((w) => w.indoor > 0);
  const hasOutdoor = weeks.some((w) => w.outdoor > 0);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.max(0, Math.min(N - 1, Math.floor(x / colW)));
    setCursor({ x: toX(i), i });
  }, [N, colW]);

  const active = cursor !== null ? weeks[cursor.i] : null;

  return (
    <div ref={ref} className="card p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-display font-semibold text-white text-lg">Training Rhythm</h2>
          <p className="text-xs text-slate-600 mt-0.5">
            {active
              ? <span className="text-slate-400">{active.label} · <span className="text-white font-medium">{active.total.toFixed(1)} km</span></span>
              : `${N} weeks`
            }
          </p>
        </div>
        <div className="flex items-center gap-4">
          {hasOutdoor && (
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full bg-orange-400/70" /> Outdoor
            </span>
          )}
          {hasIndoor && (
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full bg-cyan-400/70" /> Indoor
            </span>
          )}
        </div>
      </div>

      <div className="relative select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          preserveAspectRatio="none"
          style={{ height: 160 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setCursor(null)}
        >
          <defs>
            <linearGradient id="rc-outdoor-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb923c" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#fb923c" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id="rc-indoor-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.04" />
            </linearGradient>
            <filter id="rc-glow-orange">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="rc-glow-cyan">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <clipPath id="rc-reveal">
              <rect
                x="0" y="0" width={inView ? W : 0} height={H}
                style={{ transition: 'width 1.4s cubic-bezier(0.22, 1, 0.36, 1) 0.2s' }}
              />
            </clipPath>
          </defs>

          {/* Grid */}
          {[0.5, 1].map((f) => (
            <line key={f} x1={0} y1={toY(maxVal * f)} x2={W} y2={toY(maxVal * f)}
              stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
          ))}
          <line x1={0} y1={CHART_H} x2={W} y2={CHART_H} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />

          <g clipPath="url(#rc-reveal)">
            {/* Outdoor area + line */}
            {hasOutdoor && (
              <>
                <path d={area(outdoorPts, toX(0), toX(N - 1))} fill="url(#rc-outdoor-fill)" />
                <path d={smooth(outdoorPts)} fill="none" stroke="rgba(251,146,60,0.45)" strokeWidth={1.5}
                  strokeLinecap="round" strokeLinejoin="round" />
                <path d={smooth(outdoorPts)} fill="none" stroke="#fb923c" strokeWidth={1.5}
                  strokeLinecap="round" strokeLinejoin="round"
                  filter="url(#rc-glow-orange)" opacity="0.65" />
              </>
            )}

            {/* Indoor area + line */}
            {hasIndoor && (
              <>
                <path d={area(indoorPts, toX(0), toX(N - 1))} fill="url(#rc-indoor-fill)" />
                <path d={smooth(indoorPts)} fill="none" stroke="rgba(34,211,238,0.45)" strokeWidth={1.5}
                  strokeLinecap="round" strokeLinejoin="round" />
                <path d={smooth(indoorPts)} fill="none" stroke="#22d3ee" strokeWidth={1.5}
                  strokeLinecap="round" strokeLinejoin="round"
                  filter="url(#rc-glow-cyan)" opacity="0.65" />
              </>
            )}

            {/* Outdoor data points */}
            {hasOutdoor && outdoorPts.map(([x, y], i) => weeks[i].outdoor > 0 && (
              <circle key={`o-${i}`} cx={x.toFixed(1)} cy={y.toFixed(1)}
                r={cursor?.i === i ? 4 : 2.5}
                fill={cursor?.i === i ? '#fb923c' : 'rgba(251,146,60,0.5)'}
                style={{ transition: 'r 0.15s, fill 0.15s' }}
              />
            ))}

            {/* Indoor data points */}
            {hasIndoor && indoorPts.map(([x, y], i) => weeks[i].indoor > 0 && (
              <circle key={`n-${i}`} cx={x.toFixed(1)} cy={y.toFixed(1)}
                r={cursor?.i === i ? 4 : 2.5}
                fill={cursor?.i === i ? '#22d3ee' : 'rgba(34,211,238,0.5)'}
                style={{ transition: 'r 0.15s, fill 0.15s' }}
              />
            ))}
          </g>

          {/* Cursor scan line */}
          {cursor && (
            <line
              x1={cursor.x} y1={0} x2={cursor.x} y2={CHART_H}
              stroke="rgba(255,255,255,0.1)" strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}

          {/* Week labels (every 4th) */}
          {weeks.map((w, i) => i % 4 === 0 && (
            <text key={i} x={toX(i).toFixed(1)} y={H - 3} textAnchor="middle"
              fontSize={8} fill={cursor?.i === i ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.18)'}
              fontFamily="var(--font-inter)"
            >
              {w.label}
            </text>
          ))}
        </svg>

        {/* Tooltip */}
        {cursor && active && active.total > 0 && (
          <div
            className="pointer-events-none absolute z-20 bg-night-900 border border-white/[0.1] rounded-xl px-3.5 py-3 shadow-2xl text-xs"
            style={{
              left: (cursor.x / W * 100) + '%',
              bottom: '100%',
              transform: 'translateX(-50%)',
              marginBottom: 8,
              minWidth: 140,
            }}
          >
            <p className="text-slate-500 mb-1.5 tracking-wider uppercase">{active.label}</p>
            <p className="font-bebas text-2xl text-white leading-none mb-2">{active.total.toFixed(1)} km</p>
            {active.outdoor > 0 && <p className="text-orange-400">↗ {active.outdoor.toFixed(1)} outdoor</p>}
            {active.indoor > 0 && <p className="text-cyan-400 mt-0.5">⚡ {active.indoor.toFixed(1)} indoor</p>}
          </div>
        )}
      </div>
    </div>
  );
}
