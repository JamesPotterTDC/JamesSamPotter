import Nav from '@/components/Nav';
import FadeIn from '@/components/FadeIn';
import ElevationProfile from '@/components/ElevationProfile';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { fetchActivity } from '@/lib/api';
import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  formatPower,
  formatHeartrate,
  formatEnergy,
  formatDateTime,
  guinnessPints,
  everestMultiple,
  isIndoor as checkIndoor,
} from '@/lib/utils';

const ActivityMapDark = dynamic(() => import('@/components/ActivityMapDark'), { ssr: false });

export const revalidate = 0;

export default async function ActivityDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const activity = await fetchActivity(parseInt(params.id));
  const isIndoor = checkIndoor(activity.trainer, activity.sport_type);
  const hasMap = !isIndoor && !!activity.map_polyline;
  const pints = guinnessPints(activity.kilojoules);
  const accentClass = isIndoor ? 'text-cyan-400' : 'text-orange-400';
  const accentBg = isIndoor
    ? 'bg-cyan-400/10 border-cyan-400/20 text-cyan-400'
    : 'bg-orange-400/10 border-orange-400/20 text-orange-400';

  return (
    <div className="min-h-screen bg-void">
      <Nav />

      <main className="max-w-7xl mx-auto px-6 pt-28 pb-24">
        {/* Back */}
        <FadeIn>
          <Link
            href="/activities"
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors mb-8 tracking-wide"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M10 6H2M2 6l4-4M2 6l4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            All activities
          </Link>
        </FadeIn>

        {/* Hero header */}
        <FadeIn delay={0.05}>
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${accentBg}`}>
                {isIndoor ? '⚡ Indoor' : '↗ Outdoor'}
              </span>
              <span className="text-xs text-slate-600">{formatDateTime(activity.start_date)}</span>
            </div>
            <h1 className="font-bebas text-5xl sm:text-6xl lg:text-7xl text-white tracking-tight leading-none mb-2">
              {activity.name}
            </h1>
            <a
              href={`https://www.strava.com/activities/${activity.strava_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-orange-400 transition-colors mt-3"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
              </svg>
              View on Strava
            </a>
          </div>
        </FadeIn>

        {/* Primary stats */}
        <FadeIn delay={0.1}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <BigStatCard label="Distance" value={formatDistance(activity.distance_m)} accent={accentClass} large />
            <BigStatCard label="Moving Time" value={formatDuration(activity.moving_time_s)} accent={accentClass} large />
            <BigStatCard label="Elevation" value={formatElevation(activity.total_elevation_gain_m)} accent={accentClass} large />
            <BigStatCard label="Avg Speed" value={formatPace(activity.average_speed_mps)} accent={accentClass} large />
          </div>
        </FadeIn>

        {/* Map or indoor visual */}
        <FadeIn delay={0.15}>
          <div className={`relative rounded-2xl overflow-hidden mb-8 ${hasMap ? 'h-[400px] sm:h-[500px]' : ''}`}
            style={!hasMap ? { background: 'radial-gradient(ellipse at center, rgba(34,211,238,0.06) 0%, transparent 70%)' } : {}}>
            {hasMap ? (
              <>
                <ActivityMapDark polyline={activity.map_polyline} revealAnimation className="w-full h-full" />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-void to-transparent pointer-events-none" />
              </>
            ) : (
              <div className="card p-10 flex flex-col items-center justify-center text-center">
                <div className="mb-4">
                  <svg width="64" height="40" viewBox="0 0 64 40" fill="none" className="opacity-30">
                    <circle cx="14" cy="28" r="10" stroke="#22d3ee" strokeWidth="1.5"/>
                    <circle cx="50" cy="28" r="10" stroke="#22d3ee" strokeWidth="1.5"/>
                    <path d="M14 28 L28 12 L38 20 L50 28" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M28 12 L30 5" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M26 5 L34 5" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-slate-500 text-sm font-medium">Indoor ride — no GPS route</p>
                <p className="text-slate-700 text-xs mt-1">Powered through on the trainer</p>
              </div>
            )}
          </div>
        </FadeIn>

        {/* Elevation profile */}
        {activity.streams?.altitude && activity.streams.altitude.length > 2 && (
          <FadeIn delay={0.2}>
            <div className="card p-6 mb-8">
              <p className="stat-label mb-4">Elevation Profile</p>
              <ElevationProfile
                altitudes={activity.streams.altitude}
                color={isIndoor ? '#22d3ee' : '#fb923c'}
              />
            </div>
          </FadeIn>
        )}

        {/* Secondary stats grid */}
        <FadeIn delay={0.2}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
            {activity.average_watts && (
              <SmallStatCard label="Avg Power" value={formatPower(activity.average_watts)} />
            )}
            {activity.weighted_average_watts && (
              <SmallStatCard label="Norm Power" value={formatPower(activity.weighted_average_watts)} />
            )}
            {activity.average_heartrate && (
              <SmallStatCard label="Avg HR" value={formatHeartrate(activity.average_heartrate)} />
            )}
            {activity.max_heartrate && (
              <SmallStatCard label="Max HR" value={`${activity.max_heartrate} bpm`} />
            )}
            {activity.average_cadence && (
              <SmallStatCard label="Avg Cadence" value={`${Math.round(activity.average_cadence)} rpm`} />
            )}
            {activity.max_speed_mps && (
              <SmallStatCard label="Max Speed" value={formatPace(activity.max_speed_mps)} />
            )}
            {activity.kilojoules && (
              <SmallStatCard label="Energy" value={formatEnergy(activity.kilojoules)} />
            )}
            <SmallStatCard label="Elapsed" value={formatDuration(activity.elapsed_time_s)} />
          </div>
        </FadeIn>

        {/* Fun callouts */}
        <FadeIn delay={0.25}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pints > 0 && (
              <div className="card p-5 flex items-center gap-4">
                <span className="text-3xl">🍺</span>
                <div>
                  <p className="font-bebas text-2xl text-white leading-none">{pints} pints</p>
                  <p className="text-xs text-slate-500 mt-0.5">of Guinness earned this ride</p>
                </div>
              </div>
            )}
            {activity.total_elevation_gain_m && activity.total_elevation_gain_m > 100 && (
              <div className="card p-5 flex items-center gap-4">
                <span className="text-3xl">⛰️</span>
                <div>
                  <p className="font-bebas text-2xl text-white leading-none">
                    {everestMultiple(activity.total_elevation_gain_m)} Everest
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatElevation(activity.total_elevation_gain_m)} gained this ride
                  </p>
                </div>
              </div>
            )}
          </div>
        </FadeIn>
      </main>
    </div>
  );
}

function BigStatCard({
  label,
  value,
  accent,
  large,
}: {
  label: string;
  value: string;
  accent: string;
  large?: boolean;
}) {
  return (
    <div className="card p-5">
      <p className="stat-label mb-2">{label}</p>
      <p className={`font-bebas leading-none ${large ? 'text-3xl sm:text-4xl' : 'text-2xl'} ${accent}`}>
        {value}
      </p>
    </div>
  );
}

function SmallStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="stat-label mb-1.5">{label}</p>
      <p className="font-bebas text-2xl text-slate-300 leading-none">{value}</p>
    </div>
  );
}
