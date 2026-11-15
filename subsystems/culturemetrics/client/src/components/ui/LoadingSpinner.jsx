import React from 'react';

export default function LoadingSpinner({ size = 'md', text = 'Loading...' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-400">
      <div
        className={`${sizes[size]} border-3 border-gray-200 border-t-forest-600 rounded-full animate-spin`}
        style={{ borderWidth: '3px' }}
      />
      {text && <p className="text-sm">{text}</p>}
    </div>
  );
}
