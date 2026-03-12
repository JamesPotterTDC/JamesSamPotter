'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

// ─── Static bike config ────────────────────────────────────────────────────
const BIKE = {
  year:     2018,
  make:     'Giant',
  model:    'TCR Advanced Pro 2',
  groupset: 'Shimano 105',
  wheels:   'Zipp 404 Tubular',
  frame:    'Carbon',
  role:     'Road · Race',
};

interface BikeCardProps {
  allTimeDistM: number;
  allTimeRides: number;
  lastRideDate?: string;
}

// ─── Zipp 404 deep-section wheel SVG ──────────────────────────────────────
function ZippWheel({ size = 140, spin = true, alpha = 1 }: {
  size?: number; spin?: boolean; alpha?: number;
}) {
  const CX = size / 2;
  const CY = size / 2;
  const outerR   = size / 2 - 4;
  const deepR    = outerR - 9;
  const spokeBed = deepR - 4;
  const hubR     = Math.round(size * 0.092);
  const SPOKES   = 18;
  const uid      = `z404-${size}`;

  return (
    <motion.svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ opacity: alpha }}
      animate={spin ? { rotate: 360 } : undefined}
      transition={spin ? { duration: 10, repeat: Infinity, ease: 'linear' } : undefined}
    >
      <defs>
        <filter id={`wglow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id={`hubg-${uid}`} cx="50%" cy="50%">
          <stop offset="0%" stopColor="rgba(251,146,60,0.55)" />
          <stop offset="100%" stopColor="rgba(251,146,60,0.04)" />
        </radialGradient>
      </defs>

      <circle cx={CX} cy={CY} r={outerR}
        fill="none" stroke="rgba(251,146,60,0.55)" strokeWidth="8"
        filter={`url(#wglow-${uid})`}
      />
      <circle cx={CX} cy={CY} r={deepR}
        fill="none" stroke="rgba(251,146,60,0.1)" strokeWidth="1.2"
      />
      <circle cx={CX} cy={CY} r={spokeBed}
        fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8"
      />

      {Array.from({ length: SPOKES }, (_, i) => {
        const a0 = (i / SPOKES) * Math.PI * 2;
        const a1 = a0 + 0.07;
        return (
          <line key={i}
            x1={(CX + hubR * Math.cos(a0)).toFixed(2)}
            y1={(CY + hubR * Math.sin(a0)).toFixed(2)}
            x2={(CX + spokeBed * Math.cos(a1)).toFixed(2)}
            y2={(CY + spokeBed * Math.sin(a1)).toFixed(2)}
            stroke="rgba(251,146,60,0.22)" strokeWidth="1.1"
          />
        );
      })}

      <circle cx={CX} cy={CY} r={hubR}
        fill={`url(#hubg-${uid})`}
        stroke="rgba(251,146,60,0.55)" strokeWidth="2"
        filter={`url(#wglow-${uid})`}
      />
      <circle cx={CX} cy={CY} r={hubR * 0.38} fill="rgba(251,146,60,0.3)" />
    </motion.svg>
  );
}

// ─── Road bike silhouette (side view, simplified geometry) ─────────────────
function BikeSilhouette() {
  // Viewbox: 520 × 200. Rear wheel at (110,145), front at (380,145), r=75
  // BB at (240,145), seat top (210,60), head tube top (355,62)
  return (
    <svg
      viewBox="0 0 520 200"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
      style={{ pointerEvents: 'none' }}
    >
      <g fill="none" stroke="rgba(251,146,60,0.09)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Rear wheel */}
        <circle cx="110" cy="145" r="72" />
        {/* Front wheel */}
        <circle cx="385" cy="145" r="72" />

        {/* Frame: chain stay (BB to rear axle) */}
        <line x1="240" y1="143" x2="110" y2="145" />
        {/* Frame: seat stay (rear axle to seat tube top junction) */}
        <line x1="110" y1="145" x2="216" y2="62" />
        {/* Frame: seat tube */}
        <line x1="240" y1="143" x2="216" y2="62" />
        {/* Frame: top tube */}
        <line x1="216" y1="62" x2="355" y2="65" />
        {/* Frame: down tube */}
        <line x1="240" y1="143" x2="355" y2="65" />
        {/* Fork */}
        <line x1="355" y1="65" x2="385" y2="145" />

        {/* Seat post */}
        <line x1="218" y1="62" x2="220" y2="42" />
        {/* Saddle */}
        <path d="M 200 42 Q 220 37 240 42" />

        {/* Head tube */}
        <line x1="355" y1="65" x2="360" y2="82" />
        {/* Stem */}
        <line x1="357" y1="68" x2="375" y2="60" />
        {/* Drop bar – outer drops */}
        <path d="M 370 58 Q 382 58 385 64 Q 388 72 380 75" />
        {/* Drop bar – hood side */}
        <path d="M 370 58 Q 362 58 360 62" />

        {/* Crank arm */}
        <line x1="240" y1="143" x2="255" y2="162" />
        <circle cx="240" cy="143" r="5" stroke="rgba(251,146,60,0.14)" />
      </g>
    </svg>
  );
}

// ─── Spec pill ─────────────────────────────────────────────────────────────
function SpecPill({ children, glow = false }: { children: React.ReactNode; glow?: boolean }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-medium tracking-wide"
      style={{
        borderColor: 'rgba(251,146,60,0.22)',
        background:  'rgba(251,146,60,0.05)',
        color:       'rgba(251,146,60,0.72)',
        boxShadow:   glow ? '0 0 10px rgba(251,146,60,0.12)' : 'none',
      }}
    >
      {children}
    </span>
  );
}

