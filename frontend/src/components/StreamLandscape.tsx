'use client';

import { useRef, useState, useCallback } from 'react';
import { useInView } from 'framer-motion';

interface StreamLandscapeProps {
  streams: {
    time?: number[];
    altitude?: number[];
    heartrate?: number[];
    watts?: number[];
  };
  accentHex: string;
}

const W = 800;
const H = 200;
const PAD_B = 28;
const CHART_H = H - PAD_B;

function downsample<T>(arr: T[], target: number): T[] {
  if (arr.length <= target) return arr;
  const step = arr.length / target;
  return Array.from({ length: target }, (_, i) => arr[Math.floor(i * step)]);
}

function buildArea(
  values: number[],
  min: number,
  max: number,
  n: number,
  colW: number,
): string {
  const range = max - min || 1;
  const pts: [number, number][] = values.map((v, i) => [
    i * colW + colW / 2,
    CHART_H - ((v - min) / range) * CHART_H,
  ]);

  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]} L ${pts[0][0]} ${CHART_H} Z`;

  const d: string[] = [`M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`];
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx = (prev[0] + curr[0]) / 2;
    d.push(
      `C ${cpx.toFixed(1)} ${prev[1].toFixed(1)} ${cpx.toFixed(1)} ${curr[1].toFixed(1)} ${curr[0].toFixed(1)} ${curr[1].toFixed(1)}`,
    );
  }

  const lastX = pts[pts.length - 1][0].toFixed(1);
  const firstX = pts[0][0].toFixed(1);
  d.push(`L ${lastX} ${CHART_H} L ${firstX} ${CHART_H} Z`);
  return d.join(' ');
}

function buildLine(
  values: number[],
  min: number,
  max: number,
  colW: number,
): string {
  const range = max - min || 1;
  const pts: [number, number][] = values.map((v, i) => [
    i * colW + colW / 2,
    CHART_H - ((v - min) / range) * CHART_H,
  ]);

  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;

  const d: string[] = [`M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`];
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx = (prev[0] + curr[0]) / 2;
    d.push(
      `C ${cpx.toFixed(1)} ${prev[1].toFixed(1)} ${cpx.toFixed(1)} ${curr[1].toFixed(1)} ${curr[0].toFixed(1)} ${curr[1].toFixed(1)}`,
    );
  }
  return d.join(' ');
}

const TARGET = 200;

export default function StreamLandscape({ streams, accentHex }: StreamLandscapeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [cursor, setCursor] = useState<number | null>(null);

  const alt = streams.altitude ? downsample(streams.altitude, TARGET) : null;
  const hr = streams.heartrate ? downsample(streams.heartrate, TARGET) : null;
  const watts = streams.watts ? downsample(streams.watts, TARGET) : null;
  const time = streams.time ? downsample(streams.time, TARGET) : null;

  const n = Math.max(alt?.length ?? 0, hr?.length ?? 0, watts?.length ?? 0, 1);
  const colW = W / n;

  const altMin = alt ? Math.min(...alt) : 0;
  const altMax = alt ? Math.max(...alt) : 1;
  const hrMin = hr ? Math.min(...hr) - 5 : 0;
  const hrMax = hr ? Math.max(...hr) + 5 : 1;
  const wMin = 0;
  const wMax = watts ? Math.max(...watts) * 1.05 : 1;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * W;
      setCursor(Math.max(0, Math.min(n - 1, Math.floor(x / colW))));
    },
    [n, colW],
  );

  const streams_count = [alt, hr, watts].filter(Boolean).length;
  if (streams_count === 0) return null;

  const cursorX = cursor !== null ? (cursor * colW + colW / 2) : null;
  const cursorAlt = cursor !== null && alt ? alt[cursor] : null;
  const cursorHr = cursor !== null && hr ? hr[cursor] : null;
  const cursorW = cursor !== null && watts ? watts[cursor] : null;
  const cursorTime = cursor !== null && time ? time[cursor] : null;

  return (
    <div ref={ref} className="card p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="stat-label">Stream Landscape</p>
        <div className="flex items-center gap-4">
          {alt && (
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full" style={{ background: 'rgba(167,139,250,0.7)' }} />
              Altitude
            </span>
          )}
          {watts && (
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full" style={{ background: accentHex + 'bb' }} />
              Power
            </span>
          )}
          {hr && (
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full bg-rose-400/70" />
              Heart Rate
            </span>
          )}
        </div>
      </div>

      {/* Cursor readout */}
      <div className="h-6 mb-3 flex items-center gap-4 text-xs">
        {cursor !== null ? (
          <>
            {cursorTime !== null && (
              <span className="text-slate-600">
                {Math.floor(cursorTime / 60)}:{String(cursorTime % 60).padStart(2, '0')}
              </span>
            )}
            {cursorAlt !== null && (
              <span className="text-violet-400">{Math.round(cursorAlt)}m</span>
            )}
            {cursorW !== null && (
              <span style={{ color: accentHex }}>{Math.round(cursorW)}W</span>
            )}
            {cursorHr !== null && (
              <span className="text-rose-400">{Math.round(cursorHr)}bpm</span>
            )}
          </>
        ) : (
          <span className="text-slate-700 italic">Hover to inspect</span>
        )}
      </div>

      <div className="relative select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 180 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setCursor(null)}
        >
          <defs>
            {/* Reveal clip */}
            <clipPath id="sl-reveal">
              <rect
                x="0" y="0"
                width={inView ? W : 0}
                height={H}
                style={{ transition: 'width 1.6s cubic-bezier(0.22, 1, 0.36, 1) 0.3s' }}
              />
            </clipPath>

            {/* Altitude gradient */}
            <linearGradient id="sl-alt-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.03" />
            </linearGradient>

            {/* Power gradient */}
            <linearGradient id="sl-w-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentHex} stopOpacity="0.30" />
              <stop offset="100%" stopColor={accentHex} stopOpacity="0.04" />
            </linearGradient>

            {/* HR gradient */}
            <linearGradient id="sl-hr-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#fb7185" stopOpacity="0.03" />
            </linearGradient>

            {/* Glow filter */}
            <filter id="sl-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Baseline */}
          <line x1={0} y1={CHART_H} x2={W} y2={CHART_H} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />

          <g clipPath="url(#sl-reveal)">
            {/* Altitude area — bottom layer, widest */}
            {alt && (
              <>
                <path
                  d={buildArea(alt, altMin, altMax, n, colW)}
                  fill="url(#sl-alt-fill)"
                />
                <path
                  d={buildLine(alt, altMin, altMax, colW)}
                  fill="none"
                  stroke="rgba(167,139,250,0.35)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              </>
            )}

            {/* Power area — mid layer */}
            {watts && (
              <>
                <path
                  d={buildArea(watts, wMin, wMax, n, colW)}
                  fill="url(#sl-w-fill)"
                />
                <path
                  d={buildLine(watts, wMin, wMax, colW)}
                  fill="none"
                  stroke={accentHex + '90'}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
                <path
                  d={buildLine(watts, wMin, wMax, colW)}
                  fill="none"
                  stroke={accentHex}
                  strokeWidth={1}
                  strokeLinecap="round"
                  filter="url(#sl-glow)"
                  opacity="0.5"
                />
              </>
            )}

            {/* HR area — top layer */}
            {hr && (
              <>
                <path
                  d={buildArea(hr, hrMin, hrMax, n, colW)}
                  fill="url(#sl-hr-fill)"
                />
                <path
                  d={buildLine(hr, hrMin, hrMax, colW)}
                  fill="none"
                  stroke="rgba(251,113,133,0.5)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              </>
            )}
          </g>

          {/* Cursor */}
          {cursorX !== null && (
            <g>
              <line
                x1={cursorX} y1={0}
                x2={cursorX} y2={CHART_H}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              {cursorAlt !== null && (
                <circle
                  cx={cursorX.toFixed(1)}
                  cy={(CHART_H - ((cursorAlt - altMin) / (altMax - altMin || 1)) * CHART_H).toFixed(1)}
                  r={3} fill="#a78bfa"
                />
              )}
              {cursorW !== null && (
                <circle
                  cx={cursorX.toFixed(1)}
                  cy={(CHART_H - ((cursorW - wMin) / (wMax - wMin || 1)) * CHART_H).toFixed(1)}
                  r={3} fill={accentHex}
                />
              )}
              {cursorHr !== null && (
                <circle
                  cx={cursorX.toFixed(1)}
                  cy={(CHART_H - ((cursorHr - hrMin) / (hrMax - hrMin || 1)) * CHART_H).toFixed(1)}
                  r={3} fill="#fb7185"
                />
              )}
            </g>
          )}

          {/* Time labels */}
          {time && [0.25, 0.5, 0.75, 1.0].map((f) => {
            const idx = Math.floor((n - 1) * f);
            const t = time[idx];
            const x = idx * colW + colW / 2;
            const mins = Math.floor(t / 60);
            const label = mins >= 60
              ? `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}`
              : `${mins}m`;
            return (
              <text
                key={f}
                x={x.toFixed(1)}
                y={H - 6}
                textAnchor="middle"
                fontSize={8}
                fill="rgba(255,255,255,0.18)"
                fontFamily="var(--font-inter)"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
