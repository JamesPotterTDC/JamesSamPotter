'use client';

import { useRef, useMemo } from 'react';
import { useInView } from 'framer-motion';
import type { Activity } from '@/lib/api';
import FadeIn from './FadeIn';

interface PowerSectionProps {
  activities: Activity[];
}

interface MonthlyPower {
  month: string;
  avgWatts: number;
  rides: number;
}

function estimateFTP(activities: Activity[]): number | null {
  const withPower = activities.filter(a => a.weighted_average_watts && a.weighted_average_watts > 0);
  if (withPower.length === 0) return null;

  // Best NP from 45–75 min rides × 0.95 (AIFTP method approximation)
  const longRides = withPower.filter(a => {
    const mins = a.moving_time_s / 60;
    return mins >= 45 && mins <= 75;
  });

  if (longRides.length > 0) {
    const best = Math.max(...longRides.map(a => a.weighted_average_watts!));
    return Math.round(best * 0.95);
  }

  // Fallback: best NP × 0.90
  const best = Math.max(...withPower.map(a => a.weighted_average_watts!));
  return Math.round(best * 0.90);
}

function getMonthlyPower(activities: Activity[]): MonthlyPower[] {
  const monthMap = new Map<string, { total: number; count: number }>();
  for (const a of activities) {
    if (!a.average_watts) continue;
    const d = new Date(a.start_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthMap.get(key) || { total: 0, count: 0 };
    existing.total += a.average_watts;
    existing.count += 1;
    monthMap.set(key, existing);
  }
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([key, { total, count }]) => ({
      month: months[parseInt(key.split('-')[1]) - 1],
      avgWatts: Math.round(total / count),
      rides: count,
    }));
}

function getPowerZoneLabel(watts: number, ftp: number): string {
  const pct = watts / ftp;
  if (pct < 0.55) return 'Z1 Recovery';
  if (pct < 0.75) return 'Z2 Endurance';
  if (pct < 0.90) return 'Z3 Tempo';
  if (pct < 1.05) return 'Z4 Threshold';
  return 'Z5 VO₂Max';
}

function PowerBar({ label, watts, maxWatts, color }: { label: string; watts: number; maxWatts: number; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });
  const pct = maxWatts > 0 ? (watts / maxWatts) * 100 : 0;

  return (
    <div ref={ref} className="group">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="font-bebas text-base leading-none" style={{ color }}>{watts}W</span>
      </div>
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: inView ? `${pct}%` : '0%',
            background: color,
            transitionDelay: '150ms',
          }}
        />
      </div>
    </div>
  );
}

export default function PowerSection({ activities }: PowerSectionProps) {
  const hasPower = activities.some(a => a.average_watts || a.weighted_average_watts);
  if (!hasPower) return null;

  const ftp = useMemo(() => estimateFTP(activities), [activities]);
  const monthly = useMemo(() => getMonthlyPower(activities), [activities]);

  const poweredRides = activities.filter(a => a.average_watts);
  const avgPower = poweredRides.length > 0
    ? Math.round(poweredRides.reduce((s, a) => s + a.average_watts!, 0) / poweredRides.length)
    : 0;
  const bestRide = activities
    .filter(a => a.average_watts)
    .sort((a, b) => (b.average_watts || 0) - (a.average_watts || 0))[0];

  const maxMonthly = monthly.length > 0 ? Math.max(...monthly.map(m => m.avgWatts)) : 1;

  const trendDir = monthly.length >= 3
    ? monthly[monthly.length - 1].avgWatts > monthly[0].avgWatts ? '↑' : '↓'
    : null;

  return (
    <FadeIn>
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="flex items-baseline gap-3 mb-6">
          <h2 className="font-display font-semibold text-white text-lg">Power</h2>
          {trendDir && (
            <span className={`text-xs font-medium ${trendDir === '↑' ? 'text-emerald-400' : 'text-slate-500'}`}>
              {trendDir} trending
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* FTP estimate */}
          {ftp && (
            <div className="card p-6">
              <p className="stat-label mb-3">Est. FTP</p>
              <div className="flex items-end gap-2 mb-3">
                <span className="font-bebas text-6xl text-white leading-none">{ftp}</span>
                <span className="text-slate-500 text-sm mb-1.5">W</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Estimated from best normalised power over 45–75 min efforts. Functional Threshold Power.
              </p>
              {avgPower > 0 && ftp > 0 && (
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Avg vs FTP</span>
                    <span className="text-xs font-medium text-slate-300">{Math.round((avgPower / ftp) * 100)}%</span>
                  </div>
                  <div className="h-1 bg-white/[0.06] rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-orange-400/60 rounded-full" style={{ width: `${Math.min((avgPower / ftp) * 100, 100)}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Monthly power trend */}
          {monthly.length >= 2 && (
            <div className="card p-6 lg:col-span-1">
              <p className="stat-label mb-4">Monthly Average Power</p>
              <div className="space-y-3">
                {monthly.map(m => (
                  <PowerBar
                    key={m.month}
                    label={m.month}
                    watts={m.avgWatts}
                    maxWatts={maxMonthly}
                    color="#fb923c"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Strongest ride */}
          {bestRide && ftp && (
            <div className="card p-6">
              <p className="stat-label mb-3">Strongest Effort</p>
              <p className="font-display font-semibold text-slate-200 text-sm leading-snug mb-3 line-clamp-2">
                {bestRide.name}
              </p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="stat-label mb-1">Avg Power</p>
                  <p className="font-bebas text-3xl text-orange-400 leading-none">{bestRide.average_watts}W</p>
                </div>
                {bestRide.weighted_average_watts && (
                  <div>
                    <p className="stat-label mb-1">Norm Power</p>
                    <p className="font-bebas text-3xl text-orange-400 leading-none">{Math.round(bestRide.weighted_average_watts)}W</p>
                  </div>
                )}
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-400/[0.08] border border-orange-400/20">
                <span className="text-xs font-medium text-orange-300">
                  {getPowerZoneLabel(bestRide.average_watts!, ftp)}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>
    </FadeIn>
  );
}
