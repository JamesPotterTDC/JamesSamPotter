'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';

interface WeeklyChartProps {
  data: Array<{
    week_start_date: string;
    totals_json: {
      total_distance_m: number;
      indoor_distance_m: number;
      outdoor_distance_m: number;
    };
  }>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const outdoor = payload.find((p: any) => p.dataKey === 'Outdoor')?.value || 0;
  const indoor = payload.find((p: any) => p.dataKey === 'Indoor')?.value || 0;
  const total = outdoor + indoor;
  return (
    <div className="bg-night-900 border border-white/[0.1] rounded-xl px-4 py-3 shadow-2xl min-w-[140px]">
      <p className="text-xs text-slate-500 mb-2 tracking-widest uppercase">{label}</p>
      <p className="text-lg font-bebas text-white">{total.toFixed(1)} km</p>
      {outdoor > 0 && (
        <p className="text-xs text-orange-400 mt-1">▲ {outdoor.toFixed(1)} outdoor</p>
      )}
      {indoor > 0 && (
        <p className="text-xs text-cyan-400 mt-0.5">⚡ {indoor.toFixed(1)} indoor</p>
      )}
    </div>
  );
};

export default function WeeklyChart({ data }: WeeklyChartProps) {
  const chartData = [...data]
    .reverse()
    .map(week => ({
      week: new Date(week.week_start_date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      Indoor: parseFloat((week.totals_json.indoor_distance_m / 1000).toFixed(1)),
      Outdoor: parseFloat((week.totals_json.outdoor_distance_m / 1000).toFixed(1)),
    }));

  const maxTotal = Math.max(...chartData.map(d => d.Indoor + d.Outdoor));

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-semibold text-lg text-white">Weekly Distance</h2>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
            Outdoor
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
            Indoor
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} barSize={14} barGap={2}>
          <CartesianGrid
            strokeDasharray="1 4"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: '#475569' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#475569' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
            width={32}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="Outdoor" stackId="a" radius={[0, 0, 0, 0]} fill="#fb923c" opacity={0.85} />
          <Bar dataKey="Indoor" stackId="a" radius={[4, 4, 0, 0]} fill="#22d3ee" opacity={0.85} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
