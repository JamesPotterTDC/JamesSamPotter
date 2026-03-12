'use client';

import { useState, useRef } from 'react';
import { useInView } from 'framer-motion';
import type { Activity } from '@/lib/api';
import { isIndoor } from '@/lib/utils';

interface YearHeatmapProps {
  activities: Activity[];
  year: number;
}

const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface DayData {
  distance: number;
  indoor: boolean;
  mixed: boolean;
  rides: number;
  name: string;
}

function buildDayMap(activities: Activity[]): Map<string, DayData> {
  const map = new Map<string, DayData>();
  for (const a of activities) {
    const d = new Date(a.start_date);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const existing = map.get(key);
    if (existing) {
      existing.distance += a.distance_m;
      existing.rides += 1;
      existing.name = `${existing.rides} rides`;
      if (existing.indoor !== isIndoor(a.trainer, a.sport_type)) existing.mixed = true;
    } else {
      map.set(key, {
        distance: a.distance_m,
        indoor: isIndoor(a.trainer, a.sport_type),
        mixed: false,
        rides: 1,
        name: a.name,
      });
    }
  }
  return map;
}

function getCellColor(data: DayData | undefined): string {
  if (!data || data.distance === 0) return 'rgba(255,255,255,0.04)';
  const km = data.distance / 1000;
  const intensity = Math.min(0.2 + (km / 120) * 0.8, 1);
  if (data.mixed) return `rgba(167,139,250,${intensity})`; // violet for mixed
  if (data.indoor) return `rgba(34,211,238,${intensity})`;
  return `rgba(251,146,60,${intensity})`;
}

export default function YearHeatmap({ activities, year }: YearHeatmapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; data: DayData } | null>(null);

  const dayMap = buildDayMap(activities);

  // Build weeks array: 52 weeks starting from Jan 1
  const jan1 = new Date(year, 0, 1);
  const startDow = jan1.getDay(); // 0=Sun...6=Sat, we want Mon=0
  const offsetToMon = (startDow + 6) % 7; // how many days before first Monday

  // We render Mon(0) → Sun(6) per column
  const totalDays = 371; // 53 weeks max
  const weeks: Array<Array<{ date: string; label: string } | null>> = [];
  
  for (let w = 0; w < 53; w++) {
    const week: Array<{ date: string; label: string } | null> = [];
    for (let d = 0; d < 7; d++) {
      const dayIndex = w * 7 + d - offsetToMon;
      if (dayIndex < 0 || dayIndex > 364) {
        week.push(null);
      } else {
        const date = new Date(year, 0, 1 + dayIndex);
        if (date.getFullYear() !== year) { week.push(null); continue; }
        const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
        week.push({ date: key, label: date.toLocaleDateString('en-GB', { day:'numeric', month:'short', weekday:'short' }) });
      }
    }
    if (week.some(c => c !== null)) weeks.push(week);
  }

  // Month label positions
  const monthPositions: Array<{ label: string; col: number }> = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstDay = week.find(c => c !== null);
    if (firstDay) {
      const parts = firstDay.date.split('-');
      const m = parseInt(parts[1]) - 1;
      if (m !== lastMonth) {
        monthPositions.push({ label: MONTHS[m], col: wi });
        lastMonth = m;
      }
    }
  });

  const totalRides = activities.length;
  const totalKm = Math.round(activities.reduce((s, a) => s + (a.distance_m || 0), 0) / 1000);
  const activeDays = dayMap.size;

  return (
    <div ref={ref} className="card p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-display font-semibold text-white text-lg">{year} in Motion</h2>
          <p className="text-xs text-slate-600 mt-0.5">
            {activeDays} active days · {totalRides} rides · {totalKm.toLocaleString()} km
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block bg-orange-400/70"/>&nbsp;Outdoor</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block bg-cyan-400/70"/>&nbsp;Indoor</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block bg-violet-400/70"/>&nbsp;Both</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div style={{ minWidth: weeks.length * STEP + 32 }}>
          {/* Month labels */}
          <div className="relative mb-1" style={{ height: 16, marginLeft: 24 }}>
            {monthPositions.map(({ label, col }) => (
              <span
                key={label + col}
                className="absolute text-[10px] text-slate-600 font-medium"
                style={{ left: col * STEP }}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="flex gap-0">
            {/* Day labels */}
            <div className="flex flex-col" style={{ gap: GAP, marginRight: GAP, paddingTop: 1 }}>
              {['M','','W','','F','',''].map((d, i) => (
                <div key={i} style={{ width: 16, height: CELL, lineHeight: `${CELL}px` }}
                  className="text-[9px] text-slate-700 text-right font-medium">
                  {d}
                </div>
              ))}
            </div>

            {/* Cells */}
            <div className="flex" style={{ gap: GAP }}>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                  {week.map((cell, di) => {
                    const data = cell ? dayMap.get(cell.date) : undefined;
                    const color = getCellColor(data);
                    const delay = inView ? wi * 12 : 9999;
                    return (
                      <div
                        key={di}
                        style={{
                          width: CELL,
                          height: CELL,
                          borderRadius: 2,
                          backgroundColor: cell ? color : 'transparent',
                          opacity: cell ? (inView ? 1 : 0) : 0,
                          transition: cell ? `opacity 0.3s ease ${delay}ms, background-color 0.2s` : 'none',
                          cursor: data ? 'pointer' : 'default',
                        }}
                        onMouseEnter={(e) => {
                          if (cell && data) {
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            const containerRect = ref.current!.getBoundingClientRect();
                            setTooltip({
                              x: rect.left - containerRect.left + CELL / 2,
                              y: rect.top - containerRect.top - 4,
                              date: cell.label,
                              data,
                            });
                          }
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-50 bg-night-900 border border-white/[0.12] rounded-xl px-3 py-2.5 shadow-2xl text-xs"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)', marginTop: -8 }}
        >
          <p className="text-slate-400 mb-1">{tooltip.date}</p>
          <p className="font-bebas text-xl text-white leading-none">
            {(tooltip.data.distance / 1000).toFixed(1)} km
          </p>
          <p className="text-slate-500 mt-0.5">
            {tooltip.data.rides === 1 ? tooltip.data.name : `${tooltip.data.rides} rides`}
          </p>
        </div>
      )}
    </div>
  );
}
