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
const PAD_L = 0;
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
  const toX = (i: number) => PAD_L + i * colW + colW / 2;

  // Points for total line
  const totalPts: [number, number][] = weeks.map((w, i) => [toX(i), toY(w.total)]);
  const outdoorPts: [number, number][] = weeks.map((w, i) => [toX(i), toY(w.outdoor)]);

  // Area path (closed)
  const totalArea = smooth(totalPts) + ` L ${toX(N - 1).toFixed(1)} ${CHART_H} L ${toX(0).toFixed(1)} ${CHART_H} Z`;
  const outdoorArea = smooth(outdoorPts) + ` L ${toX(N - 1).toFixed(1)} ${CHART_H} L ${toX(0).toFixed(1)} ${CHART_H} Z`;

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
          <span className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-orange-400/70" /> Outdoor
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-cyan-400/70" /> Indoor
          </span>
        </div>
      </div>

      <div className="relative select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 160 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setCursor(null)}
        >
          <defs>
            <linearGradient id="rc-total-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb923c" stopOpacity="0.22" />
              <stop offset="75%" stopColor="#fb923c" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="rc-outdoor-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb923c" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#fb923c" stopOpacity="0.08" />
            </linearGradient>
            <linearGradient id="rc-indoor-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.05" />
            </linearGradient>
            <filter id="rc-glow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <clipPath id="rc-reveal">
              <rect
                x="0" y="0" width={inView ? W : 0} height={H}
                style={{
                  transition: 'width 1.4s cubic-bezier(0.22, 1, 0.36, 1) 0.2s',
                }}
              />
            </clipPath>
          </defs>

          {/* Subtle grid */}
          {[0.5, 1].map((f) => (
            <line key={f} x1={0} y1={toY(maxVal * f)} x2={W} y2={toY(maxVal * f)}
              stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
          ))}
          <line x1={0} y1={CHART_H} x2={W} y2={CHART_H} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />

          <g clipPath="url(#rc-reveal)">
            {/* Filled areas */}
            <path d={totalArea} fill="url(#rc-total-fill)" />

            {/* Outdoor area (more saturated) */}
            <path d={outdoorArea} fill="url(#rc-outdoor-fill)" opacity="0.8" />

            {/* Total line — glowing */}
            <path d={smooth(totalPts)} fill="none" stroke="rgba(251,146,60,0.5)" strokeWidth={1.5}
              strokeLinecap="round" strokeLinejoin="round" />
            <path d={smooth(totalPts)} fill="none" stroke="#fb923c" strokeWidth={1.5}
              strokeLinecap="round" strokeLinejoin="round" filter="url(#rc-glow)" opacity="0.6" />

            {/* Data points */}
            {totalPts.map(([x, y], i) => weeks[i].total > 0 && (
              <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={cursor?.i === i ? 4 : 2.5}
                fill={cursor?.i === i ? '#fb923c' : 'rgba(251,146,60,0.5)'}
                style={{ transition: 'r 0.15s, fill 0.15s' }}
              />
            ))}
          </g>

          {/* Cursor — vertical scan line */}
          {cursor && (
            <g>
              <line
                x1={cursor.x} y1={0} x2={cursor.x} y2={CHART_H}
                stroke="rgba(255,255,255,0.1)" strokeWidth={1}
                strokeDasharray="3 3"
              />
              {weeks[cursor.i].outdoor > 0 && (
                <circle cx={cursor.x.toFixed(1)} cy={toY(weeks[cursor.i].outdoor).toFixed(1)} r={3}
                  fill="#fb923c" />
              )}
              {weeks[cursor.i].indoor > 0 && (
                <circle cx={cursor.x.toFixed(1)} cy={toY(weeks[cursor.i].indoor).toFixed(1)} r={3}
                  fill="#22d3ee" />
              )}
            </g>
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
              minWidth: 130,
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
