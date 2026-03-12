'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { Summary } from '@/lib/api';

interface YearNarrativeProps {
  summary: Summary;
}

function buildSentence(summary: Summary): { headline: string; subline: string } {
  const ytd = summary.year_to_date;
  const km = Math.round(ytd.total_distance_m / 1000);
  const rides = ytd.total_rides;
  const now = new Date();
  const year = now.getFullYear();
  const dayOfYear = Math.floor((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000) || 1;
  const projectedKm = Math.round((km / dayOfYear) * 365);

  const headline = `${km.toLocaleString()} km. ${rides} rides.`;

  let character = 'Building the base.';
  if (ytd.indoor_rides > ytd.outdoor_rides * 2) character = 'Deep in the winter block.';
  else if (ytd.outdoor_rides > ytd.indoor_rides * 2) character = 'Chasing open roads.';
  else if (rides > 50) character = 'Consistent. Relentless.';
  else if (rides === 0) character = 'The season starts now.';

  const subline = `${character} On pace for ${projectedKm.toLocaleString()} km by year end.`;

  return { headline, subline };
}

export default function YearNarrative({ summary }: YearNarrativeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const { headline, subline } = buildSentence(summary);

  return (
    <div ref={ref} className="max-w-7xl mx-auto px-6 pb-20">
      <div className="relative py-12 overflow-hidden">
        {/* Subtle rule */}
        <motion.div
          className="absolute left-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, rgba(251,146,60,0.3), transparent)' }}
          initial={{ width: 0 }}
          animate={inView ? { width: '40%' } : {}}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />

        <motion.p
          className="font-bebas text-[clamp(36px,6vw,80px)] text-white leading-[0.92] tracking-tight mb-4"
          initial={{ opacity: 0, y: 32 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          {headline.split(' ').map((word, i) => (
            <span key={i}>
              {/^\d/.test(word) ? (
                <span style={{ color: '#fb923c' }}>{word} </span>
              ) : (
                <span>{word} </span>
              )}
            </span>
          ))}
        </motion.p>

        <motion.p
          className="font-display text-slate-500 text-lg font-normal max-w-xl leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.18, ease: 'easeOut' }}
        >
          {subline}
        </motion.p>

        {/* Bottom rule */}
        <motion.div
          className="absolute right-0 bottom-0 h-px"
          style={{ background: 'linear-gradient(270deg, rgba(34,211,238,0.2), transparent)' }}
          initial={{ width: 0 }}
          animate={inView ? { width: '30%' } : {}}
          transition={{ duration: 1.0, delay: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