// ─── Callout line (spec annotation style) ─────────────────────────────────
function CalloutLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-px" style={{ background: 'rgba(251,146,60,0.3)' }} />
      <span className="text-[9px] text-slate-700 tracking-wider uppercase">{label}</span>
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
      <span className="text-[10px] font-medium" style={{ color: 'rgba(251,146,60,0.65)' }}>{value}</span>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function fmtDist(m: number): string {
  const km = m / 1000;
  return km >= 10_000
    ? `${(km / 1000).toFixed(1)}k`
    : `${Math.round(km).toLocaleString('en-GB')}`;
}

function fmtLastRide(dateStr?: string): string {
  if (!dateStr) return '—';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ═══════════════════════════════════════════════════════════════════════════
// BIKE CARD
// ═══════════════════════════════════════════════════════════════════════════
export default function BikeCard({ allTimeDistM, allTimeRides, lastRideDate }: BikeCardProps) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <div ref={ref} className="max-w-7xl mx-auto px-6 pb-16">
      <div className="flex items-center gap-4 mb-6">
        <h2 className="font-display font-semibold text-white text-lg">Garage</h2>
        <span className="h-px flex-1 max-w-[60px]" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <span className="text-[10px] text-slate-700 tracking-[0.3em] uppercase">Equipment</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl overflow-hidden border transition-colors duration-500"
        style={{ background: '#0b0e18', borderColor: 'rgba(255,255,255,0.06)' }}
        whileHover={{ borderColor: 'rgba(251,146,60,0.22)' } as any}
      >
        {/* Carbon-weave texture */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden preserveAspectRatio="none">
          <defs>
            <pattern id="cweave" x="0" y="0" width="8" height="8"
              patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="4" height="4" fill="rgba(255,255,255,0.014)" />
              <rect x="4" y="4" width="4" height="4" fill="rgba(255,255,255,0.014)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cweave)" />
        </svg>

        {/* Bike silhouette — large background watermark */}
        <motion.div
          className="absolute inset-0 w-full h-full pointer-events-none"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6, duration: 1.2 }}
        >
          <BikeSilhouette />
        </motion.div>

        {/* Orange ambient glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 85% 50%, rgba(251,146,60,0.09) 0%, transparent 50%)' }}
        />

        {/* Content */}
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10 px-7 py-7 sm:px-10 sm:py-8">

          {/* ── Text block ── */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-700 tracking-[0.35em] uppercase mb-2">
              {BIKE.year} · {BIKE.role} · Primary Machine
            </p>

            <motion.h2
              className="font-bebas leading-none tracking-tight"
              style={{ fontSize: 'clamp(34px, 5.5vw, 60px)' }}
              initial={{ opacity: 0, x: -18 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <span style={{ color: 'rgba(251,146,60,0.88)' }}>{BIKE.make} </span>
              <span className="text-white">{BIKE.model}</span>
            </motion.h2>

            {/* Spec pills */}
            <motion.div
              className="flex flex-wrap items-center gap-2 mt-4"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.28 }}
            >
              <SpecPill>{BIKE.groupset}</SpecPill>
              <SpecPill glow>{BIKE.wheels}</SpecPill>
              <SpecPill>{BIKE.frame} Frame</SpecPill>
            </motion.div>

            {/* Spec callout lines */}
            <motion.div
              className="mt-4 space-y-1.5"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.38 }}
            >
              <CalloutLine label="Drivetrain" value="11-Speed" />
              <CalloutLine label="Rim depth" value="58mm Carbon" />
              <CalloutLine label="Frame" value="ALUXX SL-Grade" />
            </motion.div>

            {/* Stats strip */}
            <motion.div
              className="flex items-center gap-5 mt-5 pt-5 border-t border-white/[0.05]"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.45 }}
            >
              <div>
                <p className="font-bebas text-2xl text-white leading-none">
                  {fmtDist(allTimeDistM)}
                  <span className="text-sm font-sans font-normal text-slate-600 ml-0.5">km</span>
                </p>
                <p className="text-[9px] text-slate-700 tracking-wider mt-0.5">TOTAL DISTANCE</p>
              </div>

              <div className="w-px h-8 bg-white/[0.06] flex-shrink-0" />

              <div>
                <p className="font-bebas text-2xl text-white leading-none">
                  {allTimeRides.toLocaleString('en-GB')}
                </p>
                <p className="text-[9px] text-slate-700 tracking-wider mt-0.5">RIDES</p>
              </div>

              <div className="w-px h-8 bg-white/[0.06] flex-shrink-0" />

              <div>
                <p className="font-bebas text-2xl leading-none"
                  style={{ color: 'rgba(251,146,60,0.82)' }}>
                  {fmtLastRide(lastRideDate)}
                </p>
                <p className="text-[9px] text-slate-700 tracking-wider mt-0.5">LAST RIDDEN</p>
              </div>
            </motion.div>
          </div>

          {/* ── Twin-wheel visual ── */}
          <div className="hidden sm:block flex-shrink-0 relative self-center" style={{ width: 160, height: 160 }}>
            {/* Ghost rear wheel */}
            <motion.div
              className="absolute"
              style={{ top: 14, left: 24, zIndex: 0 }}
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.5 }}
            >
              <ZippWheel size={122} spin={false} alpha={0.15} />
            </motion.div>

            {/* Front wheel — slow spin */}
            <motion.div
              className="absolute inset-0"
              style={{ zIndex: 1 }}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <ZippWheel size={160} spin={true} />
            </motion.div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
