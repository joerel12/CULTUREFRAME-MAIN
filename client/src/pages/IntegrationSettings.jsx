import React, { useState } from 'react';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import { useAnalytics } from '../hooks/useAnalytics';
import { integrationService } from '../services/integrationService';
import { CheckCircle, XCircle, RefreshCw, Wifi, WifiOff, Clock, AlertTriangle, ShieldCheck, Database, CircleHelp } from 'lucide-react';

const fmt = (d) => d ? new Date(d).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never';

function StatusRow({ label, ok, note }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        {ok
          ? <CheckCircle size={15} className="text-green-500" />
          : <XCircle size={15} className="text-red-400" />}
        <span className={`text-xs ${ok ? 'text-green-600' : 'text-red-500'}`}>{ok ? 'Ready' : 'Not ready'}</span>
      </div>
    </div>
  );
}

export default function IntegrationSettings() {
  const { data: status, loading, error, refetch } = useAnalytics(() => integrationService.getStatus());
  const { data: config, refetch: refetchConfig } = useAnalytics(() => integrationService.getConfigurationStatus());
  const { data: history, refetch: refetchHistory } = useAnalytics(() => integrationService.getSyncHistory(10));

  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const handleTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await integrationService.testConnection();
      setTestResult(res);
    } catch (err) {
      setTestResult({
        success: false,
        data: { result: 'failure', message: err.response?.data?.error?.message || err.message || 'Connection test failed.' },
      });
    } finally {
      setTestLoading(false);
      refetch();
      refetchConfig();
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const res = await integrationService.syncNow();
      setSyncResult(res);
    } catch (err) {
      setSyncResult({
        success: false,
        error: { message: err.response?.data?.error?.message || err.message },
        data: err.response?.data?.data,
      });
    } finally {
      setSyncLoading(false);
      refetch();
      refetchConfig();
      refetchHistory();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {loading && <LoadingSpinner />}
        {!loading && error && <ErrorMessage message={error} onRetry={refetch} />}
        {!loading && !error && status && (
          <>
            {status.ephemeralStorage && (
              <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                <p className="font-semibold">Ephemeral local demo storage</p>
                <p className="mt-1">{status.persistenceNotice || 'Changes are held in memory only and are not persistent.'} Login, password changes, connection-test status, sync history, and diagnostics reset when the server restarts.</p>
              </div>
            )}

            {/* Status overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  {status.dataMode === 'live' && status.integrationEnabled ? <Wifi size={16} className="text-green-500" /> : <WifiOff size={16} className="text-gray-400" />}
                  {status.dataMode === 'mock' ? 'Demo data source' : 'CultureFrame live data source'}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4"><span className="text-gray-500">Selected mode</span><span className="font-medium capitalize">{status.dataMode}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-gray-500">Storage</span><span className={`font-medium ${status.ephemeralStorage ? 'text-amber-700' : 'text-gray-700'}`}>{status.ephemeralStorage ? 'Ephemeral (memory)' : 'PostgreSQL'}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-gray-500">Live requests enabled</span><span className={status.integrationEnabled ? 'font-medium text-green-700' : 'text-gray-500'}>{status.integrationEnabled ? 'Yes' : 'No'}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-gray-500">CultureFrame URL</span><span className="max-w-[65%] truncate font-mono text-xs text-gray-600" title={status.apiBaseUrl}>{status.apiBaseUrl}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-gray-500">Last endpoint test</span><span className="text-xs">{fmt(status.lastConnectionTestAt)}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-gray-500">Last test result</span><span className={`text-xs ${status.lastConnectionTestResult === 'success' ? 'text-green-600' : 'text-gray-500'}`}>{status.lastConnectionTestResult || 'Not tested'}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-gray-500">Last successful data check</span><span className="text-xs">{fmt(status.lastSuccessfulSyncAt)}</span></div>
                </div>
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Connection actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleTest}
                    disabled={testLoading || (status.dataMode !== 'live' && !status.ephemeralStorage) || (status.dataMode === 'live' && !status.integrationEnabled)}
                    className="btn-secondary w-full flex items-center justify-center gap-2"
                  >
                    {testLoading ? <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /> : <Wifi size={15} />}
                    Test required analytics endpoint
                  </button>

                  {status.dataMode === 'mock' && (
                    <p className="text-center text-xs text-amber-700">{status.ephemeralStorage ? 'Ephemeral demo mode is isolated; connection tests do not send requests to CultureFrame.' : 'Demo mode is isolated; connection tests do not send requests to CultureFrame.'}</p>
                  )}
                  {status.dataMode === 'live' && !status.integrationEnabled && (
                    <p className="text-center text-xs text-amber-700">Set CULTUREFRAME_INTEGRATION_ENABLED=true on the server to enable live requests.</p>
                  )}
                  {status.dataMode === 'live' && status.integrationEnabled && !status.tokenConfigured && (
                    <p className="text-center text-xs text-amber-700">CULTUREFRAME_API_TOKEN is not configured on the server. Add it securely and restart the API.</p>
                  )}

                  {testResult && (
                    <div className={`rounded-lg px-3 py-2 text-xs flex items-center gap-2 ${
                      testResult.success ? 'bg-green-50 text-green-700'
                        : testResult.data?.result === 'skipped' ? 'bg-amber-50 text-amber-800'
                          : 'bg-red-50 text-red-700'
                    }`}>
                      {testResult.success
                        ? <CheckCircle size={13} />
                        : testResult.data?.result === 'skipped' ? <CircleHelp size={13} /> : <XCircle size={13} />}
                      <span>{testResult.data?.message}</span>
                    </div>
                  )}

                  <button
                    onClick={handleSync}
                    disabled={syncLoading || status.syncRunning || (status.dataMode === 'live' && (!status.integrationEnabled || !status.tokenConfigured))}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {syncLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <RefreshCw size={15} />}
                    {status.syncRunning
                      ? 'Data check running…'
                      : status.dataMode === 'mock' ? 'Capture demo data check' : 'Run CultureFrame data check'}
                  </button>
                  <p className="text-xs leading-relaxed text-gray-500">
                    A data check records timestamped normalized provider snapshots and a run summary for diagnostics. It does <strong>not</strong> populate or replace the live analytics queries.{status.ephemeralStorage && ' In ephemeral demo mode, these records exist only until this server process stops.'}
                  </p>

                  {syncResult && (
                    <div className={`rounded-lg px-3 py-2 text-xs ${syncResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      <p>{syncResult.success
                        ? `Data check ${syncResult.data?.status}: ${syncResult.data?.recordsProcessed} records captured.`
                        : syncResult.error?.message}</p>
                      {syncResult.data && (
                        <p className="mt-1 opacity-80">Run status: {syncResult.data.status}. {syncResult.data.recordsProcessed} records captured, {syncResult.data.recordsRejected} rejected. See run history for details.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card border-l-4 border-l-forest-500">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800"><ShieldCheck size={16} className="text-forest-600" />Configuration and credential handling</h3>
              <p className="text-sm leading-relaxed text-gray-600">
                Data mode and the CultureFrame base URL are controlled by server environment settings. The integration token is never returned to this page or stored in the browser. Configure <code className="rounded bg-gray-100 px-1">CULTUREMETRICS_DATA_MODE</code>, <code className="rounded bg-gray-100 px-1">CULTUREFRAME_API_URL</code>, <code className="rounded bg-gray-100 px-1">CULTUREFRAME_API_TOKEN</code> and <code className="rounded bg-gray-100 px-1">CULTUREFRAME_INTEGRATION_ENABLED</code> on the API server, then restart it.
              </p>
              <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-amber-800">
                <CircleHelp className="mt-0.5 shrink-0" size={14} />
                The CultureFrame analytics routes are documented as proposed. A reachable website does not mean these endpoints exist; live analytics remain unavailable until the required API contract is implemented.
              </p>
            </div>

            {/* Configuration checklist */}
            {config && (
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <AlertTriangle size={15} className={config.allReady ? 'text-green-500' : 'text-amber-500'} />
                  Server readiness checklist
                </h3>
                {config.checklist.map((item) => (
                  <StatusRow key={item.item} label={item.item} ok={item.ok} />
                ))}
                {config.allReady && (
                  <p className="text-xs text-green-600 mt-3 font-medium">Configuration checks passed. Endpoint availability still depends on CultureFrame.</p>
                )}
                {!config.allReady && (
                  <p className="text-xs text-amber-600 mt-3">Complete the server-side checklist before attempting live requests. See docs/CULTUREFRAME_API_CONTRACT.md.</p>
                )}
              </div>
            )}

            {/* Sync history */}
            {history && (
              <div className="card overflow-x-auto">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Clock size={15} />Data check history
                </h3>
                <p className="mb-4 flex items-center gap-2 text-xs text-gray-500"><Database size={13} />Run history describes captured source records; it is not the analytics datastore.</p>
                {history.length === 0 ? (
                  <p className="text-sm text-gray-400">No sync runs recorded yet.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400">
                        <th className="text-left pb-2 pr-4">Started</th>
                        <th className="text-left pb-2 pr-4">Status</th>
                        <th className="text-right pb-2 pr-4">Fetched</th>
                        <th className="text-right pb-2 pr-4">Processed</th>
                        <th className="text-right pb-2 pr-4">Rejected</th>
                        <th className="text-left pb-2">Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((run) => (
                        <React.Fragment key={run.id}>
                        <tr key={run.id} className="border-b border-gray-50">
                          <td className="py-1.5 pr-4">{fmt(run.startedAt)}</td>
                          <td className="py-1.5 pr-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              run.status === 'completed' ? 'bg-green-100 text-green-700'
                              : run.status === 'failed' ? 'bg-red-100 text-red-700'
                              : run.status === 'partial' ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-500'
                            }`}>{run.status}</span>
                          </td>
                          <td className="py-1.5 pr-4 text-right">{run.recordsFetched}</td>
                          <td className="py-1.5 pr-4 text-right">{run.recordsProcessed}</td>
                          <td className="py-1.5 pr-4 text-right">{run.recordsRejected}</td>
                          <td className="py-1.5 capitalize">{run.dataMode}</td>
                        </tr>
                        {run.errorSummary && (
                          <tr className="border-b border-gray-50">
                            <td colSpan="6" className="py-2 text-red-700">{run.errorSummary}</td>
                          </tr>
                        )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
