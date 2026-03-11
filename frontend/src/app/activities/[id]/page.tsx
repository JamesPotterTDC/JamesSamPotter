import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ActivityMap from '@/components/ActivityMap';
import { fetchActivity } from '@/lib/api';
import { 
  formatDistance, 
  formatDuration, 
  formatDateTime, 
  formatElevation, 
  formatPace,
  formatEnergy 
} from '@/lib/utils';
import Link from 'next/link';

export default async function ActivityDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const activity = await fetchActivity(parseInt(params.id));

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link 
            href="/activities" 
            className="text-primary-600 hover:text-primary-700 font-medium text-sm mb-4 inline-block"
          >
            ← Back to activities
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{activity.name}</h1>
              <p className="text-gray-600 mt-2">
                {formatDateTime(activity.start_date)} • {activity.type}
                {activity.trainer && (
                  <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Indoor
                  </span>
                )}
              </p>
            </div>
            <a
              href={`https://www.strava.com/activities/${activity.strava_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-500 hover:text-orange-600 font-medium text-sm"
            >
              View on Strava →
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {activity.map_polyline ? (
              <div className="h-96 relative">
                <ActivityMap 
                  polyline={activity.map_polyline}
                />
                <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded text-xs text-gray-600">
                  Route redacted for privacy
                </div>
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center bg-gray-100">
                <p className="text-gray-500">
                  {activity.trainer ? 'Indoor ride - no map' : 'No map data available'}
                </p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Stats</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Distance</p>
                <p className="text-2xl font-bold text-gray-900">{formatDistance(activity.distance_m)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Moving Time</p>
                <p className="text-2xl font-bold text-gray-900">{formatDuration(activity.moving_time_s)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Elevation Gain</p>
                <p className="text-2xl font-bold text-gray-900">{formatElevation(activity.total_elevation_gain_m)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Avg Speed</p>
                <p className="text-2xl font-bold text-gray-900">{formatPace(activity.average_speed_mps)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {activity.average_watts && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Avg Power</p>
              <p className="text-xl font-bold text-gray-900">{Math.round(activity.average_watts)}W</p>
            </div>
          )}
          {activity.weighted_average_watts && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Normalized Power</p>
              <p className="text-xl font-bold text-gray-900">{Math.round(activity.weighted_average_watts)}W</p>
            </div>
          )}
          {activity.kilojoules && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Energy</p>
              <p className="text-xl font-bold text-gray-900">{formatEnergy(activity.kilojoules)}</p>
            </div>
          )}
          {activity.average_heartrate && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Avg Heart Rate</p>
              <p className="text-xl font-bold text-gray-900">{Math.round(activity.average_heartrate)} bpm</p>
            </div>
          )}
          {activity.max_heartrate && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Max Heart Rate</p>
              <p className="text-xl font-bold text-gray-900">{activity.max_heartrate} bpm</p>
            </div>
          )}
          {activity.average_cadence && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Avg Cadence</p>
              <p className="text-xl font-bold text-gray-900">{Math.round(activity.average_cadence)} rpm</p>
            </div>
          )}
          {activity.max_speed_mps && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Max Speed</p>
              <p className="text-xl font-bold text-gray-900">{formatPace(activity.max_speed_mps)}</p>
            </div>
          )}
        </div>

        {activity.streams && (activity.streams.heartrate || activity.streams.watts) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Data</h2>
            <p className="text-sm text-gray-500">
              Stream visualization coming soon (HR zones, power curve, etc.)
            </p>
          </div>
        )}
        
        <Footer />
      </main>
    </div>
  );
}
