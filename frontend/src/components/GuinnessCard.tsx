'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { guinnessPints } from '@/lib/utils';

interface GuinnessCardProps {
  totalKj: number;
  monthKj?: number;
  totalRides?: number;
}

type Mode = 'year' | 'month' | 'ride';

export default function GuinnessCard({ totalKj, monthKj = 0, totalRides = 1 }: GuinnessCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [mode, setMode] = useState<Mode>('year');
  const [fillPct, setFillPct] = useState(0);
  const [displayPints, setDisplayPints] = useState(0);
  const rafRef = useRef<number>(0);
  const [bubbles, setBubbles] = useState<{ x: number; y: number; r: number; delay: number }[]>([]);

  const kjForMode = mode === 'year' ? totalKj : mode === 'month' ? monthKj : totalKj / Math.max(totalRides, 1);
  const pints = guinnessPints(kjForMode);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (!inView) return;
    const start = performance.now();
    const from = displayPints;
    const duration = 1800;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setFillPct(Math.min(eased * 100, 100));
      setDisplayPints(Math.round(from + (pints - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, pints]);

  // Generate stable bubble positions
  useEffect(() => {
    setBubbles(Array.from({ length: 8 }, (_, i) => ({
      x: 10 + (i % 4) * 16 + (i > 3 ? 6 : 0),
      y: 50 + Math.random() * 30,
      r: 1.5 + Math.random() * 2,
      delay: i * 0.4,
    })));
  }, []);

  // Glass geometry (larger: 80px wide, 110px tall)
  const GW = 200; // SVG viewBox width
  const GH = 140; // SVG viewBox height
  const TOP_W = 76;
  const BOT_W = 52;
  const TOP_Y = 12;
  const BOT_Y = GH - 12;
  const LEFT_TOP = (GW - TOP_W) / 2;
  const LEFT_BOT = (GW - BOT_W) / 2;

  const fillTopY = TOP_Y + (BOT_Y - TOP_Y) * (1 - fillPct / 100);
  const widthAt = (y: number) => BOT_W + (TOP_W - BOT_W) * ((BOT_Y - y) / (BOT_Y - TOP_Y));
  const leftAt = (y: number) => (GW - widthAt(y)) / 2;

  const wAtFill = widthAt(fillTopY);
  const xAtFill = leftAt(fillTopY);
  const headH = Math.min(8, (BOT_Y - fillTopY) * 0.12 + 4);
  const foamY = fillTopY;

  const glassPoints = `${LEFT_TOP},${TOP_Y} ${LEFT_TOP + TOP_W},${TOP_Y} ${LEFT_BOT + BOT_W},${BOT_Y} ${LEFT_BOT},${BOT_Y}`;

  const MODES: { key: Mode; label: string }[] = [
    { key: 'year', label: 'Year' },
    { key: 'month', label: 'Month' },
    { key: 'ride', label: 'Per ride' },
  ];

  return (
    <div ref={ref} className="card p-6 flex flex-col items-center text-center">
      <p className="stat-label mb-3">Guinness Equivalent</p>

      {/* Mode toggle */}
      <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5 mb-5">
        {MODES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`text-xs font-medium px-3 py-1 rounded-md transition-all duration-200 ${
              mode === key
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Pint glass */}
      <div className="relative w-full" style={{ maxWidth: 140 }}>
        <svg viewBox={`0 0 ${GW} ${GH}`} width="100%">
          <defs>
            <clipPath id="gc-clip">
              <polygon points={glassPoints} />
            </clipPath>
            <linearGradient id="gc-beer" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1a0c02" />
              <stop offset="40%" stopColor="#2d1405" />
              <stop offset="100%" stopColor="#1a0c02" />
            </linearGradient>
            <linearGradient id="gc-foam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f0e8d8" />
              <stop offset="100%" stopColor="#d4c4a0" />
            </linearGradient>
            <linearGradient id="gc-shine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>

          {/* Beer body */}
          {fillPct > 0 && (
            <polygon
              points={`${xAtFill},${fillTopY + headH} ${xAtFill + wAtFill},${fillTopY + headH} ${LEFT_BOT + BOT_W},${BOT_Y} ${LEFT_BOT},${BOT_Y}`}
              fill="url(#gc-beer)"
              clipPath="url(#gc-clip)"
            />
          )}

          {/* Foam / cream head */}
          {fillPct > 0 && (
            <ellipse
              cx={GW / 2}
              cy={foamY + headH / 2}
              rx={wAtFill / 2 - 1}
              ry={headH / 2 + 1}
              fill="url(#gc-foam)"
              opacity="0.92"
              clipPath="url(#gc-clip)"
            />
          )}

          {/* Bubbles rising through beer */}
          {fillPct > 80 && bubbles.map((b, i) => (
            <circle
              key={i}
              cx={LEFT_BOT + BOT_W * 0.15 + b.x}
              cy={b.y + fillTopY}
              r={b.r}
              fill="rgba(255,200,100,0.15)"
              clipPath="url(#gc-clip)"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values={`0,0; 0,-${(BOT_Y - fillTopY) * 0.7}`}
                dur={`${2 + b.delay}s`}
                repeatCount="indefinite"
                begin={`${b.delay}s`}
              />
              <animate attributeName="opacity" values="0;0.4;0" dur={`${2 + b.delay}s`} repeatCount="indefinite" begin={`${b.delay}s`} />
            </circle>
          ))}

          {/* Glass outline */}
          <polygon
            points={glassPoints}
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1.5"
          />

          {/* Rim */}
          <line x1={LEFT_TOP} y1={TOP_Y} x2={LEFT_TOP + TOP_W} y2={TOP_Y} stroke="rgba(255,255,255,0.28)" strokeWidth="2" />

          {/* Shine */}
          <polygon
            points={`${LEFT_TOP + 4},${TOP_Y + 4} ${LEFT_TOP + 14},${TOP_Y + 4} ${LEFT_BOT + 10},${BOT_Y - 20} ${LEFT_BOT + 2},${BOT_Y - 20}`}
            fill="url(#gc-shine)"
            clipPath="url(#gc-clip)"
          />
        </svg>
      </div>

      <div className="font-bebas text-6xl text-white leading-none mt-2">{displayPints}</div>
      <div className="text-sm font-display font-medium text-amber-300/80 mb-1">
        {mode === 'ride' ? 'pints per ride' : 'pints of Guinness'}
      </div>
      <div className="text-xs text-slate-600">
        {Math.round(kjForMode).toLocaleString()} kJ
        {mode === 'year' ? ' this year' : mode === 'month' ? ' this month' : ' avg per ride'}
      </div>
    </div>
  );
}
