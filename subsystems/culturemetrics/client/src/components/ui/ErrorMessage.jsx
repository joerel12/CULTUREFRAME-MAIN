import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <AlertTriangle className="text-red-400" size={32} />
      <p className="text-sm text-gray-600 max-w-sm">{message || 'An error occurred while loading data.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary flex items-center gap-1.5 text-xs">
          <RefreshCw size={13} />
          Try Again
        </button>
      )}
    </div>
  );
}
