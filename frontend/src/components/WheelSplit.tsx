'use client';

import { useRef, useEffect, useState } from 'react';
import { useInView } from 'framer-motion';
import { formatDistance } from '@/lib/utils';

interface WheelSplitProps {
  outdoorRides: number;
  indoorRides: number;
  outdoorDistM: number;
  indoorDistM: number;
  totalRides: number;
}

const CX = 100;
const CY = 100;
const OUTER_R = 82;
const INNER_R = 26;
const SPOKES = 16;

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = ((startDeg - 90) * Math.PI) / 180;
  const end = ((endDeg - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export default function WheelSplit({ outdoorRides, indoorRides, outdoorDistM, indoorDistM, totalRides }: WheelSplitProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const duration = 1400;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setProgress(1 - Math.pow(1 - t, 3));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [inView]);

  const outdoorPct = totalRides > 0 ? outdoorRides / totalRides : 0.5;
  const indoorPct = 1 - outdoorPct;

  const outdoorDeg = outdoorPct * 360 * progress;
  const indoorDeg = indoorPct * 360 * progress;

  const midOutdoor = (outdoorDeg / 2 - 90) * (Math.PI / 180);
  const midIndoor = (outdoorDeg + indoorDeg / 2 - 90) * (Math.PI / 180);
  const labelR = OUTER_R + 14;

  return (
    <div ref={ref} className="card p-6 flex flex-col">
      <p className="stat-label mb-5">Ride Split</p>

      <div className="flex items-center gap-6">
        {/* Wheel SVG */}
        <div className="flex-shrink-0">
          <svg viewBox="0 0 200 200" width="160" height="160" aria-hidden="true">
            <defs>
              <filter id="ws-glow-o" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="ws-glow-c" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Tyre (outer ring) */}
            <circle cx={CX} cy={CY} r={OUTER_R + 5} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />

            {/* Spokes */}
            {Array.from({ length: SPOKES }, (_, i) => {
              const angle = ((i / SPOKES) * 360 - 90) * (Math.PI / 180);
              return (
                <line
                  key={i}
                  x1={(CX + INNER_R * Math.cos(angle)).toFixed(2)}
                  y1={(CY + INNER_R * Math.sin(angle)).toFixed(2)}
                  x2={(CX + (OUTER_R - 2) * Math.cos(angle)).toFixed(2)}
                  y2={(CY + (OUTER_R - 2) * Math.sin(angle)).toFixed(2)}
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Rim base */}
            <circle cx={CX} cy={CY} r={OUTER_R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />

            {/* Outdoor arc */}
            {outdoorDeg > 1 && (
              <path
                d={describeArc(CX, CY, OUTER_R, 0, Math.min(outdoorDeg, 359.9))}
                fill="none"
                stroke="#fb923c"
                strokeWidth="6"
                strokeLinecap="butt"
                filter="url(#ws-glow-o)"
                opacity="0.9"
              />
            )}

            {/* Indoor arc */}
            {indoorDeg > 1 && (
              <path
                d={describeArc(CX, CY, OUTER_R, Math.max(outdoorDeg, 0.1), Math.min(outdoorDeg + indoorDeg, 359.9))}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="6"
                strokeLinecap="butt"
                filter="url(#ws-glow-c)"
                opacity="0.9"
              />
            )}

            {/* Hub outer ring */}
            <circle cx={CX} cy={CY} r={INNER_R} fill="#0d1424" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

            {/* Hub inner */}
            <circle cx={CX} cy={CY} r={14} fill="#111827" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

            {/* Hub centre bolt */}
            <circle cx={CX} cy={CY} r={5} fill="rgba(255,255,255,0.15)" />

            {/* Total rides label */}
            <text x={CX} y={CY - 4} textAnchor="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="system-ui">
              {totalRides}
            </text>
            <text x={CX} y={CY + 8} textAnchor="middle" fill="rgba(148,163,184,0.6)" fontSize="6.5" fontFamily="system-ui" letterSpacing="1">
              RIDES
            </text>

            {/* Arc labels (outdoor) */}
            {outdoorDeg > 20 && progress > 0.5 && (
              <text
                x={(CX + labelR * Math.cos(midOutdoor)).toFixed(2)}
                y={(CY + labelR * Math.sin(midOutdoor) + 4).toFixed(2)}
                textAnchor="middle"
                fill="#fb923c"
                fontSize="9"
                fontFamily="system-ui"
                fontWeight="600"
                opacity={progress}
              >
                {Math.round(outdoorPct * 100)}%
              </text>
            )}
            {indoorDeg > 20 && progress > 0.5 && (
              <text
                x={(CX + labelR * Math.cos(midIndoor)).toFixed(2)}
                y={(CY + labelR * Math.sin(midIndoor) + 4).toFixed(2)}
                textAnchor="middle"
                fill="#22d3ee"
                fontSize="9"
                fontFamily="system-ui"
                fontWeight="600"
                opacity={progress}
              >
                {Math.round(indoorPct * 100)}%
              </text>
            )}
          </svg>
        </div>

        {/* Breakdown */}
        <div className="flex-1 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
              <span className="text-xs font-medium text-slate-300">Outdoor</span>
            </div>
            <p className="font-bebas text-2xl text-orange-400 leading-none">{formatDistance(outdoorDistM)}</p>
            <p className="text-xs text-slate-600 mt-0.5">{outdoorRides} rides</p>
          </div>

          <div className="h-px bg-white/[0.05]" />

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
              <span className="text-xs font-medium text-slate-300">Indoor</span>
            </div>
            <p className="font-bebas text-2xl text-cyan-400 leading-none">{formatDistance(indoorDistM)}</p>
            <p className="text-xs text-slate-600 mt-0.5">{indoorRides} rides</p>
          </div>
        </div>
      </div>
    </div>
  );
}
