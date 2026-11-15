import React, { useState } from 'react';
import Header from '../components/layout/Header';
import DateRangeFilter from '../components/filters/DateRangeFilter';
import MetricCard from '../components/ui/MetricCard';
import CategoryRevenueChart from '../components/charts/CategoryRevenueChart';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import EmptyState from '../components/ui/EmptyState';
import { useAnalytics } from '../hooks/useAnalytics';
import { useDateFilter } from '../hooks/useDateFilter';
import { analyticsService } from '../services/analyticsService';
import { reportService } from '../services/reportService';
import { Package, Download, ChevronUp, ChevronDown } from 'lucide-react';

const fmtCurrency = (n) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(Number(n || 0));

export default function ProductAnalytics() {
  const { startDate, endDate, setStartDate, setEndDate, setPreset } = useDateFilter(30);
  const [sortField, setSortField] = useState('grossSales');
  const [sortDir, setSortDir] = useState('desc');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const { data, loading, error, refetch } = useAnalytics(
    () => analyticsService.getProducts({ startDate, endDate }),
    { startDate, endDate }
  );

  const handleSort = (field) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const sorted = [...(data?.rankedProducts || [])].sort((a, b) => {
    const av = parseFloat(a[sortField] || '0');
    const bv = parseFloat(b[sortField] || '0');
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const SortIcon = ({ field }) =>
    sortField === field ? (sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : null;

  const handleExport = async () => {
    setExporting(true);
    setExportError('');
    try { await reportService.download('products', { startDate, endDate }); }
    catch (err) { setExportError(err.message); }
    finally { setExporting(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <DateRangeFilter startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} onPreset={setPreset} />
          <button onClick={handleExport} disabled={exporting} className="btn-secondary flex items-center gap-1.5 text-xs">
            <Download size={14} /> {exporting ? 'Preparing…' : 'Export CSV'}
          </button>
        </div>
        {exportError && <p role="alert" className="text-sm text-red-700">{exportError}</p>}

        {loading && <LoadingSpinner />}
        {!loading && error && <ErrorMessage message={error} onRetry={refetch} />}
        {!loading && !error && data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard title="Total Products" value={data.totalProducts} icon={Package} color="forest" />
              <MetricCard title="Products with Sales" value={data.productsWithSales} color="teal" />
              <MetricCard title="Zero Sales" value={data.productsWithZeroSales} color="clay" />
              <MetricCard title="Categories" value={data.byCategory?.length || 0} color="gold" />
            </div>

            <CategoryRevenueChart data={data.byCategory || []} />

            {/* Product table */}
            <div className="card overflow-x-auto">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Product Performance</h3>
              {sorted.length === 0 ? (
                <EmptyState description="No product data for this period." />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500 text-xs">
                      <th className="text-left pb-2 pr-3">Rank</th>
                      <th className="text-left pb-2 pr-3">Product</th>
                      <th className="text-left pb-2 pr-3">Category</th>
                      <th className="text-right pb-2 pr-3">
                        <button type="button" className="ml-auto flex items-center justify-end gap-1" onClick={() => handleSort('unitsSold')}>Units Sold <SortIcon field="unitsSold" /></button>
                      </th>
                      <th className="text-right pb-2 pr-3">
                        <button type="button" className="ml-auto flex items-center justify-end gap-1" onClick={() => handleSort('grossSales')}>Gross Sales <SortIcon field="grossSales" /></button>
                      </th>
                      <th className="text-right pb-2 pr-3">Price</th>
                      <th className="text-right pb-2">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((p) => (
                      <tr key={p.productId} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 pr-3 text-gray-400 font-mono text-xs">#{p.rank}</td>
                        <td className="py-2 pr-3 font-medium text-gray-800">{p.productName}</td>
                        <td className="py-2 pr-3 text-gray-500">{p.category}</td>
                        <td className="py-2 pr-3 text-right">{p.unitsSold.toLocaleString()}</td>
                        <td className="py-2 pr-3 text-right font-medium text-forest-700">{fmtCurrency(p.grossSales)}</td>
                        <td className="py-2 pr-3 text-right">{p.currentPrice ? `₱${p.currentPrice}` : '—'}</td>
                        <td className="py-2 text-right">{p.currentStock ?? 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
