import React from 'react';

export default function MetricCard({ title, value, subtitle, icon: Icon, color = 'forest', unavailable = false }) {
  const colorMap = {
    forest: 'bg-forest-50 text-forest-700',
    gold: 'bg-gold-50 text-gold-700',
    clay: 'bg-orange-50 text-orange-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    teal: 'bg-teal-50 text-teal-700',
  };

  return (
    <div className="metric-card">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{title}</p>
          {unavailable ? (
            <p className="text-sm text-gray-400 mt-1">Unavailable</p>
          ) : (
            <p className="text-2xl font-bold text-gray-800 mt-1">{value ?? '—'}</p>
          )}
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${colorMap[color] || colorMap.forest} shrink-0 ml-3`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
