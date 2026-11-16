import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, Package, ShoppingCart,
  Users, Calendar, MapPin, FileText, Link2, Settings,
  LogOut, Menu, X, Leaf, ChevronRight, ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sales', icon: TrendingUp, label: 'Sales Analytics' },
  { to: '/products', icon: Package, label: 'Product & Crafts' },
  { to: '/orders', icon: ShoppingCart, label: 'Order Analytics' },
  { to: '/customers', icon: Users, label: 'Customer Analytics' },
  { to: '/events', icon: Calendar, label: 'Event Analytics' },
  { to: '/destinations', icon: MapPin, label: 'Heritage & Scenic' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/integration', icon: Link2, label: 'CultureFrame Link' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];
const MAIN_ADMIN_URL = new URL('/admin/dashboard', import.meta.env.VITE_MAIN_SYSTEM_URL || 'http://localhost:3000').toString();

export default function Sidebar() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // The local session is cleared even when the API cannot be reached.
    }
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d2aa57] text-[#18382c] shadow-lg shadow-black/10">
          <Leaf size={21} strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold tracking-tight text-white">CultureMetrics</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[.16em] text-[#9fb8a9]">Mindoro · CultureFrame</div>
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#718f7e]">Workspace</p>
        {NAV.slice(0, 8).map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/dashboard'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}>
            <Icon size={17} strokeWidth={1.8} />
            <span className="flex-1">{label}</span>
            <ChevronRight className="opacity-35" size={14} />
          </NavLink>
        ))}
        <p className="px-3 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[.18em] text-[#718f7e]">Administration</p>
        {NAV.slice(8).map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}>
            <Icon size={17} strokeWidth={1.8} />
            <span className="flex-1">{label}</span>
            <ChevronRight className="opacity-35" size={14} />
          </NavLink>
        ))}
      </nav>

      {/* Admin info + Logout */}
      <div className="border-t border-white/10 px-4 py-4">
        <a href={MAIN_ADMIN_URL} className="sidebar-link mb-4 w-full border border-white/15 text-[#e2cb8e] hover:bg-white/10 hover:text-white">
          <ArrowLeft size={17} />
          <span>Back to main admin</span>
        </a>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#285741] text-xs font-bold uppercase text-white">
            {(admin?.username || 'A').slice(0, 1)}
          </div>
          <div className="min-w-0 text-xs">
            <div className="truncate font-semibold text-white">{admin?.username || 'Administrator'}</div>
            <div className="mt-0.5 text-[#9fb8a9] capitalize">{admin?.role || 'admin'}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-left text-[#bdcec5] hover:bg-red-900/30 hover:text-white"
          type="button"
        >
          <LogOut size={17} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed left-3 top-4 z-[60] rounded-xl border border-white/10 bg-[#103c2d] p-2 text-white shadow-lg shadow-black/15 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={mobileOpen}
        aria-controls="primary-sidebar"
        type="button"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="primary-sidebar"
        className={`
          app-sidebar fixed top-0 left-0 z-50 h-full w-[264px] transition-transform duration-300
          lg:relative lg:z-auto lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Primary navigation"
      >
        {sidebarContent}
      </aside>
    </>
  );
}
