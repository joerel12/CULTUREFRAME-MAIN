import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ivory-100 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-forest-100 rounded-2xl mb-6">
          <Leaf className="text-forest-600" size={28} />
        </div>
        <h1 className="text-6xl font-display font-bold text-forest-700 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
        <p className="text-sm text-gray-500 mb-6">The page you're looking for doesn't exist in CultureMetrics.</p>
        <Link to="/dashboard" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft size={15} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
