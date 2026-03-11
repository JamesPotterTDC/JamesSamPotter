'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDistance, formatDuration } from '@/lib/utils';

interface WeeklyChartProps {
  data: Array<{
    week_start_date: string;
    totals_json: {
      total_distance_m: number;
      total_time_s: number;
      indoor_distance_m: number;
      outdoor_distance_m: number;
    };
  }>;
}

export default function WeeklyChart({ data }: WeeklyChartProps) {
  const chartData = data.map(week => ({
    week: new Date(week.week_start_date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
    Indoor: Math.round(week.totals_json.indoor_distance_m / 1000),
    Outdoor: Math.round(week.totals_json.outdoor_distance_m / 1000),
  })).reverse();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Weekly Distance (km)</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="week" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
            formatter={(value: number) => [`${value} km`, '']}
          />
          <Legend />
          <Bar dataKey="Indoor" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Outdoor" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
