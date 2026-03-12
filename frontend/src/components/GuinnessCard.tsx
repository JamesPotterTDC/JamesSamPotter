'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { guinnessPints } from '@/lib/utils';

interface GuinnessCardProps {
  totalKj: number;
}

export default function GuinnessCard({ totalKj }: GuinnessCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const pints = guinnessPints(totalKj);
  const [fillPercent, setFillPercent] = useState(0);
  const [displayPints, setDisplayPints] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!inView || pints === 0) return;
    const start = performance.now();
    const duration = 2000;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setFillPercent(eased * 100);
      setDisplayPints(Math.round(eased * pints));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [inView, pints]);

  // Pint glass SVG geometry
  const glassH = 80;
  const topW = 44;
  const bottomW = 30;
  const glassX = (60 - topW) / 2;

  // Compute fill polygon (tapers with glass shape)
  const fillTop = glassH * (1 - fillPercent / 100);
  const widthAtTop = bottomW + (topW - bottomW) * (glassH - fillTop) / glassH;
  const widthAtBottom = bottomW;
  const xAtTop = (60 - widthAtTop) / 2;
  const xAtBottom = (60 - widthAtBottom) / 2;

  return (
    <div ref={ref} className="card p-6 flex flex-col items-center text-center">
      <p className="stat-label mb-4">Earned This Year</p>

      {/* Pint glass */}
      <div className="relative mb-4">
        <svg width="60" height="100" viewBox="0 0 60 100">
          <defs>
            <clipPath id="glass-clip">
              <polygon points={`${glassX},8 ${glassX + topW},8 ${xAtBottom + widthAtBottom},92 ${xAtBottom},92`} />
            </clipPath>
          </defs>

          {/* Fill */}
          {fillPercent > 0 && (
            <>
              {/* Dark beer body */}
              <polygon
                points={`${xAtTop},${fillTop + 8} ${xAtTop + widthAtTop},${fillTop + 8} ${xAtBottom + widthAtBottom},92 ${xAtBottom},92`}
                fill="#1a0a00"
                clipPath="url(#glass-clip)"
              />
              {/* Cream head */}
              <ellipse
                cx="30"
                cy={fillTop + 8}
                rx={widthAtTop / 2 - 1}
                ry={4}
                fill="#e8dcc8"
                opacity="0.9"
              />
            </>
          )}

          {/* Glass outline */}
          <polygon
            points={`${glassX},8 ${glassX + topW},8 ${(60 - bottomW) / 2 + bottomW},92 ${(60 - bottomW) / 2},92`}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1.5"
          />

          {/* Glass top rim */}
          <line x1={glassX} y1="8" x2={glassX + topW} y2="8" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />

          {/* Shine */}
          <line
            x1={glassX + 5}
            y1="12"
            x2={glassX + 4}
            y2="75"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Count */}
      <div className="font-bebas text-5xl text-white leading-none mb-1">{displayPints}</div>
      <div className="text-sm font-display font-medium text-slate-300 mb-1">Pints of Guinness</div>
      <div className="text-xs text-slate-600 max-w-[140px] leading-relaxed">
        {Math.round(totalKj).toLocaleString()} kJ burned this year
      </div>
    </div>
  );
}
