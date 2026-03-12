import Nav from '@/components/Nav';
import HeroSection from '@/components/HeroSection';
import YearNarrative from '@/components/YearNarrative';
import LatestRideCard from '@/components/LatestRideCard';
import WeeklyChart from '@/components/WeeklyChart';
import GuinnessCard from '@/components/GuinnessCard';
import EverestMountain from '@/components/EverestMountain';
import WheelSplit from '@/components/WheelSplit';
import YearHeatmap from '@/components/YearHeatmap';
import PerformanceSection from '@/components/PerformanceSection';
import FadeIn from '@/components/FadeIn';
import Link from 'next/link';
import {
  fetchSummary,
  fetchActivities,
  fetchActivity,
  fetchWeeklyTrends,
} from '@/lib/api';
import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatDateShort,
  formatPower,
  isIndoor,
} from '@/lib/utils';

export const revalidate = 0;

export default async function HomePage() {
  let summary, activities, weeklyTrends, latestDetail, yearActivities;
  const currentYear = new Date().getFullYear();

  try {
    [summary, activities, weeklyTrends, yearActivities] = await Promise.all([
      fetchSummary(),
      fetchActivities({ page: 1 }),
      fetchWeeklyTrends(16),
      fetchActivities({ year: currentYear, page_size: 100 }),
    ]);

    const latestRide = activities.results[0];
    if (latestRide) {
      try { latestDetail = await fetchActivity(latestRide.id); } catch {}
    }
  } catch {
    return (
      <div className="min-h-screen bg-void flex flex-col items-center justify-center text-center px-6">
        <p className="text-slate-600 text-xs tracking-widest uppercase mb-8">Cycling Dashboard</p>
        <h1 className="font-display font-semibold text-2xl text-white mb-3">Connect Your Strava Account</h1>
        <p className="text-slate-500 text-sm mb-8 max-w-sm">Link Strava to start tracking your rides, power, and progress.</p>
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL}/strava/oauth/start/`}
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
          </svg>
          Connect to Strava
        </a>
      </div>
    );
  }

  const ytd = summary.year_to_date;
  const week = summary.this_week;
  const month = summary.this_month;
  const recentRides = activities.results.slice(0, 6);

  return (
    <div className="min-h-screen bg-void">
      <Nav />

      {/* HERO */}
      <HeroSection summary={summary} />

      {/* YEAR NARRATIVE */}
      <YearNarrative summary={summary} />

      {/* LATEST RIDE */}
      {activities.results[0] && (
        <FadeIn>
          <LatestRideCard activity={latestDetail || activities.results[0]} detail={latestDetail ?? null} />
        </FadeIn>
      )}

      {/* THIS WEEK */}
      <FadeIn>
        <section className="max-w-7xl mx-auto px-6 pb-16">
          <h2 className="font-display font-semibold text-white text-lg mb-5">This Week</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <WeekStatCard label="Distance" value={formatDistance(week.total_distance_m)} color="orange" />
            <WeekStatCard label="Rides" value={String(week.total_rides)} color="orange" />
            <WeekStatCard label="Indoor" value={formatDistance(week.indoor_distance_m)} color="cyan" />
            <WeekStatCard label="Outdoor" value={formatDistance(week.outdoor_distance_m)} color="orange" />
          </div>
        </section>
      </FadeIn>

      {/* WEEKLY CHART */}
      {weeklyTrends.length > 0 && (
        <FadeIn delay={0.1}>
          <section className="max-w-7xl mx-auto px-6 pb-16">
            <WeeklyChart data={weeklyTrends} />
          </section>
        </FadeIn>
      )}

      {/* YEAR HEATMAP */}
      {yearActivities && yearActivities.results.length > 0 && (
        <FadeIn delay={0.1}>
          <section className="max-w-7xl mx-auto px-6 pb-16 relative">
            <YearHeatmap activities={yearActivities.results} year={currentYear} />
          </section>
        </FadeIn>
      )}

      {/* PERFORMANCE */}
      {yearActivities && <PerformanceSection activities={yearActivities.results} stravaFtp={summary.athlete.ftp ?? null} />}

      {/* BY THE NUMBERS */}
      <FadeIn delay={0.1}>
        <section className="max-w-7xl mx-auto px-6 pb-16">
          <h2 className="font-display font-semibold text-white text-lg mb-5">By the Numbers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <GuinnessCard totalKj={ytd.total_kj} monthKj={month.total_kj} totalRides={ytd.total_rides} />
            <EverestMountain elevationM={ytd.total_elevation_m} />
            <WheelSplit
              outdoorRides={ytd.outdoor_rides}
              indoorRides={ytd.indoor_rides}
              outdoorDistM={ytd.outdoor_distance_m}
              indoorDistM={ytd.indoor_distance_m}
              totalRides={ytd.total_rides}
            />
          </div>
        </section>
      </FadeIn>

      {/* RECENT RIDES */}
      <FadeIn delay={0.1}>
        <section className="max-w-7xl mx-auto px-6 pb-16">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-semibold text-white text-lg">Recent Rides</h2>
            <Link href="/activities" className="text-xs text-slate-500 hover:text-slate-300 transition-colors tracking-wide">
              All rides →
            </Link>
          </div>
          <div className="space-y-2">
            {recentRides.map((ride) => (
              <Link
                key={ride.id}
                href={`/activities/${ride.id}`}
                className="group flex items-center gap-4 card card-hover p-4 rounded-xl"
              >
                <div
                  className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                    isIndoor(ride.trainer, ride.sport_type) ? 'bg-cyan-400' : 'bg-orange-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200 text-sm truncate group-hover:text-white transition-colors">
                    {ride.name}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">{formatDateShort(ride.start_date)}</p>
                </div>
                <div className="hidden sm:flex items-center gap-6 text-right">
                  <div>
                    <p className={`font-bebas text-lg leading-none ${isIndoor(ride.trainer, ride.sport_type) ? 'text-cyan-400' : 'text-orange-400'}`}>
                      {formatDistance(ride.distance_m)}
                    </p>
                    <p className="text-xs text-slate-600">dist</p>
                  </div>
                  <div>
                    <p className="font-bebas text-lg text-slate-400 leading-none">{formatDuration(ride.moving_time_s)}</p>
                    <p className="text-xs text-slate-600">time</p>
                  </div>
                  {ride.average_watts && (
                    <div>
                      <p className="font-bebas text-lg text-slate-400 leading-none">{formatPower(ride.average_watts)}</p>
                      <p className="text-xs text-slate-600">power</p>
                    </div>
                  )}
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-slate-700 group-hover:text-slate-400 transition-colors flex-shrink-0">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            ))}
          </div>
        </section>
      </FadeIn>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-700 tracking-widest">
            JAMES POTTER · {new Date().getFullYear()}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-700 tracking-widest">POWERED BY</span>
            <a
              href="https://www.strava.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-orange-400 transition-colors tracking-widest"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
              </svg>
              STRAVA
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function WeekStatCard({ label, value, color }: { label: string; value: string; color: 'orange' | 'cyan' }) {
  const accent = color === 'orange' ? 'text-orange-400' : 'text-cyan-400';
  return (
    <div className="card p-4">
      <p className="stat-label mb-2">{label}</p>
      <p className={`font-bebas text-3xl leading-none ${accent}`}>{value}</p>
    </div>
  );
}
