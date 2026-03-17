'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import FadeIn from '@/components/FadeIn';
import ElevationProfile from '@/components/ElevationProfile';
import StreamLandscape from '@/components/StreamLandscape';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import type { ActivityDetail } from '@/lib/api';
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

function generateRideStory(activity: ActivityDetail, indoor: boolean): string {
  const km = (activity.distance_m / 1000).toFixed(1);
  const type = indoor ? 'virtual' : 'outdoor';
  let intensity = 'steady';
  if (activity.average_watts) {
    if (activity.average_watts > 220) intensity = 'high-intensity';
    else if (activity.average_watts > 160) intensity = 'solid';
  } else if (activity.average_heartrate) {
    if (activity.average_heartrate > 160) intensity = 'hard';
    else if (activity.average_heartrate > 140) intensity = 'solid';
  }
  const parts: string[] = [`A ${intensity} ${km}km ${type} effort`];
  if (activity.average_watts) parts.push(`at ${Math.round(activity.average_watts)}W avg`);
  if (activity.average_heartrate) parts.push(`${Math.round(activity.average_heartrate)}bpm avg HR`);
  if (activity.total_elevation_gain_m > 200) parts.push(`${Math.round(activity.total_elevation_gain_m)}m climbed`);
  return parts.join(' · ') + '.';
}

