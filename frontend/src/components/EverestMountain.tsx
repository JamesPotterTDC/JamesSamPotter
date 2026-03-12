'use client';

import { useRef, useEffect, useState } from 'react';
import { useInView } from 'framer-motion';
import { everestMultiple } from '@/lib/utils';

interface EverestMountainProps {
  elevationM: number;
}

// Left slope waypoints — traced along the mountain face
const SLOPE: [number, number][] = [
  [18, 194], [32, 186], [48, 176], [62, 163],
  [76, 148], [89, 130], [100, 110], [110, 90],
  [119, 70], [126, 52], [131, 36], [135, 22],
];

function lerpPt(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function getPointOnSlope(pct: number): [number, number] {
  if (pct <= 0) return SLOPE[0];
  if (pct >= 1) return SLOPE[SLOPE.length - 1];
  const scaled = pct * (SLOPE.length - 1);
  const seg = Math.floor(scaled);
  const t = scaled - seg;
  return lerpPt(SLOPE[Math.min(seg, SLOPE.length - 2)], SLOPE[Math.min(seg + 1, SLOPE.length - 1)], t);
}

function buildTrailPath(progress: number): string {
  const steps = 60;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * progress;
    const [x, y] = getPointOnSlope(t);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

const STARS: [number, number, number][] = [
  [20,12,0.6],[40,8,0.4],[65,18,0.7],[85,6,0.5],[105,14,0.4],
  [125,9,0.6],[150,5,0.5],[170,16,0.7],[195,8,0.4],[215,12,0.6],
  [240,6,0.5],[260,18,0.4],[280,10,0.7],[295,4,0.5],[310,15,0.6],
  [52,30,0.3],[98,25,0.4],[145,22,0.3],[235,28,0.4],[288,25,0.3],
];

export default function EverestMountain({ elevationM }: EverestMountainProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);

  const EVEREST = 8848;
  const raw = elevationM / EVEREST;
  const displayPct = Math.min(raw, 1);
  const timesClimbed = Math.floor(raw);
  const label = everestMultiple(elevationM);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const duration = 2200;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 2.5);
      setProgress(eased * displayPct);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [inView, displayPct]);

  const trailPath = buildTrailPath(progress);
  const [cx, cy] = getPointOnSlope(progress);

  return (
    <div ref={ref} className="card p-6 flex flex-col items-center text-center">
      <p className="stat-label mb-4">Everest Challenge</p>

      <div className="w-full rounded-xl overflow-hidden" style={{ background: 'linear-gradient(180deg, #020408 0%, #0a1220 100%)' }}>
        <svg viewBox="0 0 320 200" width="100%" aria-hidden="true">
          <defs>
            <linearGradient id="ev-mountain" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c8d8e8" />
              <stop offset="18%" stopColor="#8fa8c0" />
              <stop offset="42%" stopColor="#4a6580" />
              <stop offset="72%" stopColor="#2a3e58" />
              <stop offset="100%" stopColor="#162032" />
            </linearGradient>
            <linearGradient id="ev-trail" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#fb923c" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#fb923c" stopOpacity="1" />
            </linearGradient>
            <filter id="ev-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="ev-glow-soft" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Stars */}
          {STARS.map(([sx, sy, op], i) => (
            <circle key={i} cx={sx} cy={sy} r="0.8" fill="white" opacity={op * (inView ? 1 : 0)}
              style={{ transition: `opacity 0.5s ease ${i * 30}ms` }} />
          ))}

          {/* Background mountain (secondary peak, right) */}
          <polygon
            points="195,200 230,120 260,145 290,105 320,200"
            fill="#0f1d2e"
            opacity="0.8"
          />

          {/* Main mountain */}
          <polygon
            points="0,200 18,194 32,186 48,176 62,163 76,148 89,130 100,110 110,90 119,70 126,52 131,36 135,22 139,36 143,52 148,68 155,88 164,108 176,128 190,148 206,163 222,173 244,182 268,190 295,196 320,200"
            fill="url(#ev-mountain)"
          />

          {/* Snow cap highlight */}
          <polygon
            points="126,52 131,36 135,22 139,36 143,52 138,48 135,40 132,48"
            fill="white"
            opacity="0.85"
          />

          {/* Altitude band lines */}
          {[165, 130, 100].map((y, i) => (
            <line
              key={i}
              x1="0" y1={y} x2="320" y2={y}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
          ))}

          {/* Trail */}
          {progress > 0 && (
            <path
              d={trailPath}
              stroke="url(#ev-trail)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Cyclist glow halo */}
          {progress > 0.02 && (
            <circle
              cx={cx}
              cy={cy}
              r="10"
              fill="#fb923c"
              opacity="0.15"
              filter="url(#ev-glow-soft)"
            />
          )}

          {/* Cyclist dot */}
          {progress > 0.02 && (
            <circle
              cx={cx}
              cy={cy}
              r="4"
              fill="#fb923c"
              filter="url(#ev-glow)"
            />
          )}

          {/* Summit flag */}
          <line x1="135" y1="22" x2="135" y2="10" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <polygon points="135,10 143,13 135,16" fill="rgba(251,146,60,0.6)" />

          {/* Elevation label */}
          <text x="258" y="32" fill="rgba(251,146,60,0.5)" fontSize="10" fontFamily="system-ui" textAnchor="middle">8,848 m</text>
          <line x1="224" y1="28" x2="235" y2="22" stroke="rgba(251,146,60,0.25)" strokeWidth="0.8" />
        </svg>
      </div>

      <div className="mt-4 flex items-end gap-2 justify-center">
        <span className="font-bebas text-5xl text-white leading-none">{label}</span>
        <span className="text-xs text-slate-600 mb-1.5">Everest</span>
      </div>
      <p className="text-xs text-slate-600 mt-1">{Math.round(elevationM).toLocaleString()} m climbed this year</p>

      {timesClimbed >= 1 && (
        <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)' }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <polygon points="5,0 6.2,3.8 10,3.8 7,6.2 8.1,10 5,7.6 1.9,10 3,6.2 0,3.8 3.8,3.8"
              fill="rgba(251,146,60,0.8)" />
          </svg>
          <span className="text-[11px] font-medium tracking-wide" style={{ color: 'rgba(251,146,60,0.8)' }}>
            Climbed Everest {timesClimbed}× this year
          </span>
        </div>
      )}
    </div>
  );
}
