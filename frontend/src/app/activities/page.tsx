'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Nav from '@/components/Nav';
import type { Activity } from '@/lib/api';
import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatPower,
  isIndoor as checkIndoor,
} from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

function formatMonthYear(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function formatDayDate(dateStr: string): { day: string; date: string } {
  const d = new Date(dateStr);
  return {
    day: d.toLocaleDateString('en-GB', { weekday: 'short' }),
    date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  };
}

function groupByMonth(activities: Activity[]): { label: string; items: Activity[] }[] {
  const groups: Map<string, Activity[]> = new Map();
  for (const a of activities) {
    const key = formatMonthYear(a.start_date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

interface ActivitiesData {
  results: Activity[];
  count: number;
  next: string | null;
  previous: string | null;
}

export default function ActivitiesPage() {
  const { isAuthenticated, isLoading, fetchWithAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1');
  const filter = searchParams.get('filter') ?? undefined;

  const [data, setData] = useState<ActivitiesData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setDataLoading(true);
    const indoor = filter === 'indoor' ? 'true' : filter === 'outdoor' ? 'false' : '';
    const params = new URLSearchParams({ page: String(page), page_size: '50' });
    if (indoor) params.set('indoor', indoor);

    fetchWithAuth(`${API_URL}/activities/?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .finally(() => setDataLoading(false));
  }, [isAuthenticated, page, filter]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const groups = data ? groupByMonth(data.results) : [];

  return (
    <div className="min-h-screen bg-void">
      <Nav />
      <main className="max-w-4xl mx-auto px-6 pt-28 pb-32">

        <div className="mb-14">
          <p className="text-[10px] text-slate-700 tracking-[0.35em] uppercase mb-3">Performance Log</p>
          <h1 className="font-bebas text-[clamp(56px,10vw,96px)] text-white tracking-tight leading-none mb-4">
            All Rides
          </h1>
          <div className="flex items-center gap-4">
            <span className="h-px w-12" style={{ background: 'rgba(251,146,60,0.3)' }} />
            <p className="text-slate-600 text-sm">{data?.count ?? '…'} activities recorded</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-16">
          <FilterChip href="/activities" active={!filter} label="All" />
          <FilterChip href="/activities?filter=outdoor" active={filter === 'outdoor'} label="Outdoor" color="orange" />
          <FilterChip href="/activities?filter=indoor" active={filter === 'indoor'} label="Indoor" color="cyan" />
        </div>

        {dataLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="relative">
            <div
              className="absolute left-[9px] top-0 bottom-0 w-px"
              style={{ background: 'linear-gradient(to bottom, rgba(251,146,60,0.15), rgba(255,255,255,0.04) 60%, transparent)' }}
            />
            <div className="space-y-12">
              {groups.map(({ label, items }) => (
                <div key={label}>
                  <div className="flex items-center gap-4 mb-6 relative">
                    <div
                      className="w-[19px] h-[19px] rounded-full border flex-shrink-0 z-10"
                      style={{ background: '#07090f', borderColor: 'rgba(251,146,60,0.4)', boxShadow: '0 0 12px rgba(251,146,60,0.15)' }}
                    />
                    <h2 className="font-bebas text-2xl text-white tracking-wide">{label}</h2>
                    <span className="text-xs text-slate-700">{items.length} ride{items.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-2 pl-8">
                    {items.map((activity) => {
                      const indoor = checkIndoor(activity.trainer, activity.sport_type);
                      const accent = indoor ? '#22d3ee' : '#fb923c';
                      const { day, date } = formatDayDate(activity.start_date);
                      return (
                        <Link
                          key={activity.id}
                          href={`/activities/${activity.id}`}
                          className="group relative flex items-stretch gap-5 rounded-2xl border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200 overflow-hidden"
                        >
                          <div className="w-[3px] flex-shrink-0 rounded-l-2xl" style={{ background: `linear-gradient(to bottom, ${accent}, ${accent}44)` }} />
                          <div className="flex-shrink-0 flex flex-col items-center justify-center py-4 w-10 text-center">
                            <p className="text-[9px] text-slate-700 uppercase tracking-wider leading-none mb-1">{day}</p>
                            <p className="text-xs font-medium text-slate-500 leading-tight">{date}</p>
                          </div>
                          <div className="self-stretch w-px bg-white/[0.05]" />
                          <div className="flex-1 min-w-0 py-4 pr-2">
                            <p className="font-display font-semibold text-slate-200 group-hover:text-white transition-colors truncate text-sm">{activity.name}</p>
                            <span className="inline-flex items-center mt-1 text-[10px] font-medium tracking-wide" style={{ color: indoor ? 'rgba(34,211,238,0.6)' : 'rgba(251,146,60,0.6)' }}>
                              {indoor ? 'Indoor' : 'Outdoor'}
                            </span>
                          </div>
                          <div className="hidden sm:flex items-center gap-6 py-4 pr-5">
                            <StatCol label="dist" value={formatDistance(activity.distance_m)} color={accent} />
                            <StatCol label="time" value={formatDuration(activity.moving_time_s)} />
                            <StatCol label="elev" value={formatElevation(activity.total_elevation_gain_m)} />
                            {activity.average_watts && <StatCol label="power" value={formatPower(activity.average_watts)} />}
                            {activity.average_heartrate && !activity.average_watts && <StatCol label="hr" value={`${Math.round(activity.average_heartrate)}bpm`} />}
                          </div>
                          <div className="flex sm:hidden flex-col items-end justify-center py-4 pr-4 gap-0.5">
                            <p className="font-bebas text-xl leading-none" style={{ color: accent }}>{formatDistance(activity.distance_m)}</p>
                            <p className="text-xs text-slate-600">{formatDuration(activity.moving_time_s)}</p>
                          </div>
                          <div className="hidden sm:flex items-center pr-4">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-slate-700 group-hover:text-slate-400 transition-colors">
                              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data && (data.previous || data.next) && (
          <div className="mt-16 flex justify-center items-center gap-3">
            {data.previous && (
              <Link href={`/activities?page=${page - 1}${filter ? `&filter=${filter}` : ''}`}
                className="px-6 py-2.5 rounded-full border border-white/[0.1] text-sm font-medium text-slate-400 hover:text-white hover:border-white/[0.2] transition-all">
                ← Earlier
              </Link>
            )}
            <span className="text-xs text-slate-700 px-4">Page {page}</span>
            {data.next && (
              <Link href={`/activities?page=${page + 1}${filter ? `&filter=${filter}` : ''}`}
                className="px-6 py-2.5 rounded-full border border-white/[0.1] text-sm font-medium text-slate-400 hover:text-white hover:border-white/[0.2] transition-all">
                Later →
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function FilterChip({ href, active, label, color }: { href: string; active: boolean; label: string; color?: 'orange' | 'cyan' }) {
  const activeStyles = color === 'orange' ? 'bg-orange-400/10 border-orange-400/25 text-orange-300'
    : color === 'cyan' ? 'bg-cyan-400/10 border-cyan-400/25 text-cyan-300'
    : 'bg-white/[0.07] border-white/[0.12] text-white';
  return (
    <Link href={href} className={`px-4 py-1.5 rounded-full border text-xs font-medium tracking-wide transition-all ${active ? activeStyles : 'border-white/[0.06] text-slate-600 hover:text-slate-400 hover:border-white/[0.1]'}`}>
      {label}
    </Link>
  );
}

function StatCol({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-right min-w-[52px]">
      <p className="font-bebas text-lg leading-none" style={{ color: color ?? 'rgba(148,163,184,0.7)' }}>{value}</p>
      <p className="text-[10px] text-slate-700 mt-0.5 tracking-wide">{label}</p>
    </div>
  );
}
