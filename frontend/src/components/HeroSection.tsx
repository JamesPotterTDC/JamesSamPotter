'use client';

import { motion, useReducedMotion } from 'framer-motion';
import AnimatedCounter from './AnimatedCounter';
import type { Summary } from '@/lib/api';
import { everestMultiple } from '@/lib/utils';

interface HeroSectionProps {
  summary: Summary;
}

export default function HeroSection({ summary }: HeroSectionProps) {
  const shouldReduce = useReducedMotion();
  const ytd = summary.year_to_date;
  const year = new Date().getFullYear();

  // Projected year-end total
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000) || 1;
  const totalKm = ytd.total_distance_m / 1000;
  const projectedKm = Math.round((totalKm / dayOfYear) * 365);
  const yearPct = Math.round((dayOfYear / 365) * 100);
  const paceKmPct = totalKm > 0 ? Math.round((totalKm / projectedKm) * 100) : 0;
  const isAhead = totalKm >= (projectedKm * (dayOfYear / 365)) * 0.9;

  const totalHours = Math.floor(ytd.total_time_s / 3600);
  const totalMins = Math.floor((ytd.total_time_s % 3600) / 60);

  const stagger = (i: number) => ({
    hidden: { opacity: 0, y: shouldReduce ? 0 : 36 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.75, delay: 0.15 + i * 0.13, ease: 'easeOut' as const },
    },
  });

  return (
    <section className="relative min-h-[95vh] flex flex-col justify-center overflow-hidden">
      {/* Layered background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            'radial-gradient(ellipse at 12% 55%, rgba(251,146,60,0.09) 0%, transparent 52%)',
            'radial-gradient(ellipse at 88% 18%, rgba(34,211,238,0.06) 0%, transparent 48%)',
            'radial-gradient(ellipse at 55% 90%, rgba(167,139,250,0.04) 0%, transparent 40%)',
          ].join(', '),
        }}
      />

      {/* Subtle animated gradient pulse */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: 'radial-gradient(ellipse at 30% 50%, rgba(251,146,60,0.04) 0%, transparent 50%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-12 w-full">
        {/* Year label */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3">
            <span
              className="font-bebas tracking-[0.3em] text-sm"
              style={{ color: 'rgba(251,146,60,0.6)' }}
            >
              {year}
            </span>
            <span className="h-px flex-1 max-w-[40px]" style={{ background: 'rgba(251,146,60,0.2)' }} />
            <span className="text-xs text-slate-700 tracking-widest uppercase">In the saddle</span>
          </div>
        </motion.div>

        {/* Main counters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12 mb-14">
          {[
            {
              label: 'kilometres',
              accent: 'orange',
              element: <AnimatedCounter value={totalKm} decimals={1} duration={2500} />,
            },
            {
              label: 'rides',
              accent: 'orange',
              element: <AnimatedCounter value={ytd.total_rides} duration={1800} />,
            },
            {
              label: 'metres climbed',
              accent: 'cyan',
              element: <AnimatedCounter value={ytd.total_elevation_m} duration={2200} />,
            },
            {
              label: 'in the saddle',
              accent: 'cyan',
              element: <AnimatedCounter value={totalHours} duration={2000} suffix={`h ${String(totalMins).padStart(2,'0')}m`} />,
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              variants={stagger(i)}
              initial="hidden"
              animate="visible"
            >
              <div
                className="font-bebas text-[clamp(64px,10vw,112px)] text-white leading-none tracking-tight"
                style={{
                  textShadow:
                    stat.accent === 'orange'
                      ? '0 0 80px rgba(251,146,60,0.12)'
                      : '0 0 80px rgba(34,211,238,0.08)',
                }}
              >
                {stat.element}
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <span
                  className="h-px w-8 rounded-full"
                  style={{
                    background: stat.accent === 'orange'
                      ? 'rgba(251,146,60,0.7)'
                      : 'rgba(34,211,238,0.7)',
                  }}
                />
                <span className="stat-label">{stat.label}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Insight strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.85 }}
          className="flex flex-wrap items-center gap-3 mb-10"
        >
          {projectedKm > 0 && (
            <InsightChip color="orange">
              📈 On pace for {projectedKm.toLocaleString()} km by year end
            </InsightChip>
          )}
          {ytd.total_elevation_m >= 8848 && (
            <InsightChip color="violet">
              ⛰️ {everestMultiple(ytd.total_elevation_m)} Everest this year
            </InsightChip>
          )}
          {ytd.total_rides > 0 && (
            <InsightChip color="slate">
              {ytd.indoor_rides} indoor · {ytd.outdoor_rides} outdoor
            </InsightChip>
          )}
        </motion.div>

        {/* Year progress bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="border-t border-white/[0.06] pt-7"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-700">Year progress</span>
            <span className="text-xs text-slate-700">{yearPct}% elapsed</span>
          </div>
          <div className="relative h-px bg-white/[0.06] rounded-full overflow-visible">
            {/* Year elapsed marker */}
            <motion.div
              className="absolute top-0 left-0 h-full bg-white/[0.12] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${yearPct}%` }}
              transition={{ duration: 1.2, delay: 1.3, ease: 'easeOut' }}
            />
            {/* KM progress marker */}
            <motion.div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, rgba(251,146,60,0.8), rgba(251,146,60,0.4))' }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((totalKm / projectedKm) * 100, 100)}%` }}
              transition={{ duration: 1.6, delay: 1.4, ease: 'easeOut' }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs" style={{ color: 'rgba(251,146,60,0.6)' }}>
              {totalKm.toFixed(0)} km ridden
            </span>
            <motion.div
              className="flex items-center gap-1.5"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="text-xs text-slate-700 tracking-wider">SCROLL</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-slate-700">
                <path d="M6 1v10M6 11l-3.5-3.5M6 11l3.5-3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function InsightChip({ children, color }: { children: React.ReactNode; color: 'orange' | 'cyan' | 'violet' | 'slate' }) {
  const styles = {
    orange: 'bg-orange-400/[0.08] border-orange-400/20 text-orange-300',
    cyan: 'bg-cyan-400/[0.08] border-cyan-400/20 text-cyan-300',
    violet: 'bg-violet-400/[0.08] border-violet-400/20 text-violet-300',
    slate: 'bg-white/[0.04] border-white/[0.08] text-slate-500',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium ${styles[color]}`}>
      {children}
    </span>
  );
}
