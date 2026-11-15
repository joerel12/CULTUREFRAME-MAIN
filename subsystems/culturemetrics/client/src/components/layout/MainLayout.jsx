import React from 'react';
import Sidebar from './Sidebar';

export default function MainLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f2]">
      <a href="#main-content" className="sr-only fixed left-3 top-3 z-[70] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-forest-800 shadow focus:not-sr-only">
        Skip to content
      </a>
      <Sidebar />
      <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
        <main id="main-content" className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
