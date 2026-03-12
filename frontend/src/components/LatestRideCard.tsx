'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { formatDistance, formatDuration, formatElevation, formatPace, formatPower, formatDate, isIndoor as checkIndoor } from '@/lib/utils';
import type { ActivityDetail, Activity } from '@/lib/api';

const ActivityMapDark = dynamic(() => import('./ActivityMapDark'), { ssr: false });

interface LatestRideCardProps {
  activity: Activity | ActivityDetail;
  detail: ActivityDetail | null;
}

export default function LatestRideCard({ activity, detail }: LatestRideCardProps) {
  const isIndoor = checkIndoor(activity.trainer, activity.sport_type);
  const hasMap = !!detail?.map_polyline;

  return (
    <section className="max-w-7xl mx-auto px-6 pb-16">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display font-semibold text-white text-lg">Latest Ride</h2>
        <Link
          href={`/activities/${activity.id}`}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors tracking-wide"
        >
          Full detail →
        </Link>
      </div>

      <Link href={`/activities/${activity.id}`} className="group block">
        <div
          className={`relative rounded-2xl overflow-hidden border transition-all duration-300 group-hover:border-white/[0.15] ${
            isIndoor
              ? 'border-white/[0.08] bg-white/[0.02]'
              : 'border-white/[0.08] bg-white/[0.02]'
          }`}
          style={{ minHeight: 320 }}
        >
          {hasMap ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 h-80 lg:h-96">
              {/* Map — takes 2/3 */}
              <div className="lg:col-span-2 relative h-64 lg:h-full">
                <ActivityMapDark polyline={detail!.map_polyline} indoor={isIndoor} />
                {/* Gradient overlay on right edge for desktop */}
                <div className="hidden lg:block absolute right-0 inset-y-0 w-24 bg-gradient-to-l from-[#07090f] to-transparent pointer-events-none z-10" />
              </div>
              {/* Stats — 1/3 */}
              <RideStats activity={detail || activity} isIndoor={isIndoor} />
            </div>
          ) : (
            /* Indoor treatment */
            <div className="grid grid-cols-1 lg:grid-cols-3 h-80 lg:h-96">
              <div className="lg:col-span-2 relative overflow-hidden flex items-center justify-center">
                <IndoorVisual />
              </div>
              <RideStats activity={detail || activity} isIndoor={isIndoor} />
            </div>
          )}
        </div>
      </Link>
    </section>
  );
}

function RideStats({ activity, isIndoor }: { activity: Activity | ActivityDetail; isIndoor: boolean }) {
  const accent = isIndoor ? 'text-cyan-400' : 'text-orange-400';
  const accentBg = isIndoor ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20' : 'bg-orange-400/10 text-orange-400 border-orange-400/20';

  return (
    <div className="p-6 lg:p-8 flex flex-col justify-between bg-white/[0.02] lg:bg-transparent">
      <div>
        {/* Type badge */}
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border mb-4 ${accentBg}`}>
          {isIndoor ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><circle cx="5" cy="5" r="4"/></svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 1.5L8.5 8.5h-7L5 1.5z"/></svg>
          )}
          {isIndoor ? 'Indoor' : 'Outdoor'}
        </span>

        {/* Ride name */}
        <h3 className="font-display font-semibold text-xl text-white leading-tight mb-1">
          {activity.name}
        </h3>
        <p className="text-xs text-slate-600 mb-6">{formatDate(activity.start_date)}</p>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Distance" value={formatDistance(activity.distance_m)} accent={accent} />
          <Stat label="Time" value={formatDuration(activity.moving_time_s)} accent={accent} />
          <Stat label="Elevation" value={formatElevation(activity.total_elevation_gain_m)} accent={accent} />
          <Stat label="Avg Speed" value={formatPace(activity.average_speed_mps)} accent={accent} />
          {activity.average_watts && (
            <Stat label="Avg Power" value={formatPower(activity.average_watts)} accent={accent} />
          )}
          {activity.average_heartrate && (
            <Stat label="Avg HR" value={`${Math.round(activity.average_heartrate)} bpm`} accent={accent} />
          )}
        </div>
      </div>

      {/* View on Strava link */}
      <div className="mt-6">
        <a
          href={`https://www.strava.com/activities/${activity.strava_id}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-orange-400 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
          </svg>
          Strava
        </a>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <p className="stat-label mb-1">{label}</p>
      <p className={`font-bebas text-2xl ${accent} leading-none`}>{value}</p>
    </div>
  );
}

function IndoorVisual() {
  return (
    <div
      className="w-full h-full flex items-center justify-center relative"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(34,211,238,0.08) 0%, transparent 70%)',
      }}
    >
      {/* Cycling icon — abstract */}
      <svg width="120" height="80" viewBox="0 0 120 80" fill="none" className="opacity-20">
        <circle cx="25" cy="55" r="18" stroke="#22d3ee" strokeWidth="2" />
        <circle cx="95" cy="55" r="18" stroke="#22d3ee" strokeWidth="2" />
        <circle cx="25" cy="55" r="4" fill="#22d3ee" opacity="0.5" />
        <circle cx="95" cy="55" r="4" fill="#22d3ee" opacity="0.5" />
        <path d="M25 55 L55 25 L75 40 L95 55" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M55 25 L60 10" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
        <path d="M52 10 L68 10" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
        <path d="M75 40 L70 30 L85 28" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Animated rings */}
      {[40, 70, 100].map((r, i) => (
        <div
          key={r}
          className="absolute rounded-full border border-cyan-400/10 animate-pulse-slow"
          style={{
            width: r * 2,
            height: r * 2,
            animationDelay: `${i * 0.8}s`,
          }}
        />
      ))}

      <span className="absolute bottom-6 left-6 text-xs text-slate-700 tracking-widest uppercase">
        Indoor · Zwift
      </span>
    </div>
  );
}
