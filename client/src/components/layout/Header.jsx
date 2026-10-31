import React from 'react';
import { useLocation } from 'react-router-dom';
import { RefreshCw, WifiOff, Wifi, FlaskConical } from 'lucide-react';
import { useIntegrationStatus } from '../../hooks/useIntegrationStatus';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/sales': 'Sales Analytics',
  '/products': 'Product & Craft Analytics',
  '/orders': 'Order Analytics',
  '/customers': 'Customer Analytics',
  '/events': 'Event Analytics',
  '/destinations': 'Heritage & Scenic Analytics',
  '/reports': 'Reports',
  '/integration': 'CultureFrame Integration',
  '/settings': 'Settings',
};

const PAGE_DESCRIPTIONS = {
  '/dashboard': 'A clear view of commerce, culture and visitor activity.',
  '/sales': 'Revenue performance across the selected period.',
  '/products': 'Product performance and category contribution.',
  '/orders': 'Order volume, fulfillment and cancellations.',
  '/customers': 'Privacy-safe customer and repeat-purchase trends.',
  '/events': 'Registrations and attendance where check-in data exists.',
  '/destinations': 'Published cultural heritage and scenic places.',
  '/reports': 'Export the data you need for your next review.',
  '/integration': 'Connection readiness, data checks and run history.',
  '/settings': 'Administrator profile and account security.',
};

function IntegrationChip({ status }) {
  if (!status) return null;

  if (status.dataMode === 'mock') {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium" title={status.persistenceNotice || 'Demo data mode'}>
        <FlaskConical size={11} />
        {status.ephemeralStorage ? 'Ephemeral Demo' : 'Demo Mode'}
      </span>
    );
  }

  if (status.dataMode === 'live') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border ${
        status.integrationEnabled
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : 'bg-orange-50 text-orange-800 border-orange-200'
      }`}>
        {status.integrationEnabled ? <Wifi size={12} /> : <WifiOff size={12} />}
        <span>Live mode</span>
        <span className="hidden sm:inline">{status.integrationEnabled ? '· connection unverified' : '· integration disabled'}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold border border-gray-200">
      <WifiOff size={11} />
      <span className="hidden sm:inline">Integration unavailable</span>
      <span className="sm:hidden">No link</span>
    </span>
  );
}

export default function Header({ onRefresh }) {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] || 'CultureMetrics';
  const integrationStatus = useIntegrationStatus();

  const formattedSync = integrationStatus?.lastSuccessfulSyncAt
    ? new Date(integrationStatus.lastSuccessfulSyncAt).toLocaleString('en-PH', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : null;

  return (
    <header className="sticky top-0 z-30 flex min-h-[78px] items-center justify-between gap-4 border-b border-[#e8ebe6] bg-white/95 px-4 py-3 backdrop-blur sm:px-7">
      <div className="min-w-0 pl-12 lg:pl-0">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[.17em] text-forest-600">CultureFrame analytics</p>
        <h1 className="truncate text-lg font-bold leading-tight text-[#18372b] sm:text-xl">{title}</h1>
        <p className="hidden truncate pt-1 text-xs text-gray-500 sm:block">{PAGE_DESCRIPTIONS[pathname] || 'CultureMetrics analytics workspace.'}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {formattedSync && (
          <span className="hidden text-[11px] text-gray-500 xl:block">
            Last successful run · {formattedSync}
          </span>
        )}
        <IntegrationChip status={integrationStatus} />
        {onRefresh && (
          <button onClick={onRefresh} className="btn-secondary flex items-center gap-1.5 px-3 text-xs" title="Refresh page data">
            <RefreshCw size={13} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}
      </div>
    </header>
  );
}
