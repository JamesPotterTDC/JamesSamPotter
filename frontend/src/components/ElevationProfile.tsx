'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

interface ElevationProfileProps {
  altitudes: number[];
  color?: string;
  className?: string;
}

export default function ElevationProfile({ altitudes, color = '#fb923c', className = '' }: ElevationProfileProps) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const duration = 1600;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setProgress(1 - Math.pow(1 - t, 2));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [inView]);

  if (!altitudes || altitudes.length < 2) return null;

  const W = 800;
  const H = 120;
  const PAD = 8;

  // Downsample to ~200 points for performance
  const step = Math.max(1, Math.floor(altitudes.length / 200));
  const sampled = altitudes.filter((_, i) => i % step === 0);

  const minAlt = Math.min(...sampled);
  const maxAlt = Math.max(...sampled);
  const range = maxAlt - minAlt || 1;

  const toX = (i: number) => PAD + (i / (sampled.length - 1)) * (W - PAD * 2);
  const toY = (alt: number) => H - PAD - ((alt - minAlt) / range) * (H - PAD * 2);

  // Build SVG path
  const points = sampled.map((alt, i) => `${toX(i).toFixed(1)},${toY(alt).toFixed(1)}`);
  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${toX(sampled.length - 1)},${H} L ${toX(0)},${H} Z`;

  const gradId = `elev-grad-${Math.random().toString(36).slice(2)}`;

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 96 }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
          <clipPath id={`clip-${gradId}`}>
            <rect x="0" y="0" width={`${progress * 100}%`} height={H} />
          </clipPath>
        </defs>

        {/* Area fill */}
        <path
          d={areaPath}
          fill={`url(#${gradId})`}
          clipPath={`url(#clip-${gradId})`}
        />
        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          clipPath={`url(#clip-${gradId})`}
          opacity="0.8"
        />
      </svg>

      {/* Min/max labels */}
      <div className="flex justify-between mt-1 px-1">
        <span className="text-xs text-slate-600">{Math.round(minAlt)}m</span>
        <span className="text-xs text-slate-600">{Math.round(maxAlt)}m</span>
      </div>
    </div>
  );
}
