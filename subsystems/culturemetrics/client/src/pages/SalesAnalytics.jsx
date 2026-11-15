import React from 'react';
import Header from '../components/layout/Header';
import DateRangeFilter from '../components/filters/DateRangeFilter';
import MetricCard from '../components/ui/MetricCard';
import RevenueTrendChart from '../components/charts/RevenueTrendChart';
import CategoryRevenueChart from '../components/charts/CategoryRevenueChart';
import TopProductsChart from '../components/charts/TopProductsChart';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import { useAnalytics } from '../hooks/useAnalytics';
import { useDateFilter } from '../hooks/useDateFilter';
import { analyticsService } from '../services/analyticsService';
import { reportService } from '../services/reportService';
import { DollarSign, TrendingUp, ShoppingBag, BarChart2, Download } from 'lucide-react';

const fmtCurrency = (n) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(Number(n || 0));
const fmt = (n) => Number(n || 0).toLocaleString('en-PH');

export default function SalesAnalytics() {
  const { startDate, endDate, setStartDate, setEndDate, setPreset } = useDateFilter(30);

  const { data, loading, error, refetch } = useAnalytics(
    () => analyticsService.getSales({ startDate, endDate }),
    { startDate, endDate }
  );

  const [exporting, setExporting] = React.useState(false);
  const [exportError, setExportError] = React.useState('');

  const handleExport = async () => {
    setExporting(true);
    setExportError('');
    try {
      await reportService.download('sales', { startDate, endDate });
    } catch (error) {
      setExportError(error.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
            onPreset={setPreset}
          />
          <button onClick={handleExport} disabled={exporting} className="btn-secondary flex items-center gap-1.5 text-xs">
            <Download size={14} /> {exporting ? 'Preparing…' : 'Export CSV'}
          </button>
        </div>
        {exportError && <p role="alert" className="text-sm text-red-700">{exportError}</p>}

        {/* Metric definitions note */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2 text-xs text-blue-700">
          <strong>Gross sales</strong> = sum of subtotals for completed/paid orders. 
          <strong> Net sales</strong> = gross minus confirmed refunds. 
          Cancelled and unpaid orders are excluded.
        </div>

        {loading && <LoadingSpinner />}
        {!loading && error && <ErrorMessage message={error} onRetry={refetch} />}
        {!loading && !error && data && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard title="Gross Sales" value={fmtCurrency(data.grossSales)} icon={DollarSign} color="forest" />
              <MetricCard title="Net Sales" value={fmtCurrency(data.netSales)} icon={TrendingUp} color="teal" />
              <MetricCard title="Qualifying Orders" value={fmt(data.qualifyingOrders)} icon={ShoppingBag} color="blue" />
              <MetricCard title="Avg Order Value" value={fmtCurrency(data.avgOrderValue)} icon={BarChart2} color="gold" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <RevenueTrendChart data={data.trend || []} />
              <CategoryRevenueChart data={data.byCategory || []} />
            </div>

            <TopProductsChart data={data.topProducts || []} />

            {/* Cancelled / Refunds */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MetricCard title="Cancelled Orders" value={fmt(data.cancelledOrders)} color="clay" />
              <MetricCard title="Total Refunds" value={fmtCurrency(data.totalRefunds)} color="clay" />
              <MetricCard title="Total Orders" value={fmt(data.totalOrders)} color="blue" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
