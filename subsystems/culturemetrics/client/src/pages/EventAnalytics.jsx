import React from 'react';
import Header from '../components/layout/Header';
import DateRangeFilter from '../components/filters/DateRangeFilter';
import MetricCard from '../components/ui/MetricCard';
import EventRegistrationsChart from '../components/charts/EventRegistrationsChart';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import EmptyState from '../components/ui/EmptyState';
import { useAnalytics } from '../hooks/useAnalytics';
import { useDateFilter } from '../hooks/useDateFilter';
import { analyticsService } from '../services/analyticsService';
import { reportService } from '../services/reportService';
import { Calendar, Users, XCircle, Clock, Download } from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('en-PH');

export default function EventAnalytics() {
  const [exporting, setExporting] = React.useState(false);
  const [exportError, setExportError] = React.useState('');
  const { startDate, endDate, setStartDate, setEndDate, setPreset } = useDateFilter(90);

  const { data, loading, error, refetch } = useAnalytics(
    () => analyticsService.getEvents({ startDate, endDate }),
    { startDate, endDate }
  );

  const exportCsv = async () => {
    setExporting(true);
    setExportError('');
    try { await reportService.download('events', { startDate, endDate }); }
    catch (err) { setExportError(err.message); }
    finally { setExporting(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <DateRangeFilter startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} onPreset={setPreset} />
          <button onClick={exportCsv} disabled={exporting} className="btn-secondary flex items-center gap-1.5 text-xs">
            <Download size={14} /> {exporting ? 'Preparing…' : 'Export CSV'}
          </button>
        </div>
        {exportError && <p role="alert" className="text-sm text-red-700">{exportError}</p>}

        {!data?.hasAttendanceData && !loading && !error && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-2 text-xs text-amber-700">
            <strong>Note:</strong> Attendance check-in data is not available from CultureFrame. Registration counts are shown instead.
            Registration ≠ confirmed attendance.
          </div>
        )}

        {loading && <LoadingSpinner />}
        {!loading && error && <ErrorMessage message={error} onRetry={refetch} />}
        {!loading && !error && data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard title="Total Events" value={fmt(data.totalEvents)} icon={Calendar} color="blue" />
              <MetricCard title="Upcoming Events" value={fmt(data.upcomingEvents)} icon={Clock} color="gold" />
              <MetricCard title="Total Registrations" value={fmt(data.totalRegistrations)} icon={Users} color="forest" />
              <MetricCard title="Cancelled Registrations" value={fmt(data.totalCancelledRegistrations)} icon={XCircle} color="clay" />
            </div>

            <EventRegistrationsChart data={data.byEvent || []} />

            {/* Event table */}
            <div className="card overflow-x-auto">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Event Details</h3>
              {data.byEvent?.length === 0 ? (
                <EmptyState description="No events found for this period." />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500 text-xs">
                      <th className="text-left pb-2 pr-4">Event</th>
                      <th className="text-left pb-2 pr-4">Date</th>
                      <th className="text-left pb-2 pr-4">Status</th>
                      <th className="text-right pb-2 pr-4">Registrations</th>
                      <th className="text-right pb-2 pr-4">Cancelled</th>
                      <th className="text-right pb-2">Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byEvent.map((e) => (
                      <tr key={e.eventId} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 pr-4 font-medium text-gray-800">{e.name}</td>
                        <td className="py-2 pr-4 text-gray-500">{e.startDate || '—'}</td>
                        <td className="py-2 pr-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${e.status === 'upcoming' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-right font-medium">{fmt(e.totalRegistrations)}</td>
                        <td className="py-2 pr-4 text-right text-red-500">{fmt(e.cancelledRegistrations)}</td>
                        <td className="py-2 text-right text-gray-400">{e.confirmedAttendance ?? 'N/A'}</td>
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
