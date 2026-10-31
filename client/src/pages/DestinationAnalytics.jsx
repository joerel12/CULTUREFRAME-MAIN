import React, { useState } from 'react';
import Header from '../components/layout/Header';
import MetricCard from '../components/ui/MetricCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import EmptyState from '../components/ui/EmptyState';
import { useAnalytics } from '../hooks/useAnalytics';
import { analyticsService } from '../services/analyticsService';
import { reportService } from '../services/reportService';
import { MapPin, Landmark, Eye, Globe, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const fmt = (n) => Number(n || 0).toLocaleString('en-PH');

export default function DestinationAnalytics() {
  const [tab, setTab] = useState('heritage');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const { data, loading, error, refetch } = useAnalytics(
    () => analyticsService.getDestinations()
  );

  const current = tab === 'heritage' ? data?.heritage : data?.scenic;

  const exportCsv = async () => {
    setExporting(true);
    setExportError('');
    try { await reportService.download('destinations'); }
    catch (err) { setExportError(err.message); }
    finally { setExporting(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Important disclaimer */}
        {!loading && !error && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-2 text-xs text-amber-700">
            <strong>Important:</strong> {data?.importantNote}
          </div>
        )}

        {!data?.hasViewData && !loading && !error && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2 text-xs text-blue-700">
            View tracking is not available from CultureFrame. Content counts are displayed instead.
          </div>
        )}

        {loading && <LoadingSpinner />}
        {!loading && error && <ErrorMessage message={error} onRetry={refetch} />}
        {!loading && !error && data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard title="Heritage Sites" value={fmt(data.heritage?.total)} icon={Landmark} color="forest" />
              <MetricCard title="Published Heritage" value={fmt(data.heritage?.published)} color="teal" />
              <MetricCard title="Scenic Destinations" value={fmt(data.scenic?.total)} icon={MapPin} color="blue" />
              <MetricCard title="With GPS Coordinates" value={fmt(data.scenic?.withCoordinates)} icon={Globe} color="gold" />
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setTab('heritage')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'heritage' ? 'bg-forest-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                <Landmark size={15} className="inline mr-1.5" />Heritage
              </button>
              <button
                onClick={() => setTab('scenic')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'scenic' ? 'bg-forest-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                <MapPin size={15} className="inline mr-1.5" />Scenic
              </button>
            </div>

            {current && (
              <>
                {/* Category breakdown */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">By Category</h3>
                  {current.byCategory?.length ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={current.byCategory} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#2e7d32" radius={[4, 4, 0, 0]} name="Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState description="No category data." />
                  )}
                </div>

                {/* Top by views */}
                {current.viewTrackingAvailable && (
                  <div className="card">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Top by View Count</h3>
                    <div className="space-y-2">
                      {current.topByViews.slice(0, 8).map((item, i) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <span className="text-xs font-mono text-gray-400 w-5">#{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">{item.name}</div>
                            <div className="text-xs text-gray-400">{item.category}</div>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-600 shrink-0">
                            <Eye size={13} />
                            {fmt(item.viewCount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end">
              <button onClick={exportCsv} disabled={exporting} className="btn-secondary flex items-center gap-1.5 text-xs">
                <Download size={14} /> {exporting ? 'Preparing…' : 'Export CSV'}
              </button>
            </div>
            {exportError && <p role="alert" className="text-sm text-red-700">{exportError}</p>}
          </>
        )}
      </div>
    </div>
  );
}
