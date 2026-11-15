import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Pages
import Dashboard from './pages/Dashboard';
import SalesAnalytics from './pages/SalesAnalytics';
import ProductAnalytics from './pages/ProductAnalytics';
import OrderAnalytics from './pages/OrderAnalytics';
import CustomerAnalytics from './pages/CustomerAnalytics';
import EventAnalytics from './pages/EventAnalytics';
import DestinationAnalytics from './pages/DestinationAnalytics';
import Reports from './pages/Reports';
import IntegrationSettings from './pages/IntegrationSettings';
import Settings from './pages/Settings';
import CultureFrameConnect from './pages/CultureFrameConnect';
import NotFound from './pages/NotFound';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner text="Loading CultureMetrics..." /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <MainLayout>{children}</MainLayout>;
}

function MainAdminAccess() {
  React.useEffect(() => {
    const mainSystemUrl = import.meta.env.VITE_MAIN_SYSTEM_URL || 'http://localhost:3000';
    window.location.replace(`${mainSystemUrl.replace(/\/$/, '')}/admin/analytics/business`);
  }, []);
  return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner text="Returning to CultureFrame Admin..." /></div>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<MainAdminAccess />} />
      <Route path="/account/connect" element={<CultureFrameConnect />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/sales" element={<ProtectedRoute><SalesAnalytics /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><ProductAnalytics /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><OrderAnalytics /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><CustomerAnalytics /></ProtectedRoute>} />
      <Route path="/events" element={<ProtectedRoute><EventAnalytics /></ProtectedRoute>} />
      <Route path="/destinations" element={<ProtectedRoute><DestinationAnalytics /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/integration" element={<ProtectedRoute><IntegrationSettings /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
