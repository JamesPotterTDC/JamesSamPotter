import Header from '@/components/Header';
import Footer from '@/components/Footer';
import StatCard from '@/components/StatCard';
import MilestoneCard from '@/components/MilestoneCard';
import WeeklyChart from '@/components/WeeklyChart';
import { fetchSummary, fetchMilestones, fetchWeeklyTrends, fetchActivities } from '@/lib/api';
import { formatDistance, formatDuration, formatElevation, formatEnergy, formatDateTime } from '@/lib/utils';
import Link from 'next/link';

export default async function HomePage() {
  let summary, milestones, weeklyTrends, recentActivities;

  try {
    [summary, milestones, weeklyTrends, recentActivities] = await Promise.all([
      fetchSummary(),
      fetchMilestones(),
      fetchWeeklyTrends(12),
      fetchActivities({ page: 1 })
    ]);
  } catch (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Your Cycling Dashboard</h2>
            <p className="text-gray-600 mb-6">Connect your Strava account to get started.</p>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL}/strava/oauth/start/`}
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition"
            >
              Connect to Strava
            </a>
          </div>
        </main>
      </div>
    );
  }

  const ytd = summary.year_to_date;
  const thisWeek = summary.this_week;

  const everestMilestone = milestones.find(m => m.key === 'everest_ytd');
  const streakMilestone = milestones.find(m => m.key === 'current_streak');
  const longestRide = milestones.find(m => m.key === 'longest_ride');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {summary.athlete.name}</h1>
          <p className="text-gray-600 mt-1">Here's your cycling summary</p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Year to Date</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Distance"
              value={formatDistance(ytd.total_distance_m)}
              subtitle={`${ytd.total_rides} rides`}
            />
            <StatCard
              title="Time"
              value={formatDuration(ytd.total_time_s)}
              subtitle={`${Math.round(ytd.total_time_s / 3600)} hours`}
            />
            <StatCard
              title="Elevation"
              value={formatElevation(ytd.total_elevation_m)}
              subtitle="climbing"
            />
            <StatCard
              title="Energy"
              value={formatEnergy(ytd.total_kj)}
              subtitle="burned"
            />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">This Week</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Distance"
              value={formatDistance(thisWeek.total_distance_m)}
              subtitle={`${thisWeek.total_rides} rides`}
            />
            <StatCard
              title="Indoor"
              value={formatDistance(thisWeek.indoor_distance_m)}
              subtitle={`${thisWeek.indoor_rides} rides`}
            />
            <StatCard
              title="Outdoor"
              value={formatDistance(thisWeek.outdoor_distance_m)}
              subtitle={`${thisWeek.outdoor_rides} rides`}
            />
          </div>
        </div>

        <div className="mb-8">
          <WeeklyChart data={weeklyTrends} />
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Milestones</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {everestMilestone && (
              <MilestoneCard
                title={everestMilestone.title}
                description={`${formatElevation(everestMilestone.payload.current_elevation_m)} / ${formatElevation(everestMilestone.payload.target_elevation_m)}`}
                progress={everestMilestone.payload.progress_percent}
                achieved={!!everestMilestone.achieved_at}
              />
            )}
            {streakMilestone && (
              <MilestoneCard
                title={streakMilestone.title}
                description={`${streakMilestone.payload.days} consecutive days`}
                achieved={false}
              />
            )}
            {longestRide && (
              <MilestoneCard
                title={longestRide.title}
                description={formatDistance(longestRide.payload.distance_m)}
                achieved={true}
              />
            )}
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Activities</h2>
            <Link href="/activities" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
              View all →
            </Link>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {recentActivities.results.slice(0, 5).map((activity) => (
                <Link
                  key={activity.id}
                  href={`/activities/${activity.id}`}
                  className="block hover:bg-gray-50 transition p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{activity.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDateTime(activity.start_date)}
                        {activity.trainer && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                            Indoor
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatDistance(activity.distance_m)}</p>
                        <p className="text-gray-500">Distance</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatDuration(activity.moving_time_s)}</p>
                        <p className="text-gray-500">Time</p>
                      </div>
                      {activity.average_watts && (
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{Math.round(activity.average_watts)}W</p>
                          <p className="text-gray-500">Avg Power</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
        
        <Footer />
      </main>
    </div>
  );
}
