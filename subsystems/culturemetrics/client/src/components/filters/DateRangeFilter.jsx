import React from 'react';
import { Calendar } from 'lucide-react';

const PRESETS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
];

export default function DateRangeFilter({ startDate, endDate, onStartChange, onEndChange, onPreset }) {
  const updateStart = (value) => {
    onStartChange(value);
    if (value && endDate && value > endDate) onEndChange(value);
  };
  const updateEnd = (value) => {
    onEndChange(value);
    if (value && startDate && value < startDate) onStartChange(value);
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5" aria-label="Analytics date range">
      <Calendar size={16} className="text-forest-600" aria-hidden="true" />
      {PRESETS.map((p) => (
        <button
          key={p.days}
          type="button"
          onClick={() => onPreset?.(p.days)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-forest-500 hover:text-forest-700"
        >
          {p.label}
        </button>
      ))}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={startDate}
          max={endDate || undefined}
          onChange={(e) => updateStart(e.target.value)}
          className="input w-36 text-xs"
          aria-label="Start date"
        />
        <span className="text-xs text-gray-400">to</span>
        <input
          type="date"
          value={endDate}
          min={startDate || undefined}
          onChange={(e) => updateEnd(e.target.value)}
          className="input w-36 text-xs"
          aria-label="End date"
        />
      </div>
    </div>
  );
}
