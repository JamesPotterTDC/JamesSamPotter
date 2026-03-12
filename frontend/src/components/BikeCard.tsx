'use client';

import { useState } from 'react';

const SPECS = [
  { label: 'Frame', value: 'Giant TCR Advanced Pro 2', detail: '2018 · carbon composite' },
  { label: 'Groupset', value: 'Shimano 105', detail: 'R7000 · 11-speed' },
  { label: 'Wheels', value: 'Zipp 404', detail: 'Tubular · carbon clincher' },
];

export default function BikeCard() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div
      className="card overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
      }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
        <p className="stat-label mb-1">The Machine</p>
        <h3 className="font-bebas text-3xl text-white tracking-tight leading-none">
          2018 Giant TCR Advanced Pro 2
        </h3>
      </div>

      {/* Bike silhouette */}
      <div className="px-4 py-6 relative" style={{ background: 'radial-gradient(ellipse at 50% 80%, rgba(251,146,60,0.04) 0%, transparent 65%)' }}>
        <svg viewBox="0 0 480 200" width="100%" aria-hidden="true">
          <defs>
            <filter id="bc-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Rear wheel */}
          <circle cx="115" cy="140" r="54" fill="none" stroke="rgba(251,146,60,0.35)" strokeWidth="7" />
          <circle cx="115" cy="140" r="48" fill="none" stroke="rgba(251,146,60,0.1)" strokeWidth="1" />
          {/* Rear spokes */}
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2;
            return (
              <line
                key={i}
                x1={(115 + 10 * Math.cos(a)).toFixed(1)}
                y1={(140 + 10 * Math.sin(a)).toFixed(1)}
                x2={(115 + 46 * Math.cos(a)).toFixed(1)}
                y2={(140 + 46 * Math.sin(a)).toFixed(1)}
                stroke="rgba(251,146,60,0.12)"
                strokeWidth="1"
              />
            );
          })}
          <circle cx="115" cy="140" r="8" fill="rgba(251,146,60,0.2)" stroke="rgba(251,146,60,0.4)" strokeWidth="1" />
          <circle cx="115" cy="140" r="3" fill="rgba(251,146,60,0.6)" />

          {/* Front wheel */}
          <circle cx="365" cy="140" r="54" fill="none" stroke="rgba(251,146,60,0.35)" strokeWidth="7" />
          <circle cx="365" cy="140" r="48" fill="none" stroke="rgba(251,146,60,0.1)" strokeWidth="1" />
          {/* Front spokes */}
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2;
            return (
              <line
                key={i}
                x1={(365 + 10 * Math.cos(a)).toFixed(1)}
                y1={(140 + 10 * Math.sin(a)).toFixed(1)}
                x2={(365 + 46 * Math.cos(a)).toFixed(1)}
                y2={(140 + 46 * Math.sin(a)).toFixed(1)}
                stroke="rgba(251,146,60,0.12)"
                strokeWidth="1"
              />
            );
          })}
          <circle cx="365" cy="140" r="8" fill="rgba(251,146,60,0.2)" stroke="rgba(251,146,60,0.4)" strokeWidth="1" />
          <circle cx="365" cy="140" r="3" fill="rgba(251,146,60,0.6)" />

          {/* Bottom bracket */}
          <circle cx="238" cy="140" r="9" fill="rgba(251,146,60,0.15)" stroke="rgba(251,146,60,0.3)" strokeWidth="1.5" />

          {/* Chainring */}
          <circle cx="238" cy="140" r="22" fill="none" stroke="rgba(251,146,60,0.2)" strokeWidth="1.5" strokeDasharray="4 3" />

          {/* Chain stay */}
          <line x1="115" y1="140" x2="238" y2="140" stroke="rgba(251,146,60,0.5)" strokeWidth="3" strokeLinecap="round" />

          {/* Seat stay */}
          <line x1="115" y1="140" x2="210" y2="65" stroke="rgba(251,146,60,0.5)" strokeWidth="2.5" strokeLinecap="round" />

          {/* Seat tube */}
          <line x1="238" y1="140" x2="210" y2="65" stroke="rgba(251,146,60,0.6)" strokeWidth="3.5" strokeLinecap="round" />

          {/* Top tube */}
          <line x1="210" y1="65" x2="330" y2="75" stroke="rgba(251,146,60,0.6)" strokeWidth="3.5" strokeLinecap="round" />

          {/* Down tube */}
          <line x1="238" y1="140" x2="335" y2="100" stroke="rgba(251,146,60,0.6)" strokeWidth="4" strokeLinecap="round" />

          {/* Head tube */}
          <line x1="330" y1="72" x2="340" y2="105" stroke="rgba(251,146,60,0.7)" strokeWidth="5" strokeLinecap="round" />

          {/* Fork */}
          <path d="M 338 105 Q 355 125 365 140" fill="none" stroke="rgba(251,146,60,0.5)" strokeWidth="3" strokeLinecap="round" />

          {/* Seat post */}
          <line x1="210" y1="65" x2="213" y2="42" stroke="rgba(251,146,60,0.4)" strokeWidth="2.5" strokeLinecap="round" />

          {/* Saddle */}
          <path d="M 198 40 Q 213 36 226 40" fill="none" stroke="rgba(251,146,60,0.6)" strokeWidth="3" strokeLinecap="round" />

          {/* Stem */}
          <line x1="333" y1="73" x2="343" y2="60" stroke="rgba(251,146,60,0.5)" strokeWidth="3" strokeLinecap="round" />

          {/* Handlebars (drops) */}
          <path d="M 330 58 Q 345 54 352 58 Q 358 63 355 72" fill="none" stroke="rgba(251,146,60,0.5)" strokeWidth="2.5" strokeLinecap="round" />

          {/* Crank arm */}
          <line x1="238" y1="140" x2="248" y2="162" stroke="rgba(251,146,60,0.4)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="248" cy="162" r="4" fill="rgba(251,146,60,0.2)" stroke="rgba(251,146,60,0.35)" strokeWidth="1.5" />

          {/* Zipp label (wheel annotation) */}
          <text x="365" y="75" textAnchor="middle" fill="rgba(251,146,60,0.25)" fontSize="9" fontFamily="system-ui" letterSpacing="2">
            ZIPP 404
          </text>

          {/* Glow under bike */}
          <ellipse cx="240" cy="195" rx="140" ry="8" fill="rgba(251,146,60,0.06)" />
        </svg>
      </div>

      {/* Spec list */}
      <div className="px-6 pb-6 space-y-0 divide-y divide-white/[0.05]">
        {SPECS.map((spec, i) => (
          <div
            key={spec.label}
            className="flex items-start justify-between py-3 cursor-default group"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="text-xs text-slate-600 w-20 flex-shrink-0 pt-0.5">{spec.label}</span>
            <div className="flex-1 text-right">
              <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                {spec.value}
              </p>
              <p
                className="text-xs text-slate-600 transition-all duration-300 overflow-hidden"
                style={{ maxHeight: hovered === i ? '20px' : '0', opacity: hovered === i ? 1 : 0 }}
              >
                {spec.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
