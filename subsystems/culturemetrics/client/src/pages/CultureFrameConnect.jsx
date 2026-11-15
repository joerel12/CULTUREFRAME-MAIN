import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

function safeReturnPath(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    ? value
    : '/dashboard';
}

export default function CultureFrameConnect() {
  const { connectCultureFrame, isAuthenticated } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (started.current || isAuthenticated) return;
    started.current = true;
    const token = params.get('token');
    if (!token) {
      setError('The CultureFrame administrator handoff is missing.');
      return;
    }
    connectCultureFrame(token)
      .then(() => navigate(safeReturnPath(params.get('returnTo')), { replace: true }))
      .catch(() => setError('Administrator access expired or could not be verified. Return to the main CultureFrame Admin side and try again.'));
  }, [connectCultureFrame, isAuthenticated, navigate, params]);

  if (isAuthenticated) return <Navigate to={safeReturnPath(params.get('returnTo'))} replace />;
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <section className="max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm border border-slate-200">
        {error ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900">CultureMetrics access unavailable</h1>
            <p className="mt-3 text-slate-600">{error}</p>
            <a className="mt-6 inline-flex rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white" href="http://localhost:3000/admin/dashboard">Return to CultureFrame Admin</a>
          </>
        ) : (
          <LoadingSpinner text="Opening CultureMetrics from CultureFrame Admin..." />
        )}
      </section>
    </main>
  );
}
