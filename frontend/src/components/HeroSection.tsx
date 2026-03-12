'use client';

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import AnimatedCounter from './AnimatedCounter';
import type { Summary } from '@/lib/api';
import { everestMultiple } from '@/lib/utils';

interface HeroSectionProps {
  summary: Summary;
}

const SPOKES = 24;
const SPEED_LINES = [
  { y: 9, w: 38, x: 4, dur: 3.2, delay: 0, op: 0.018 },
  { y: 16, w: 52, x: 18, dur: 2.6, delay: 0.4, op: 0.012 },
  { y: 23, w: 28, x: 2, dur: 4.1, delay: 0.9, op: 0.022 },
  { y: 31, w: 65, x: 30, dur: 2.9, delay: 0.2, op: 0.010 },
  { y: 38, w: 42, x: 8, dur: 3.7, delay: 1.1, op: 0.016 },
  { y: 47, w: 30, x: 55, dur: 3.0, delay: 0.6, op: 0.020 },
  { y: 56, w: 58, x: 12, dur: 2.4, delay: 1.5, op: 0.013 },
  { y: 64, w: 35, x: 45, dur: 3.5, delay: 0.3, op: 0.018 },
  { y: 72, w: 48, x: 6, dur: 2.8, delay: 0.8, op: 0.015 },
  { y: 81, w: 22, x: 62, dur: 4.0, delay: 1.2, op: 0.021 },
  { y: 89, w: 60, x: 20, dur: 3.1, delay: 0.5, op: 0.011 },
];

