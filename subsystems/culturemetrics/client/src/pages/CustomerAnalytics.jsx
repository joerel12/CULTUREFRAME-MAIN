import React from 'react';
import Header from '../components/layout/Header';
import DateRangeFilter from '../components/filters/DateRangeFilter';
import MetricCard from '../components/ui/MetricCard';
import CustomerTrendChart from '../components/charts/CustomerTrendChart';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import { useAnalytics } from '../hooks/useAnalytics';
import { useDateFilter } from '../hooks/useDateFilter';
import { analyticsService } from '../services/analyticsService';
import { Users, UserCheck, Repeat, TrendingUp } from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('en-PH');

export default function CustomerAnalytics() {
  const { startDate, endDate, setStartDate, setEndDate, setPreset } = useDateFilter(90);

  const { data, loading, error, refetch } = useAnalytics(
    () => analyticsService.getCustomers({ startDate, endDate }),
    { startDate, endDate }
  );

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        <DateRangeFilter startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} onPreset={setPreset} />

        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2 text-xs text-blue-700">
          <strong>Privacy:</strong> Only aggregate counts are displayed. No personal identifiers are shown.
          Repeat rate = customers with ≥2 orders ÷ customers with ≥1 order × 100.
        </div>

        {loading && <LoadingSpinner />}
        {!loading && error && <ErrorMessage message={error} onRetry={refetch} />}
        {!loading && !error && data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard title="Registered Customers" value={fmt(data.totalRegistered)} icon={Users} color="forest" />
              <MetricCard title="New This Period" value={fmt(data.newThisPeriod)} icon={TrendingUp} color="blue" />
              <MetricCard title="With ≥1 Order" value={fmt(data.withAtLeastOneOrder)} icon={UserCheck} color="teal" />
              <MetricCard title="Repeat Customers" value={fmt(data.repeatCustomers)} icon={Repeat} color="purple" />
            </div>

            <div className="card text-center py-6">
              <p className="text-xs text-gray-500 mb-1">Repeat Customer Rate</p>
              <p className="text-4xl font-bold text-forest-700">{data.repeatRate}%</p>
              <p className="text-xs text-gray-400 mt-1">{data.repeatRateFormula}</p>
            </div>

            <CustomerTrendChart data={data.registrationTrend || []} />
          </>
        )}
      </div>
    </div>
  );
}
