import React from 'react';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorMessage from '../ui/ErrorMessage';
import EmptyState from '../ui/EmptyState';

export default function ChartWrapper({ title, loading, error, empty, onRetry, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {title && <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>}
      {loading && <LoadingSpinner size="sm" text="Loading chart..." />}
      {!loading && error && <ErrorMessage message={error} onRetry={onRetry} />}
      {!loading && !error && empty && <EmptyState description="No data available for this period." />}
      {!loading && !error && !empty && children}
    </div>
  );
}
