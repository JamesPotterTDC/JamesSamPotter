'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
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
import BikeCard from '@/components/BikeCard';
import FadeIn from '@/components/FadeIn';
import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatDateShort,
  formatPower,
  isIndoor,
} from '@/lib/utils';
import type { Summary, Activity, ActivityDetail, WeeklyData } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

function WeekStatCard({ label, value, color }: { label: string; value: string; color: 'orange' | 'cyan' }) {
  const accent = color === 'orange' ? 'text-orange-400' : 'text-cyan-400';
  return (
    <div className="card p-4">
      <p className="stat-label mb-2">{label}</p>
      <p className={`font-bebas text-3xl leading-none ${accent}`}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading, fetchWithAuth, user } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [activities, setActivities] = useState<{ results: Activity[]; count: number } | null>(null);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyData[]>([]);
  const [yearActivities, setYearActivities] = useState<{ results: Activity[] } | null>(null);
  const [latestDetail, setLatestDetail] = useState<ActivityDetail | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(false);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const load = async () => {
      setDataLoading(true);
      setDataError(false);
      try {
        const [sumRes, actRes, weekRes, yearRes] = await Promise.all([
          fetchWithAuth(`${API_URL}/summary/`),
          fetchWithAuth(`${API_URL}/activities/?page=1`),
          fetchWithAuth(`${API_URL}/weekly-trends/?weeks=16`),
          fetchWithAuth(`${API_URL}/activities/?year=${currentYear}&page_size=100`),
        ]);

        if (!sumRes.ok || !actRes.ok) throw new Error('Failed to load data');

        const [sumData, actData, weekData, yearData] = await Promise.all([
          sumRes.json(),
          actRes.json(),
          weekRes.ok ? weekRes.json() : [],
          yearRes.ok ? yearRes.json() : { results: [] },
        ]);

        setSummary(sumData);
        setActivities(actData);
        setWeeklyTrends(weekData);
        setYearActivities(yearData);

        // Fetch detail for the latest ride
        if (actData.results?.[0]) {
          try {
            const detRes = await fetchWithAuth(`${API_URL}/activities/${actData.results[0].id}/`);
            if (detRes.ok) setLatestDetail(await detRes.json());
          } catch {}
        }
      } catch {
        setDataError(true);
      } finally {
        setDataLoading(false);
      }
    };

    load();
  }, [isAuthenticated, fetchWithAuth, currentYear]);

  if (isLoading || (!isAuthenticated && !dataError)) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-void">
        <Nav />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading your rides…</p>
          </div>
        </div>
      </div>
    );
  }

  if (dataError || !summary) {
    return (
      <div className="min-h-screen bg-void">
        <Nav />
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <p className="text-slate-400 text-sm">Failed to load dashboard data.</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const ytd = summary.year_to_date;
  const week = summary.this_week;
  const month = summary.this_month;
  const recentRides = activities?.results.slice(0, 6) ?? [];

  return (
    <div className="min-h-screen bg-void">
      <Nav />
      <HeroSection summary={summary} />
      <YearNarrative summary={summary} />

      {activities?.results[0] && (
        <FadeIn>
          <LatestRideCard activity={latestDetail || activities.results[0]} detail={latestDetail ?? null} />
        </FadeIn>
      )}

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

      {weeklyTrends.length > 0 && (
        <FadeIn delay={0.1}>
          <section className="max-w-7xl mx-auto px-6 pb-16">
            <WeeklyChart data={weeklyTrends} />
          </section>
        </FadeIn>
      )}

      {yearActivities && yearActivities.results.length > 0 && (
        <FadeIn delay={0.1}>
          <section className="max-w-7xl mx-auto px-6 pb-16 relative">
            <YearHeatmap activities={yearActivities.results} year={currentYear} />
          </section>
        </FadeIn>
      )}

      {yearActivities && (
        <PerformanceSection
          activities={yearActivities.results}
          stravaFtp={summary.athlete.ftp ?? null}
        />
      )}

      <BikeCard
        allTimeDistM={summary.all_time.total_distance_m}
        primaryBikeDistM={summary.athlete.primary_bike_distance_m ?? null}
        allTimeRides={summary.all_time.total_rides}
        lastRideDate={activities?.results[0]?.start_date}
      />

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

      <footer className="border-t border-white/[0.05] py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-700 tracking-widest">
            {summary.athlete.name.toUpperCase()} · {new Date().getFullYear()}
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
