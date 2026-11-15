import React, { useState } from 'react';
import Header from '../components/layout/Header';
import DateRangeFilter from '../components/filters/DateRangeFilter';
import { useDateFilter } from '../hooks/useDateFilter';
import { FileText, Download, AlertCircle } from 'lucide-react';
import { reportService } from '../services/reportService';

const REPORTS = [
  { id: 'sales', label: 'Sales Report', desc: 'Revenue trend by period, including gross/net sales breakdown.' },
  { id: 'products', label: 'Products Report', desc: 'Ranked product performance with units sold and revenue.' },
  { id: 'orders', label: 'Orders Report', desc: 'Order counts grouped by status.' },
  { id: 'events', label: 'Events Report', desc: 'Event registrations and attendance data.' },
  { id: 'destinations', label: 'Destinations Report', desc: 'Heritage sites and scenic destinations with view counts.' },
];

export default function Reports() {
  const { startDate, endDate, setStartDate, setEndDate, setPreset } = useDateFilter(30);
  const [errors, setErrors] = useState({});
  const [downloading, setDownloading] = useState(null);

  const download = async (report) => {
    setErrors((prev) => ({ ...prev, [report.id]: null }));
    setDownloading(report.id);
    try {
      await reportService.download(report.id, { startDate, endDate });
    } catch (err) {
      setErrors((prev) => ({ ...prev, [report.id]: err.message || 'Failed to generate report.' }));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Date Range</h3>
          <DateRangeFilter startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} onPreset={setPreset} />
          <p className="text-xs text-gray-400 mt-2">The selected range applies to sales, products, orders and events reports. Destination lists are catalog snapshots.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {REPORTS.map((report) => (
            <div key={report.id} className="card flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-forest-50 rounded-lg shrink-0">
                  <FileText className="text-forest-600" size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 text-sm">{report.label}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">{report.desc}</p>
                </div>
              </div>

              {errors[report.id] && (
                <div className="flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle size={13} />
                  {errors[report.id]}
                </div>
              )}

              <button
                onClick={() => download(report)}
                disabled={downloading !== null}
                className="btn-primary flex items-center justify-center gap-1.5 mt-auto"
              >
                <Download size={14} />
                {downloading === report.id ? 'Preparing…' : 'Download CSV'}
              </button>
            </div>
          ))}
        </div>

        <div className="card bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">About CSV Reports</h3>
          <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
            <li>Reports are generated from the same data shown in the dashboard.</li>
            <li>Files are formatted as UTF-8 CSV, safe to open in Excel or Google Sheets.</li>
            <li>Reports do not contain passwords, tokens, or payment credentials.</li>
            <li>Demo data reports are labeled with a DEMO DATA header.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
