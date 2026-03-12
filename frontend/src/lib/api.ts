const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface Activity {
  id: number;
  strava_id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  trainer: boolean;
  distance_m: number;
  moving_time_s: number;
  elapsed_time_s?: number;
  total_elevation_gain_m: number;
  average_speed_mps?: number;
  max_speed_mps?: number;
  average_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  map_polyline?: string;
}

export interface ActivityDetail extends Activity {
  timezone: string;
  commute: boolean;
  elapsed_time_s: number;
  average_speed_mps: number;
  max_speed_mps: number;
  weighted_average_watts?: number;
  max_heartrate?: number;
  average_cadence?: number;
  map_polyline: string;
  streams?: {
    time?: number[];
    distance?: number[];
    altitude?: number[];
    heartrate?: number[];
    watts?: number[];
    cadence?: number[];
  };
}

export interface Milestone {
  id: number;
  key: string;
  title: string;
  payload: any;
  achieved_at?: string;
  updated_at: string;
}

export interface PeriodStats {
  total_rides: number;
  total_distance_m: number;
  total_time_s: number;
  total_elevation_m: number;
  total_kj: number;
  indoor_rides: number;
  indoor_distance_m: number;
  outdoor_rides: number;
  outdoor_distance_m: number;
}

export interface Summary {
  athlete: {
    id: number;
    name: string;
    strava_id: number;
  };
  this_week: PeriodStats;
  this_month: PeriodStats;
  year_to_date: PeriodStats;
  all_time: PeriodStats;
}

export interface WeeklyData {
  week_start_date: string;
  totals_json: PeriodStats;
}

export async function fetchSummary(): Promise<Summary> {
  const res = await fetch(`${API_URL}/summary/`, { 
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json();
}

export async function fetchActivities(params?: {
  page?: number;
  type?: string;
  trainer?: boolean;
  year?: number;
  page_size?: number;
}): Promise<{ results: Activity[]; count: number; next: string | null; previous: string | null }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.type) query.set('type', params.type);
  if (params?.trainer !== undefined) query.set('trainer', params.trainer.toString());
  if (params?.year) query.set('year', params.year.toString());
  if (params?.page_size) query.set('page_size', params.page_size.toString());
  
  const res = await fetch(`${API_URL}/activities/?${query}`, { 
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to fetch activities');
  return res.json();
}

export async function fetchActivity(id: number): Promise<ActivityDetail> {
  const res = await fetch(`${API_URL}/activities/${id}/`, { 
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to fetch activity');
  return res.json();
}

export async function fetchMilestones(): Promise<Milestone[]> {
  const res = await fetch(`${API_URL}/milestones/`, { 
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to fetch milestones');
  return res.json();
}

export async function fetchWeeklyTrends(weeks: number = 12): Promise<WeeklyData[]> {
  const res = await fetch(`${API_URL}/weekly-trends/?weeks=${weeks}`, { 
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to fetch weekly trends');
  return res.json();
}

export function getStravaOAuthUrl(): string {
  return `${API_URL}/strava/oauth/start/`;
}
