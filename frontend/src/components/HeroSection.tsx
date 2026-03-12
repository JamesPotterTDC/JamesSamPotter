'use client';

import { motion } from 'framer-motion';
import AnimatedCounter from './AnimatedCounter';
import type { Summary } from '@/lib/api';
import { formatDurationLong } from '@/lib/utils';

interface HeroSectionProps {
  summary: Summary;
}

const statVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 0.2 + i * 0.12, ease: 'easeOut' as const },
  }),
};

export default function HeroSection({ summary }: HeroSectionProps) {
  const ytd = summary.year_to_date;
  const totalHours = Math.floor(ytd.total_time_s / 3600);
  const totalMins = Math.floor((ytd.total_time_s % 3600) / 60);
  const year = new Date().getFullYear();

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden noise">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 100%, rgba(251,146,60,0.04) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16 w-full">
        {/* Year label */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mb-10"
        >
          <span className="font-bebas text-sm tracking-[0.3em] text-slate-600">
            {year} IN THE SADDLE
          </span>
        </motion.div>

        {/* Main stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10 mb-16">
          {/* Distance */}
          <motion.div custom={0} variants={statVariants} initial="hidden" animate="visible">
            <div className="font-bebas text-7xl sm:text-8xl lg:text-9xl text-white leading-none tracking-tight">
              <AnimatedCounter value={ytd.total_distance_m / 1000} decimals={1} duration={2400} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="h-px w-8 bg-orange-400 rounded-full" />
              <span className="stat-label">kilometres</span>
            </div>
          </motion.div>

          {/* Rides */}
          <motion.div custom={1} variants={statVariants} initial="hidden" animate="visible">
            <div className="font-bebas text-7xl sm:text-8xl lg:text-9xl text-white leading-none tracking-tight">
              <AnimatedCounter value={ytd.total_rides} duration={1800} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="h-px w-8 bg-orange-400 rounded-full" />
              <span className="stat-label">rides</span>
            </div>
          </motion.div>

          {/* Elevation */}
          <motion.div custom={2} variants={statVariants} initial="hidden" animate="visible">
            <div className="font-bebas text-7xl sm:text-8xl lg:text-9xl text-white leading-none tracking-tight">
              <AnimatedCounter
                value={ytd.total_elevation_m}
                duration={2200}
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="h-px w-8 bg-cyan-400 rounded-full" />
              <span className="stat-label">metres climbed</span>
            </div>
          </motion.div>

          {/* Time */}
          <motion.div custom={3} variants={statVariants} initial="hidden" animate="visible">
            <div className="font-bebas text-7xl sm:text-8xl lg:text-9xl text-white leading-none tracking-tight">
              <AnimatedCounter value={totalHours} duration={2000} suffix="h" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="h-px w-8 bg-cyan-400 rounded-full" />
              <span className="stat-label">{totalMins}m in the saddle</span>
            </div>
          </motion.div>
        </div>

        {/* Athlete name + subtitle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-t border-white/[0.07] pt-8"
        >
          <div>
            <p className="text-slate-400 text-sm font-medium tracking-wide">
              {summary.athlete.name}
            </p>
            <p className="text-slate-600 text-xs mt-1">
              {ytd.indoor_rides} indoor · {ytd.outdoor_rides} outdoor
            </p>
          </div>

          <motion.div
            className="flex items-center gap-2"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-xs text-slate-700 tracking-wider">SCROLL</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-slate-700">
              <path d="M7 1v12M7 13l-4-4M7 13l4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
