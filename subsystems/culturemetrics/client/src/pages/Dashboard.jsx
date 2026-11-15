import React from 'react';
import {
  DollarSign, ShoppingCart, Users, Package,
  Calendar, Landmark, MapPin, CheckCircle, RefreshCw,
} from 'lucide-react';
import Header from '../components/layout/Header';
import MetricCard from '../components/ui/MetricCard';
import RevenueTrendChart from '../components/charts/RevenueTrendChart';
import OrderStatusChart from '../components/charts/OrderStatusChart';
import TopProductsChart from '../components/charts/TopProductsChart';
import CategoryRevenueChart from '../components/charts/CategoryRevenueChart';
import EventRegistrationsChart from '../components/charts/EventRegistrationsChart';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import DataModeBadge from '../components/ui/DataModeBadge';
import { useAnalytics } from '../hooks/useAnalytics';
import { analyticsService } from '../services/analyticsService';

const fmt = (n) => Number(n || 0).toLocaleString('en-PH');
const fmtCurrency = (n) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(Number(n || 0));

export default function Dashboard() {
  const { data: overview, loading: ovLoading, error: ovError, refetch: refetchOv } = useAnalytics(
    () => analyticsService.getOverview()
  );

  const { data: sales, loading: sLoading, error: sError, refetch: refetchSales } = useAnalytics(
    () => analyticsService.getSales({ granularity: 'day' })
  );

  const { data: orders, loading: oLoading, error: oError, refetch: refetchOrders } = useAnalytics(
    () => analyticsService.getOrders()
  );

  const { data: events, loading: eLoading, error: eError, refetch: refetchEvents } = useAnalytics(
    () => analyticsService.getEvents()
  );

  const dataMode = overview?._dataMode || sales?._dataMode || 'mock';
  const refreshDashboard = () => Promise.all([refetchOv(), refetchSales(), refetchOrders(), refetchEvents()]);

  return (
    <div className="flex flex-col h-full">
      <Header onRefresh={refreshDashboard} />

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Demo data warning banner */}
        {dataMode === 'mock' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
            <DataModeBadge mode="mock" />
            <p className="text-sm text-amber-800">
              <strong>Demo mode:</strong> This page uses fictional sample data. Live mode is selected through server configuration; CultureFrame analytics endpoints must be implemented before real data is available.
              {overview?._ephemeralStorage && <span className="block mt-1 font-semibold">This server is using ephemeral in-memory storage. Login changes, sync history, and diagnostics are not persistent and will reset on restart.</span>}
            </p>
          </div>
        )}

        {/* Metric cards */}
        {ovLoading ? (
          <LoadingSpinner text="Loading metrics..." />
        ) : ovError ? (
          <ErrorMessage message={ovError} onRetry={refetchOv} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            <MetricCard title="Total Revenue" value={fmtCurrency(overview?.totalRevenue)} icon={DollarSign} color="forest" />
            <MetricCard title="Total Orders" value={fmt(overview?.totalOrders)} icon={ShoppingCart} color="blue" />
            <MetricCard title="Completed Orders" value={fmt(overview?.completedOrders)} icon={CheckCircle} color="teal" />
            <MetricCard title="Registered Customers" value={fmt(overview?.totalCustomers)} icon={Users} color="purple" />
            <MetricCard title="Total Products" value={fmt(overview?.totalProducts)} icon={Package} color="gold" />
            <MetricCard title="Event Registrations" value={fmt(overview?.totalEventRegistrations)} icon={Calendar} color="clay" />
            <MetricCard title="Heritage Sites" value={fmt(overview?.totalHeritageSites)} icon={Landmark} color="forest" />
            <MetricCard title="Scenic Destinations" value={fmt(overview?.totalScenicDestinations)} icon={MapPin} color="blue" />
          </div>
        )}

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <RevenueTrendChart
            data={sales?.trend || []}
            loading={sLoading}
            error={sError}
          />
          <OrderStatusChart
            data={orders?.byStatus || []}
            loading={oLoading}
            error={oError}
          />
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <TopProductsChart
            data={sales?.topProducts || []}
            loading={sLoading}
            error={sError}
          />
          <CategoryRevenueChart
            data={sales?.byCategory || []}
            loading={sLoading}
            error={sError}
          />
        </div>

        {/* Event chart */}
        <EventRegistrationsChart
          data={events?.byEvent || []}
          loading={eLoading}
          error={eError}
        />
      </div>
    </div>
  );
}
