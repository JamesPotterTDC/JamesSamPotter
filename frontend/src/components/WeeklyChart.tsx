'use client';

import { useRef, useState } from 'react';
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

const H = 160;
const W = 640;
const PAD_B = 24;
const CHART_H = H - PAD_B;

export default function WeeklyChart({ data }: WeeklyChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [hovered, setHovered] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const chartData = [...data]
    .reverse()
    .map(week => ({
      label: new Date(week.week_start_date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      outdoor: week.totals_json.outdoor_distance_m / 1000,
      indoor: week.totals_json.indoor_distance_m / 1000,
      total: week.totals_json.total_distance_m / 1000,
    }));

  const N = chartData.length;
  const maxVal = Math.max(...chartData.map(d => d.total), 1);
  const colW = W / N;
  const barW = colW * 0.55;
  const barOffset = (colW - barW) / 2;

  const toH = (val: number) => (val / maxVal) * CHART_H;
  const toX = (i: number) => i * colW + barOffset;

  // Y grid values
  const gridVals = [Math.round(maxVal * 0.5), Math.round(maxVal)];

  const hoverData = hovered !== null ? chartData[hovered] : null;

  return (
    <div ref={ref} className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-semibold text-white text-lg">Weekly Distance</h2>
          <p className="text-xs text-slate-600 mt-0.5">Last {N} weeks</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-2.5 h-2.5 rounded-sm inline-block bg-orange-400/80" /> Outdoor
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-2.5 h-2.5 rounded-sm inline-block bg-cyan-400/80" /> Indoor
          </span>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full select-none"
          style={{ height: 180 }}
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            <linearGradient id="wc-outdoor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb923c" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#9a3412" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="wc-indoor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#155e75" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="wc-outdoor-hover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fdba74" stopOpacity="1" />
              <stop offset="100%" stopColor="#c2410c" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="wc-indoor-hover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.7" />
            </linearGradient>
          </defs>

          {/* Subtle grid lines */}
          {gridVals.map(v => {
            const y = CHART_H - toH(v);
            return (
              <g key={v}>
                <line x1={0} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                <text x={2} y={y - 3} fontSize={8} fill="rgba(255,255,255,0.2)" fontFamily="var(--font-inter)">
                  {v}km
                </text>
              </g>
            );
          })}

          {/* Baseline */}
          <line x1={0} y1={CHART_H} x2={W} y2={CHART_H} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

          {/* Bars */}
          {chartData.map((week, i) => {
            const x = toX(i);
            const isHovered = hovered === i;
            const outdoorH = toH(week.outdoor);
            const indoorH = toH(week.indoor);
            const totalH = outdoorH + indoorH;
            const hasRides = totalH > 0;
            const animDelay = i * 25;

            return (
              <g
                key={i}
                onMouseEnter={(e) => {
                  setHovered(i);
                  const svgEl = (e.currentTarget.ownerSVGElement as SVGSVGElement);
                  const svgRect = svgEl.getBoundingClientRect();
                  const containerRect = ref.current!.getBoundingClientRect();
                  const svgX = (i * colW + colW / 2) / W * svgRect.width + svgRect.left - containerRect.left;
                  const svgY = (CHART_H - totalH) / H * svgRect.height + svgRect.top - containerRect.top - 8;
                  setTooltipPos({ x: svgX, y: svgY });
                }}
              >
                {/* Hover hit area */}
                <rect
                  x={i * colW}
                  y={0}
                  width={colW}
                  height={H}
                  fill="transparent"
                />

                {/* Outdoor bar */}
                {week.outdoor > 0 && (
                  <rect
                    x={x}
                    y={CHART_H - outdoorH}
                    width={barW}
                    height={outdoorH}
                    fill={isHovered ? 'url(#wc-outdoor-hover)' : 'url(#wc-outdoor)'}
                    rx={week.indoor > 0 ? 0 : 2}
                    ry={week.indoor > 0 ? 0 : 2}
                    style={{
                      transformOrigin: `${x + barW / 2}px ${CHART_H}px`,
                      transform: inView ? 'scaleY(1)' : 'scaleY(0)',
                      transition: `transform 0.65s cubic-bezier(0.22, 1, 0.36, 1) ${animDelay}ms`,
                    }}
                  />
                )}

                {/* Indoor bar (top) */}
                {week.indoor > 0 && (
                  <rect
                    x={x}
                    y={CHART_H - outdoorH - indoorH}
                    width={barW}
                    height={indoorH}
                    fill={isHovered ? 'url(#wc-indoor-hover)' : 'url(#wc-indoor)'}
                    rx={2}
                    ry={2}
                    style={{
                      transformOrigin: `${x + barW / 2}px ${CHART_H - outdoorH}px`,
                      transform: inView ? 'scaleY(1)' : 'scaleY(0)',
                      transition: `transform 0.65s cubic-bezier(0.22, 1, 0.36, 1) ${animDelay + 80}ms`,
                    }}
                  />
                )}

                {/* Week label (every 4th) */}
                {i % 4 === 0 && (
                  <text
                    x={x + barW / 2}
                    y={H - 2}
                    textAnchor="middle"
                    fontSize={8.5}
                    fill={isHovered ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'}
                    fontFamily="var(--font-inter)"
                  >
                    {week.label}
                  </text>
                )}

                {/* Hover top highlight dot */}
                {isHovered && hasRides && (
                  <circle
                    cx={x + barW / 2}
                    cy={CHART_H - totalH}
                    r={3}
                    fill="white"
                    opacity={0.8}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoverData && (
          <div
            className="pointer-events-none absolute z-20 bg-night-900 border border-white/[0.12] rounded-xl px-3.5 py-3 shadow-2xl"
            style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translate(-50%, -100%)', minWidth: 140 }}
          >
            <p className="text-xs text-slate-500 mb-1.5 tracking-widest uppercase">{hoverData.label}</p>
            <p className="font-bebas text-2xl text-white leading-none mb-2">
              {hoverData.total.toFixed(1)} km
            </p>
            {hoverData.outdoor > 0 && (
              <p className="text-xs text-orange-400">
                ↗ {hoverData.outdoor.toFixed(1)} outdoor
              </p>
            )}
            {hoverData.indoor > 0 && (
              <p className="text-xs text-cyan-400 mt-0.5">
                ⚡ {hoverData.indoor.toFixed(1)} indoor
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