export default function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isAuthenticated, isLoading, fetchWithAuth } = useAuth();
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/');
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchWithAuth(`${API_URL}/activities/${id}/`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setActivity(d))
      .finally(() => setLoading(false));
  }, [isAuthenticated, id]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-void">
        <Nav />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-slate-500 text-sm">Activity not found.</p>
        </div>
      </div>
    );
  }

  const indoor = checkIndoor(activity.trainer, activity.sport_type);
  const hasMap = !!activity.map_polyline;
  const pints = guinnessPints(activity.kilojoules);
  const accentBg = indoor
    ? 'bg-cyan-400/10 border-cyan-400/20 text-cyan-400'
    : 'bg-orange-400/10 border-orange-400/20 text-orange-400';
  const accentHex = indoor ? '#22d3ee' : '#fb923c';
  const story = generateRideStory(activity, indoor);
  const avgW = activity.average_watts;
  const npW = activity.weighted_average_watts;
  const intensityFactor = npW && avgW ? (npW / avgW).toFixed(2) : null;

  return (
    <div className="min-h-screen bg-void">
      <Nav />

      <div className={`relative w-full ${hasMap ? 'h-[55vh] min-h-[400px]' : 'h-[40vh] min-h-[320px]'}`}>
        {hasMap ? (
          <>
            <ActivityMapDark polyline={activity.map_polyline} revealAnimation indoor={indoor} className="w-full h-full" />
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-void via-void/80 to-transparent pointer-events-none" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: `radial-gradient(ellipse at 50% 60%, rgba(34,211,238,0.08) 0%, transparent 65%), #07090f` }}>
            {[120, 200, 280].map((r, i) => (
              <div key={r} className="absolute rounded-full border border-cyan-400/[0.06] animate-pulse-slow"
                style={{ width: r, height: r, animationDelay: `${i * 0.7}s` }} />
            ))}
            <svg width="80" height="52" viewBox="0 0 120 80" fill="none" className="opacity-15 relative z-10">
              <circle cx="25" cy="55" r="18" stroke="#22d3ee" strokeWidth="2"/>
              <circle cx="95" cy="55" r="18" stroke="#22d3ee" strokeWidth="2"/>
              <path d="M25 55 L55 25 L75 40 L95 55" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M55 25 L60 10" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round"/>
              <path d="M52 10 L68 10" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-void to-transparent pointer-events-none" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 max-w-7xl mx-auto px-6 pb-8">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/activities" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M10 6H2M2 6l4-4M2 6l4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              All rides
            </Link>
            <span className="text-slate-700">·</span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${accentBg}`}>
              {indoor ? 'Indoor' : 'Outdoor'}
            </span>
          </div>
          <h1 className="font-bebas text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-none">{activity.name}</h1>
          <p className="text-xs text-slate-600 mt-2">{formatDateTime(activity.start_date)}</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 pt-10 pb-24">
        {story && (
          <FadeIn>
            <div className="rounded-2xl px-5 py-4 mb-8 border"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)', borderColor: `${accentHex}25` }}>
              <p className="text-sm font-display text-slate-300 leading-relaxed italic">&ldquo;{story}&rdquo;</p>
            </div>
          </FadeIn>
        )}

        <FadeIn delay={0.05}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <HeroStat label="Distance" value={formatDistance(activity.distance_m)} accent={accentHex} />
            <HeroStat label="Moving Time" value={formatDuration(activity.moving_time_s)} accent={accentHex} />
            <HeroStat label="Elevation" value={formatElevation(activity.total_elevation_gain_m)} accent={accentHex} />
            <HeroStat label="Avg Speed" value={formatPace(activity.average_speed_mps)} accent={accentHex} />
          </div>
        </FadeIn>

        {activity.streams?.altitude && activity.streams.altitude.length > 2 && (
          <FadeIn delay={0.1}>
            <div className="card p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <p className="stat-label">Elevation Profile</p>
                <p className="text-xs text-slate-600">{formatElevation(activity.total_elevation_gain_m)} gain</p>
              </div>
              <ElevationProfile altitudes={activity.streams.altitude} color={accentHex} />
            </div>
          </FadeIn>
        )}

        {activity.streams && (activity.streams.altitude || activity.streams.watts || activity.streams.heartrate) && (
          <FadeIn delay={0.12}>
            <StreamLandscape streams={activity.streams} accentHex={accentHex} />
          </FadeIn>
        )}

        {(avgW || activity.average_heartrate) && (
          <FadeIn delay={0.15}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {avgW && (
                <div className="card p-6">
                  <p className="stat-label mb-4">Power</p>
                  <div className="flex items-end gap-6 mb-4">
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Avg</p>
                      <p className="font-bebas text-4xl text-orange-400 leading-none">{formatPower(avgW)}</p>
                    </div>
                    {npW && (
                      <div>
                        <p className="text-xs text-slate-600 mb-1">Normalised</p>
                        <p className="font-bebas text-4xl text-orange-300 leading-none">{formatPower(npW)}</p>
                      </div>
                    )}
                  </div>
                  {intensityFactor && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>Intensity Factor</span>
                      <span className="font-medium text-slate-300">{intensityFactor}</span>
                    </div>
                  )}
                  {activity.kilojoules && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06]">
                      <p className="text-xs text-slate-600">{formatEnergy(activity.kilojoules)} · {pints > 0 ? `${pints} pints earned` : 'keep pedalling'}</p>
                    </div>
                  )}
                </div>
              )}
              {activity.average_heartrate && (
                <div className="card p-6">
                  <p className="stat-label mb-4">Heart Rate</p>
                  <div className="flex items-end gap-6 mb-4">
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Avg</p>
                      <p className="font-bebas text-4xl leading-none" style={{ color: accentHex }}>{formatHeartrate(activity.average_heartrate)}</p>
                    </div>
                    {activity.max_heartrate && (
                      <div>
                        <p className="text-xs text-slate-600 mb-1">Max</p>
                        <p className="font-bebas text-4xl text-slate-300 leading-none">{activity.max_heartrate} bpm</p>
                      </div>
                    )}
                  </div>
                  {activity.average_heartrate && activity.max_heartrate && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-slate-600">Avg as % of max</span>
                        <span className="text-xs font-medium text-slate-400">{Math.round((activity.average_heartrate / activity.max_heartrate) * 100)}%</span>
                      </div>
                      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.round((activity.average_heartrate / activity.max_heartrate) * 100)}%`, background: accentHex }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </FadeIn>
        )}

        <FadeIn delay={0.2}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
            {activity.average_cadence && <SmallStat label="Avg Cadence" value={`${Math.round(activity.average_cadence)} rpm`} />}
            {activity.max_speed_mps && <SmallStat label="Max Speed" value={formatPace(activity.max_speed_mps)} />}
            {activity.kilojoules && <SmallStat label="Energy" value={formatEnergy(activity.kilojoules)} />}
            <SmallStat label="Elapsed" value={formatDuration(activity.elapsed_time_s)} />
          </div>
        </FadeIn>

        {activity.total_elevation_gain_m > 100 && (
          <FadeIn delay={0.25}>
            <div className="card p-5 flex items-center gap-4 mb-6">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>⛰️</div>
              <div>
                <p className="font-bebas text-2xl text-violet-400 leading-none">{everestMultiple(activity.total_elevation_gain_m)} Everest</p>
                <p className="text-xs text-slate-500 mt-0.5">{formatElevation(activity.total_elevation_gain_m)} gained · Everest is 8,848 m</p>
              </div>
            </div>
          </FadeIn>
        )}

        <FadeIn delay={0.3}>
          <div className="flex items-center gap-6 pt-4 border-t border-white/[0.05]">
            <a href={`https://www.strava.com/activities/${activity.strava_id}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-orange-400 transition-colors">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
              </svg>
              View on Strava
            </a>
            <Link href="/activities" className="text-xs text-slate-600 hover:text-slate-300 transition-colors">← All rides</Link>
          </div>
        </FadeIn>
      </main>
    </div>
  );
}

function HeroStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="card p-5">
      <p className="stat-label mb-2">{label}</p>
      <p className="font-bebas text-3xl sm:text-4xl leading-none" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="stat-label mb-1.5">{label}</p>
      <p className="font-bebas text-2xl text-slate-300 leading-none">{value}</p>
    </div>
  );
}
