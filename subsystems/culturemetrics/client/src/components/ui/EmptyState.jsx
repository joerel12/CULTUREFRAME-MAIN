import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function EmptyState({ title = 'No data available', description }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <BarChart3 className="text-gray-300" size={36} />
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {description && <p className="text-xs text-gray-400 max-w-sm">{description}</p>}
    </div>
  );
}
