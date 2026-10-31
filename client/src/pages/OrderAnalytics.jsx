import React, { useState } from 'react';
import Header from '../components/layout/Header';
import DateRangeFilter from '../components/filters/DateRangeFilter';
import MetricCard from '../components/ui/MetricCard';
import OrderStatusChart from '../components/charts/OrderStatusChart';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import { useAnalytics } from '../hooks/useAnalytics';
import { useDateFilter } from '../hooks/useDateFilter';
import { analyticsService } from '../services/analyticsService';
import { reportService } from '../services/reportService';
import { ShoppingCart, CheckCircle, XCircle, TrendingDown, Download } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const fmt = (n) => Number(n || 0).toLocaleString('en-PH');
const fmtCurrency = (n) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(Number(n || 0));

export default function OrderAnalytics() {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const { startDate, endDate, setStartDate, setEndDate, setPreset } = useDateFilter(30);

  const { data, loading, error, refetch } = useAnalytics(
    () => analyticsService.getOrders({ startDate, endDate }),
    { startDate, endDate }
  );

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <DateRangeFilter startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} onPreset={setPreset} />
          <button
            onClick={async () => {
              setExporting(true);
              setExportError('');
              try { await reportService.download('orders', { startDate, endDate }); }
              catch (err) { setExportError(err.message); }
              finally { setExporting(false); }
            }}
            disabled={exporting}
            className="btn-secondary flex items-center gap-1.5 text-xs"
          >
            <Download size={14} /> {exporting ? 'Preparing…' : 'Export CSV'}
          </button>
        </div>
        {exportError && <p role="alert" className="text-sm text-red-700">{exportError}</p>}

        {loading && <LoadingSpinner />}
        {!loading && error && <ErrorMessage message={error} onRetry={refetch} />}
        {!loading && !error && data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard title="Total Orders" value={fmt(data.totalOrders)} icon={ShoppingCart} color="blue" />
              <MetricCard title="Completed Orders" value={fmt(data.qualifyingOrders)} icon={CheckCircle} color="forest" />
              <MetricCard title="Cancelled Orders" value={fmt(data.cancelledOrders)} icon={XCircle} color="clay" />
              <MetricCard title="Avg Order Value" value={fmtCurrency(data.avgOrderValue)} icon={TrendingDown} color="gold" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <p className="text-xs text-gray-500 mb-1">Completion Rate</p>
                <p className="text-3xl font-bold text-forest-700">{data.completionRate}%</p>
              </div>
              <div className="card">
                <p className="text-xs text-gray-500 mb-1">Cancellation Rate</p>
                <p className="text-3xl font-bold text-red-500">{data.cancellationRate}%</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <OrderStatusChart data={data.byStatus || []} />

              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Order Trend</h3>
                {data.monthlyTrend?.length ? (
                  <ResponsiveContainer width="100%" height={230}>
                    <LineChart data={data.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="completed" stroke="#2e7d32" name="Completed" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="cancelled" stroke="#ef4444" name="Cancelled" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">No monthly data available.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
