import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { fetchActivities } from '@/lib/api';
import { formatDistance, formatDuration, formatDateTime, formatElevation } from '@/lib/utils';
import Link from 'next/link';

interface SearchParams {
  page?: string;
  type?: string;
  trainer?: string;
}

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const page = parseInt(searchParams.page || '1');
  const type = searchParams.type;
  const trainer = searchParams.trainer === 'true' ? true : searchParams.trainer === 'false' ? false : undefined;

  const data = await fetchActivities({ page, type, trainer });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">All Activities</h1>
          <p className="text-gray-600 mt-1">{data.count} total rides</p>
        </div>

        <div className="mb-6 flex items-center space-x-4">
          <Link
            href="/activities"
            className={`px-4 py-2 rounded-lg font-medium transition ${
              !trainer ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            All
          </Link>
          <Link
            href="/activities?trainer=true"
            className={`px-4 py-2 rounded-lg font-medium transition ${
              trainer === true ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Indoor
          </Link>
          <Link
            href="/activities?trainer=false"
            className={`px-4 py-2 rounded-lg font-medium transition ${
              trainer === false ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Outdoor
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {data.results.map((activity) => (
              <Link
                key={activity.id}
                href={`/activities/${activity.id}`}
                className="block hover:bg-gray-50 transition p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{activity.name}</h3>
                      {activity.trainer && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          Indoor
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDateTime(activity.start_date)} • {activity.type}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Distance</p>
                    <p className="text-lg font-semibold text-gray-900">{formatDistance(activity.distance_m)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Time</p>
                    <p className="text-lg font-semibold text-gray-900">{formatDuration(activity.moving_time_s)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Elevation</p>
                    <p className="text-lg font-semibold text-gray-900">{formatElevation(activity.total_elevation_gain_m)}</p>
                  </div>
                  {activity.average_watts && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Avg Power</p>
                      <p className="text-lg font-semibold text-gray-900">{Math.round(activity.average_watts)}W</p>
                    </div>
                  )}
                  {activity.average_heartrate && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Avg HR</p>
                      <p className="text-lg font-semibold text-gray-900">{Math.round(activity.average_heartrate)} bpm</p>
                    </div>
                  )}
                  {activity.kilojoules && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Energy</p>
                      <p className="text-lg font-semibold text-gray-900">{formatEnergy(activity.kilojoules)}</p>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-center space-x-2">
          {data.previous && (
            <Link
              href={`/activities?page=${page - 1}${trainer !== undefined ? `&trainer=${trainer}` : ''}`}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
            >
              Previous
            </Link>
          )}
          <span className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium">
            Page {page}
          </span>
          {data.next && (
            <Link
              href={`/activities?page=${page + 1}${trainer !== undefined ? `&trainer=${trainer}` : ''}`}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
            >
              Next
            </Link>
          )}
        </div>
        
        <Footer />
      </main>
    </div>
  );
}