export default function HeroSection({ summary }: HeroSectionProps) {
  const containerRef = useRef<HTMLElement>(null);
  const shouldReduce = useReducedMotion();
  const { scrollY } = useScroll();

  const ytd = summary.year_to_date;
  const year = new Date().getFullYear();
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000) || 1;
  const totalKm = ytd.total_distance_m / 1000;
  const projectedKm = Math.round((totalKm / dayOfYear) * 365);
  const yearPct = Math.round((dayOfYear / 365) * 100);
  const totalHours = Math.floor(ytd.total_time_s / 3600);
  const totalMins = Math.floor((ytd.total_time_s % 3600) / 60);

  // Scroll-driven parallax
  const contentY = useTransform(scrollY, [0, 600], [0, shouldReduce ? 0 : -80]);
  const contentOpacity = useTransform(scrollY, [0, 450], [1, 0]);
  const wheelRotation = useTransform(scrollY, [0, 3000], [0, shouldReduce ? 0 : 360]);

  const stagger = (i: number) => ({
    hidden: { opacity: 0, y: shouldReduce ? 0 : 44 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.85, delay: 0.08 + i * 0.14, ease: [0.22, 1, 0.36, 1] as const },
    },
  });

  return (
    <section ref={containerRef} className="relative min-h-[95vh] flex flex-col justify-center overflow-hidden">

      {/* ── Ghost wheel ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
        <motion.div style={{ rotate: wheelRotation }}>
          <svg width="820" height="820" viewBox="0 0 820 820">
            <g opacity="0.045">
              <circle cx="410" cy="410" r="390" fill="none" stroke="white" strokeWidth="2.5" />
              <circle cx="410" cy="410" r="355" fill="none" stroke="white" strokeWidth="0.6" />
              {Array.from({ length: SPOKES }, (_, i) => {
                const a = (i / SPOKES) * Math.PI * 2;
                return (
                  <line
                    key={i}
                    x1={(410 + 30 * Math.cos(a)).toFixed(1)} y1={(410 + 30 * Math.sin(a)).toFixed(1)}
                    x2={(410 + 388 * Math.cos(a)).toFixed(1)} y2={(410 + 388 * Math.sin(a)).toFixed(1)}
                    stroke="white" strokeWidth="0.8"
                  />
                );
              })}
              <circle cx="410" cy="410" r="30" fill="none" stroke="white" strokeWidth="2" />
              <circle cx="410" cy="410" r="12" fill="none" stroke="white" strokeWidth="1.2" />
              <circle cx="410" cy="410" r="4" fill="white" opacity="0.6" />
            </g>
          </svg>
        </motion.div>
      </div>

      {/* ── Speed lines ── */}
      {!shouldReduce && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            {SPEED_LINES.map((l, i) => (
              <motion.line
                key={i}
                y1={`${l.y}%`} y2={`${l.y}%`}
                stroke="rgba(251,146,60,1)"
                strokeWidth="0.06"
                animate={{
                  x1: [`${l.x}%`, `${l.x + 55}%`],
                  x2: [`${l.x + l.w}%`, `${l.x + l.w + 55}%`],
                  opacity: [0, l.op, l.op * 0.6, 0],
                }}
                transition={{ duration: l.dur, repeat: Infinity, delay: l.delay, ease: 'linear' }}
              />
            ))}
          </svg>
        </div>
      )}

      {/* ── Colour bleed ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            'radial-gradient(ellipse at 8% 55%, rgba(251,146,60,0.10) 0%, transparent 52%)',
            'radial-gradient(ellipse at 90% 14%, rgba(34,211,238,0.06) 0%, transparent 46%)',
            'radial-gradient(ellipse at 52% 96%, rgba(167,139,250,0.04) 0%, transparent 38%)',
          ].join(', '),
        }}
      />

      {/* ── Content — scroll-parallaxed ── */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-12 w-full"
      >
        {/* Year tag */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-14 flex items-center gap-4"
        >
          <span className="font-bebas tracking-[0.35em] text-sm" style={{ color: 'rgba(251,146,60,0.55)' }}>
            {year}
          </span>
          <span className="h-px flex-1 max-w-[44px]" style={{ background: 'rgba(251,146,60,0.18)' }} />
          <span className="text-xs text-slate-700 tracking-[0.3em] uppercase">In the saddle</span>
        </motion.div>

        {/* Counters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-14 mb-16">
          {[
            { label: 'kilometres', value: totalKm, decimals: 1, duration: 2500, accent: 'orange' as const },
            { label: 'rides', value: ytd.total_rides, decimals: 0, duration: 1800, accent: 'orange' as const },
            { label: 'metres climbed', value: ytd.total_elevation_m, decimals: 0, duration: 2200, accent: 'cyan' as const },
            { label: 'in the saddle', value: totalHours, decimals: 0, duration: 2000, accent: 'cyan' as const, suffix: `h ${String(totalMins).padStart(2, '0')}m` },
          ].map((stat, i) => (
            <motion.div key={stat.label} variants={stagger(i)} initial="hidden" animate="visible">
              <div
                className="font-bebas text-[clamp(64px,10vw,120px)] text-white leading-[0.88] tracking-tight select-none"
                style={{
                  textShadow: stat.accent === 'orange'
                    ? '0 0 120px rgba(251,146,60,0.14)'
                    : '0 0 120px rgba(34,211,238,0.09)',
                }}
              >
                <AnimatedCounter
                  value={stat.value}
                  decimals={stat.decimals}
                  duration={stat.duration}
                  suffix={stat.suffix}
                />
              </div>
              <div className="mt-3 flex items-center gap-2.5">
                <span
                  className="h-px w-6 rounded-full flex-shrink-0"
                  style={{ background: stat.accent === 'orange' ? 'rgba(251,146,60,0.6)' : 'rgba(34,211,238,0.6)' }}
                />
                <span className="stat-label">{stat.label}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Insight chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex flex-wrap items-center gap-2.5 mb-12"
        >
          {projectedKm > 0 && (
            <InsightChip color="orange">On pace for {projectedKm.toLocaleString()} km</InsightChip>
          )}
          {ytd.total_elevation_m >= 8848 && (
            <InsightChip color="violet">{everestMultiple(ytd.total_elevation_m)} Everest</InsightChip>
          )}
          {ytd.total_rides > 0 && (
            <InsightChip color="slate">{ytd.indoor_rides} indoor · {ytd.outdoor_rides} outdoor</InsightChip>
          )}
        </motion.div>

        {/* Progress track */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="border-t border-white/[0.05] pt-7"
        >
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] text-slate-700 tracking-[0.25em] uppercase">Year Progress</span>
            <span className="text-[10px] text-slate-700">{yearPct}% elapsed</span>
          </div>
          <div className="relative h-px bg-white/[0.06] rounded-full">
            <motion.div
              className="absolute inset-y-0 left-0 bg-white/[0.10] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${yearPct}%` }}
              transition={{ duration: 1.2, delay: 1.25, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: 'linear-gradient(90deg, #fb923c, rgba(251,146,60,0.28))' }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((totalKm / Math.max(projectedKm, 1)) * 100, 100)}%` }}
              transition={{ duration: 1.8, delay: 1.4, ease: 'easeOut' }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs" style={{ color: 'rgba(251,146,60,0.5)' }}>{totalKm.toFixed(0)} km ridden</span>
            <motion.div
              className="flex items-center gap-1.5"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="text-[10px] text-slate-700 tracking-[0.25em]">SCROLL</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-slate-700">
                <path d="M5 1v8M5 9L2 6M5 9l3-3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

function InsightChip({ children, color }: { children: React.ReactNode; color: 'orange' | 'violet' | 'slate' }) {
  const s = {
    orange: 'bg-orange-400/[0.07] border-orange-400/[0.16] text-orange-300',
    violet: 'bg-violet-400/[0.07] border-violet-400/[0.16] text-violet-300',
    slate: 'bg-white/[0.03] border-white/[0.07] text-slate-500',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-full border text-xs font-medium ${s[color]}`}>
      {children}
    </span>
  );
}
