'use client';

import { useEffect, useState, use } from 'react';
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
import { formatDistance, formatDuration, formatDateShort, formatPower, isIndoor } from '@/lib/utils';
import type { Summary, Activity, ActivityDetail, WeeklyData } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface PublicProfile {
  username: string;
  display_name: string;
  avatar_url: string | null;
  visibility: 'private' | 'friends' | 'public';
  can_view_data: boolean;
  friendship_status: 'friends' | 'request_sent' | 'request_received' | 'none' | 'self';
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

function PrivateMessage({ profile, onRequestSent }: { profile: PublicProfile; onRequestSent: () => void }) {
  const { isAuthenticated, fetchWithAuth } = useAuth();
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(profile.friendship_status);

  const sendRequest = async () => {
    setSending(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/friend-requests/send/`, {
        method: 'POST',
        body: JSON.stringify({ username: profile.username }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status === 'accepted' ? 'friends' : 'request_sent');
        if (data.status === 'accepted') onRequestSent();
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      {profile.avatar_url && (
        <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full mb-4 opacity-60" />
      )}
      <h1 className="font-display font-semibold text-white text-xl mb-2">{profile.display_name}</h1>
      <p className="text-slate-500 text-sm mb-8">
        {profile.visibility === 'private'
          ? 'This profile is private.'
          : 'This profile is visible to friends only.'}
      </p>

      {isAuthenticated && profile.visibility === 'friends' && (
        <>
          {status === 'none' && (
            <button
              onClick={sendRequest}
              disabled={sending}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Send Friend Request'}
            </button>
          )}
          {status === 'request_sent' && (
            <p className="text-slate-400 text-sm">Friend request sent. Waiting for approval.</p>
          )}
          {status === 'request_received' && (
            <p className="text-slate-400 text-sm">
              This person sent you a friend request.{' '}
              <Link href="/friends" className="text-orange-400 hover:text-orange-300">View in Friends</Link>
            </p>
          )}
          {status === 'friends' && (
            <p className="text-green-400 text-sm">You are now friends!</p>
          )}
        </>
      )}

      {!isAuthenticated && (
        <a
          href={`${API_URL}/strava/oauth/start/`}
          className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Log in to request access
        </a>
      )}
    </div>
  );
}

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { fetchWithAuth, isAuthenticated, user } = useAuth();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activities, setActivities] = useState<{ results: Activity[] } | null>(null);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyData[]>([]);
  const [yearActivities, setYearActivities] = useState<{ results: Activity[] } | null>(null);
  const [latestDetail, setLatestDetail] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [canView, setCanView] = useState(false);

  const currentYear = new Date().getFullYear();

  const fetchPublicData = async (authFetch: typeof fetch | typeof fetchWithAuth) => {
    const [sumRes, actRes, weekRes, yearRes] = await Promise.all([
      authFetch(`${API_URL}/users/${username}/summary/`),
      authFetch(`${API_URL}/users/${username}/activities/?page=1`),
      authFetch(`${API_URL}/users/${username}/weekly-trends/?weeks=16`),
      authFetch(`${API_URL}/users/${username}/activities/?year=${currentYear}&page_size=100`),
    ]);
    if (!sumRes.ok) throw new Error(`${sumRes.status}`);
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
    if (actData.results?.[0]) {
      try {
        const detRes = await authFetch(`${API_URL}/users/${username}/activities/${actData.results[0].id}/`);
        if (detRes.ok) setLatestDetail(await detRes.json());
      } catch {}
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Fetch profile info (always public endpoint)
        const profRes = await fetchWithAuth(`${API_URL}/users/${username}/`);
        if (!profRes.ok) { setLoading(false); return; }
        const profData: PublicProfile = await profRes.json();
        setProfile(profData);

        if (profData.can_view_data) {
          setCanView(true);
          await fetchPublicData(fetchWithAuth);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [username, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-void">
        <Nav />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-slate-500 text-sm">User not found.</p>
        </div>
      </div>
    );
  }

  // Own profile — redirect to /dashboard
  if (user?.username === username) {
    return (
      <div className="min-h-screen bg-void">
        <Nav />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <p className="text-slate-400 text-sm">This is your profile.</p>
          <Link href="/dashboard" className="text-orange-400 hover:text-orange-300 text-sm transition-colors">
            Go to your dashboard →
          </Link>
        </div>
      </div>
    );
  }

  if (!canView || !summary) {
    return (
      <div className="min-h-screen bg-void">
        <Nav />
        <PrivateMessage profile={profile} onRequestSent={() => { setCanView(false); }} />
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

      {/* Profile header */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-8 flex items-center gap-4">
        {profile.avatar_url && (
          <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-full" />
        )}
        <div>
          <h1 className="font-display font-semibold text-white text-lg">{profile.display_name}</h1>
          <p className="text-slate-500 text-xs">@{profile.username}</p>
        </div>
      </section>

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
          <h2 className="font-display font-semibold text-white text-lg mb-5">Recent Rides</h2>
          <div className="space-y-2">
            {recentRides.map((ride) => (
              <div
                key={ride.id}
                className="flex items-center gap-4 card p-4 rounded-xl"
              >
                <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${isIndoor(ride.trainer, ride.sport_type) ? 'bg-cyan-400' : 'bg-orange-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200 text-sm truncate">{ride.name}</p>
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
              </div>
            ))}
          </div>
        </section>
      </FadeIn>

      <footer className="border-t border-white/[0.05] py-10">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-center">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-700 tracking-widest">POWERED BY</span>
            <a href="https://www.strava.com" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-orange-400 transition-colors tracking-widest">
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
