import Nav from '@/components/Nav';
import FadeIn from '@/components/FadeIn';
import Link from 'next/link';
import { fetchActivities } from '@/lib/api';
import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatDateShort,
  formatPower,
  isIndoor as checkIndoor,
} from '@/lib/utils';

interface SearchParams {
  page?: string;
  trainer?: string;
}

export const revalidate = 0;

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const page = parseInt(searchParams.page || '1');
  const trainer =
    searchParams.trainer === 'true'
      ? true
      : searchParams.trainer === 'false'
      ? false
      : undefined;

  const data = await fetchActivities({ page, trainer });

  return (
    <div className="min-h-screen bg-void">
      <Nav />

      <main className="max-w-7xl mx-auto px-6 pt-28 pb-24">
        {/* Header */}
        <FadeIn>
          <div className="mb-10">
            <p className="stat-label mb-2">Performance Log</p>
            <h1 className="font-bebas text-6xl sm:text-7xl text-white tracking-tight leading-none">
              All Rides
            </h1>
            <p className="text-slate-600 text-sm mt-3">{data.count} total activities</p>
          </div>
        </FadeIn>

        {/* Filter chips */}
        <FadeIn delay={0.1}>
          <div className="flex items-center gap-2 mb-8">
            <FilterChip href="/activities" active={trainer === undefined} label="All" />
            <FilterChip href="/activities?trainer=false" active={trainer === false} label="Outdoor" color="orange" />
            <FilterChip href="/activities?trainer=true" active={trainer === true} label="Indoor" color="cyan" />
          </div>
        </FadeIn>

        {/* Activity list */}
        <FadeIn delay={0.15}>
          <div className="space-y-2">
            {data.results.map((activity, i) => {
              const isIndoor = checkIndoor(activity.trainer, activity.sport_type);
              const accent = isIndoor ? 'text-cyan-400' : 'text-orange-400';
              const bar = isIndoor ? 'bg-cyan-400' : 'bg-orange-400';

              return (
                <Link
                  key={activity.id}
                  href={`/activities/${activity.id}`}
                  className="group flex items-center gap-4 card card-hover p-5 rounded-xl"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  {/* Color bar */}
                  <div className={`w-0.5 h-10 rounded-full flex-shrink-0 ${bar}`} />

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-slate-200 group-hover:text-white transition-colors truncate">
                      {activity.name}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {formatDateShort(activity.start_date)} ·{' '}
                      <span className={isIndoor ? 'text-cyan-600' : 'text-orange-600'}>
                        {isIndoor ? 'Indoor' : 'Outdoor'}
                      </span>
                    </p>
                  </div>

                  {/* Stats row */}
                  <div className="hidden md:flex items-center gap-8">
                    <StatItem label="Dist" value={formatDistance(activity.distance_m)} accent={accent} />
                    <StatItem label="Time" value={formatDuration(activity.moving_time_s)} />
                    <StatItem label="Elev" value={formatElevation(activity.total_elevation_gain_m)} />
                    {activity.average_watts && (
                      <StatItem label="Power" value={formatPower(activity.average_watts)} />
                    )}
                    {activity.average_heartrate && (
                      <StatItem label="HR" value={`${Math.round(activity.average_heartrate)}bpm`} />
                    )}
                  </div>

                  {/* Mobile compact */}
                  <div className="flex md:hidden flex-col items-end">
                    <p className={`font-bebas text-xl leading-none ${accent}`}>{formatDistance(activity.distance_m)}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{formatDuration(activity.moving_time_s)}</p>
                  </div>

                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-slate-700 group-hover:text-slate-400 transition-colors flex-shrink-0">
                    <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              );
            })}
          </div>
        </FadeIn>

        {/* Pagination */}
        {(data.previous || data.next) && (
          <div className="mt-10 flex justify-center items-center gap-3">
            {data.previous ? (
              <Link
                href={`/activities?page=${page - 1}${trainer !== undefined ? `&trainer=${trainer}` : ''}`}
                className="card card-hover px-5 py-2.5 text-sm font-medium text-slate-400 rounded-xl"
              >
                ← Previous
              </Link>
            ) : null}
            <span className="text-xs text-slate-600 px-3">Page {page}</span>
            {data.next ? (
              <Link
                href={`/activities?page=${page + 1}${trainer !== undefined ? `&trainer=${trainer}` : ''}`}
                className="card card-hover px-5 py-2.5 text-sm font-medium text-slate-400 rounded-xl"
              >
                Next →
              </Link>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
  color,
}: {
  href: string;
  active: boolean;
  label: string;
  color?: 'orange' | 'cyan';
}) {
  const activeStyles =
    color === 'orange'
      ? 'bg-orange-400/15 border-orange-400/30 text-orange-300'
      : color === 'cyan'
      ? 'bg-cyan-400/15 border-cyan-400/30 text-cyan-300'
      : 'bg-white/[0.08] border-white/[0.12] text-white';

  return (
    <Link
      href={href}
      className={`px-4 py-1.5 rounded-full border text-xs font-medium tracking-wide transition-all ${
        active ? activeStyles : 'border-white/[0.07] text-slate-600 hover:text-slate-400 hover:border-white/[0.12]'
      }`}
    >
      {label}
    </Link>
  );
}

function StatItem({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="text-right">
      <p className={`font-bebas text-lg leading-none ${accent ?? 'text-slate-400'}`}>{value}</p>
      <p className="text-xs text-slate-600 mt-0.5">{label}</p>
    </div>
  );
}
