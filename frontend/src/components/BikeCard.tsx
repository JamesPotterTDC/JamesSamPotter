'use client';

import { useState } from 'react';

const SPECS = [
  { label: 'Frame', value: 'Giant TCR Advanced Pro 2', detail: '2018 · carbon composite' },
  { label: 'Groupset', value: 'Shimano 105', detail: 'R7000 · 11-speed' },
  { label: 'Wheels', value: 'Zipp 404', detail: '58mm carbon clincher' },
];

// Geometry constants — side view of a compact road bike (TCR proportions)
const RW = 62;  // wheel radius
const RX = 128; // rear wheel centre x
const FX = 388; // front wheel centre x
const AY = 162; // axle Y (wheel centres)
const BBX = 252; // bottom bracket x
const BBY = 174; // bottom bracket y (BB drop below axle)

// Frame junctions
const ST_TOP_X = 235; const ST_TOP_Y = 80;  // top of seat tube
const HT_TOP_X = 376; const HT_TOP_Y = 94;  // top of head tube
const HT_BOT_X = 383; const HT_BOT_Y = 116; // bottom of head tube

const O = 'rgba(251,146,60,'; // orange helper

export default function BikeCard() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div
      className="card overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)' }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
        <p className="stat-label mb-1">The Machine</p>
        <h3 className="font-bebas text-3xl text-white tracking-tight leading-none">
          2018 Giant TCR Advanced Pro 2
        </h3>
      </div>

      {/* Bike illustration */}
      <div
        className="px-4 py-6 relative"
        style={{ background: 'radial-gradient(ellipse at 50% 85%, rgba(251,146,60,0.05) 0%, transparent 65%)' }}
      >
        <svg viewBox="0 0 520 230" width="100%" aria-hidden="true">
          <defs>
            <filter id="bc-glow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Zipp 404 deep section rim gradient */}
            <radialGradient id="bc-rim-r" cx="50%" cy="50%" r="50%">
              <stop offset="78%" stopColor={`${O}0)`} />
              <stop offset="82%" stopColor={`${O}0.18)`} />
              <stop offset="100%" stopColor={`${O}0)`} />
            </radialGradient>
          </defs>

          {/* ── REAR WHEEL (Zipp 404 deep section) ── */}
          {/* Tire */}
          <circle cx={RX} cy={AY} r={RW} fill="none" stroke={`${O}0.08)`} strokeWidth={10} />
          <circle cx={RX} cy={AY} r={RW} fill="none" stroke={`${O}0.25)`} strokeWidth={2} />
          {/* Deep section rim — inner edge of the 58mm rim */}
          <circle cx={RX} cy={AY} r={RW - 10} fill="none" stroke={`${O}0.35)`} strokeWidth={8} />
          <circle cx={RX} cy={AY} r={RW - 10} fill="none" stroke={`${O}0.55)`} strokeWidth={1} />
          {/* Spoke bed (inner rim) */}
          <circle cx={RX} cy={AY} r={RW - 18} fill="none" stroke={`${O}0.12)`} strokeWidth={1} />
          {/* Spokes — 20 spokes, thin */}
          {Array.from({ length: 20 }, (_, i) => {
            const a = (i / 20) * Math.PI * 2 + 0.15;
            return (
              <line key={i}
                x1={(RX + 9 * Math.cos(a)).toFixed(1)} y1={(AY + 9 * Math.sin(a)).toFixed(1)}
                x2={(RX + (RW - 18) * Math.cos(a)).toFixed(1)} y2={(AY + (RW - 18) * Math.sin(a)).toFixed(1)}
                stroke={`${O}0.14)`} strokeWidth="0.8"
              />
            );
          })}
          {/* Hub */}
          <circle cx={RX} cy={AY} r={9} fill={`${O}0.12)`} stroke={`${O}0.4)`} strokeWidth={1.5} />
          <circle cx={RX} cy={AY} r={4} fill={`${O}0.5)`} />

          {/* ── FRONT WHEEL (Zipp 404 deep section) ── */}
          <circle cx={FX} cy={AY} r={RW} fill="none" stroke={`${O}0.08)`} strokeWidth={10} />
          <circle cx={FX} cy={AY} r={RW} fill="none" stroke={`${O}0.25)`} strokeWidth={2} />
          <circle cx={FX} cy={AY} r={RW - 10} fill="none" stroke={`${O}0.35)`} strokeWidth={8} />
          <circle cx={FX} cy={AY} r={RW - 10} fill="none" stroke={`${O}0.55)`} strokeWidth={1} />
          <circle cx={FX} cy={AY} r={RW - 18} fill="none" stroke={`${O}0.12)`} strokeWidth={1} />
          {Array.from({ length: 20 }, (_, i) => {
            const a = (i / 20) * Math.PI * 2 + 0.3;
            return (
              <line key={i}
                x1={(FX + 9 * Math.cos(a)).toFixed(1)} y1={(AY + 9 * Math.sin(a)).toFixed(1)}
                x2={(FX + (RW - 18) * Math.cos(a)).toFixed(1)} y2={(AY + (RW - 18) * Math.sin(a)).toFixed(1)}
                stroke={`${O}0.14)`} strokeWidth="0.8"
              />
            );
          })}
          <circle cx={FX} cy={AY} r={9} fill={`${O}0.12)`} stroke={`${O}0.4)`} strokeWidth={1.5} />
          <circle cx={FX} cy={AY} r={4} fill={`${O}0.5)`} />

          {/* ── DRIVETRAIN ── */}
          {/* Chainring outer */}
          <circle cx={BBX} cy={BBY} r={21} fill="none" stroke={`${O}0.3)`} strokeWidth={3} />
          {/* Chainring inner (spider) */}
          <circle cx={BBX} cy={BBY} r={13} fill="none" stroke={`${O}0.2)`} strokeWidth={1.5} />
          {/* Chainring bolts */}
          {Array.from({ length: 5 }, (_, i) => {
            const a = (i / 5) * Math.PI * 2;
            return <circle key={i} cx={(BBX + 17 * Math.cos(a)).toFixed(1)} cy={(BBY + 17 * Math.sin(a)).toFixed(1)} r={1.5} fill={`${O}0.3)`} />;
          })}
          {/* Crank arm — pointing down and slightly forward */}
          <line x1={BBX} y1={BBY} x2={BBX + 12} y2={BBY + 22} stroke={`${O}0.5)`} strokeWidth={4} strokeLinecap="round" />
          <circle cx={BBX + 12} cy={BBY + 22} r={3} fill={`${O}0.25)`} stroke={`${O}0.4)`} strokeWidth={1} />
          {/* Left crank (opposite) */}
          <line x1={BBX} y1={BBY} x2={BBX - 12} y2={BBY - 22} stroke={`${O}0.3)`} strokeWidth={3} strokeLinecap="round" />
          {/* Chain (simplified line) */}
          <line x1={BBX + 21} y1={BBY} x2={RX + 9} y2={AY}
            stroke={`${O}0.15)`} strokeWidth={2} strokeDasharray="3 2" />
          {/* Rear cassette */}
          <circle cx={RX} cy={AY} r={9} fill="none" stroke={`${O}0.25)`} strokeWidth={5} />

          {/* ── FRAME (rear triangle) ── */}
          {/* Chain stay — from rear axle to BB */}
          <line x1={RX} y1={AY} x2={BBX} y2={BBY}
            stroke={`${O}0.55)`} strokeWidth={3.5} strokeLinecap="round" />
          {/* Seat stay — from rear axle up to seat tube top */}
          <line x1={RX} y1={AY} x2={ST_TOP_X} y2={ST_TOP_Y}
            stroke={`${O}0.5)`} strokeWidth={2.5} strokeLinecap="round" />

          {/* ── FRAME (main triangle) ── */}
          {/* Seat tube — nearly vertical, slight forward lean */}
          <line x1={BBX} y1={BBY} x2={ST_TOP_X} y2={ST_TOP_Y}
            stroke={`${O}0.7)`} strokeWidth={4.5} strokeLinecap="round" />
          {/* Top tube — slightly sloped (TCR compact) */}
          <line x1={ST_TOP_X} y1={ST_TOP_Y} x2={HT_TOP_X} y2={HT_TOP_Y}
            stroke={`${O}0.65)`} strokeWidth={4} strokeLinecap="round" />
          {/* Down tube — wide, main structural tube */}
          <line x1={BBX} y1={BBY} x2={HT_BOT_X} y2={HT_BOT_Y}
            stroke={`${O}0.7)`} strokeWidth={5} strokeLinecap="round" />
          {/* Head tube */}
          <line x1={HT_TOP_X} y1={HT_TOP_Y} x2={HT_BOT_X} y2={HT_BOT_Y}
            stroke={`${O}0.8)`} strokeWidth={6} strokeLinecap="round" />

          {/* ── FORK ── */}
          {/* Fork blades — slight forward curve then down to front axle */}
          <path
            d={`M ${HT_BOT_X} ${HT_BOT_Y} C ${HT_BOT_X + 4} ${HT_BOT_Y + 22} ${FX + 2} ${AY - 18} ${FX} ${AY}`}
            fill="none" stroke={`${O}0.55)`} strokeWidth={3} strokeLinecap="round"
          />

          {/* ── SADDLE + SEAT POST ── */}
          {/* Seat post — extends above seat tube */}
          <line x1={ST_TOP_X} y1={ST_TOP_Y} x2={ST_TOP_X - 4} y2={ST_TOP_Y - 25}
            stroke={`${O}0.45)`} strokeWidth={3} strokeLinecap="round" />
          {/* Saddle — low-profile road saddle */}
          <path
            d={`M ${ST_TOP_X - 22} ${ST_TOP_Y - 27} C ${ST_TOP_X - 14} ${ST_TOP_Y - 31} ${ST_TOP_X + 2} ${ST_TOP_Y - 30} ${ST_TOP_X + 12} ${ST_TOP_Y - 26}`}
            fill="none" stroke={`${O}0.65)`} strokeWidth={3.5} strokeLinecap="round"
          />
          {/* Saddle rail (underneath, thin) */}
          <line x1={ST_TOP_X - 18} y1={ST_TOP_Y - 25} x2={ST_TOP_X + 10} y2={ST_TOP_Y - 24}
            stroke={`${O}0.2)`} strokeWidth={1} />

          {/* ── STEM + HANDLEBARS ── */}
          {/* Stem — rises slightly forward from top of head tube */}
          <line x1={HT_TOP_X} y1={HT_TOP_Y} x2={HT_TOP_X + 18} y2={HT_TOP_Y - 10}
            stroke={`${O}0.55)`} strokeWidth={4} strokeLinecap="round" />
          {/* Handlebar clamp area */}
          <circle cx={HT_TOP_X + 18} cy={HT_TOP_Y - 10} r={4} fill={`${O}0.25)`} stroke={`${O}0.5)`} strokeWidth={1.5} />
          {/* Drop bar tops */}
          <line x1={HT_TOP_X + 8} y1={HT_TOP_Y - 12} x2={HT_TOP_X + 28} y2={HT_TOP_Y - 12}
            stroke={`${O}0.5)`} strokeWidth={3} strokeLinecap="round" />
          {/* Right drop — curves down and back (hood + drop) */}
          <path
            d={`M ${HT_TOP_X + 28} ${HT_TOP_Y - 12} C ${HT_TOP_X + 32} ${HT_TOP_Y - 12} ${HT_TOP_X + 36} ${HT_TOP_Y - 8} ${HT_TOP_X + 36} ${HT_TOP_Y + 4} C ${HT_TOP_X + 36} ${HT_TOP_Y + 14} ${HT_TOP_X + 30} ${HT_TOP_Y + 18} ${HT_TOP_X + 22} ${HT_TOP_Y + 17}`}
            fill="none" stroke={`${O}0.5)`} strokeWidth={2.5} strokeLinecap="round"
          />
          {/* Left drop */}
          <path
            d={`M ${HT_TOP_X + 8} ${HT_TOP_Y - 12} C ${HT_TOP_X + 4} ${HT_TOP_Y - 12} ${HT_TOP_X} ${HT_TOP_Y - 8} ${HT_TOP_X} ${HT_TOP_Y + 4} C ${HT_TOP_X} ${HT_TOP_Y + 14} ${HT_TOP_X + 6} ${HT_TOP_Y + 18} ${HT_TOP_X + 14} ${HT_TOP_Y + 17}`}
            fill="none" stroke={`${O}0.4)`} strokeWidth={2} strokeLinecap="round"
          />
          {/* Brake lever hoods */}
          <ellipse cx={HT_TOP_X + 32} cy={HT_TOP_Y - 4} rx={4} ry={6}
            fill={`${O}0.12)`} stroke={`${O}0.3)`} strokeWidth={1} />

          {/* ── GROUND SHADOW ── */}
          <ellipse cx={258} cy={226} rx={160} ry={6} fill={`${O}0.05)`} />

          {/* ── GLOW BEHIND FRAME (subtle) ── */}
          <line x1={BBX} y1={BBY} x2={ST_TOP_X} y2={ST_TOP_Y}
            stroke={`${O}0.15)`} strokeWidth={12} strokeLinecap="round"
            filter="url(#bc-glow)" />
          <line x1={BBX} y1={BBY} x2={HT_BOT_X} y2={HT_BOT_Y}
            stroke={`${O}0.12)`} strokeWidth={14} strokeLinecap="round"
            filter="url(#bc-glow)" />
        </svg>
      </div>

      {/* Spec list */}
      <div className="px-6 pb-6 divide-y divide-white/[0.05]">
        {SPECS.map((spec, i) => (
          <div
            key={spec.label}
            className="flex items-start justify-between py-3 cursor-default group"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="text-xs text-slate-600 w-20 flex-shrink-0 pt-0.5">{spec.label}</span>
            <div className="flex-1 text-right">
              <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                {spec.value}
              </p>
              <p
                className="text-xs text-slate-600 transition-all duration-300 overflow-hidden"
                style={{ maxHeight: hovered === i ? '20px' : '0', opacity: hovered === i ? 1 : 0 }}
              >
                {spec.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
