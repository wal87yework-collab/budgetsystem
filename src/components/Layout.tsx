import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Receipt, 
  Users, 
  CalendarDays, 
  Store, 
  Settings, 
  Package, 
  ShieldAlert,
  LogOut,
  Menu,
  X,
  Bell
} from 'lucide-react';
import { format } from 'date-fns';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const allNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'store'] },
    { name: 'Sales', path: '/sales', icon: TrendingUp, roles: ['admin', 'store'] },
    { name: 'Expenses', path: '/expenses', icon: Receipt, roles: ['admin'] },
    { name: 'Staff', path: '/staff', icon: Users, roles: ['admin', 'store'] },
    { name: 'Schedule', path: '/schedule', icon: CalendarDays, roles: ['admin', 'store'] },
    { name: 'Stores', path: '/stores', icon: Store, roles: ['admin'] },
    { name: 'Inventory', path: '/inventory', icon: Package, roles: ['admin'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['admin'] },
  ];

  const navItems = allNavItems.filter(item => user && item.roles.includes(user.role));

  if (user?.role === 'admin') {
    navItems.push({ name: 'Admin', path: '/admin', icon: ShieldAlert, roles: ['admin'] });
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      <div className="flex items-center h-16 px-6 bg-slate-950/50">
        <Store className="w-6 h-6 text-brand-500" />
        <span className="ml-3 text-lg font-bold text-white font-display tracking-wide">BudgetSystem</span>
      </div>
      
      <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <div className="mb-6 px-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Main Menu</p>
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
                           (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-brand-600/10 text-brand-400 font-medium'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-brand-500' : 'text-slate-400 group-hover:text-slate-300'}`} />
              {item.name}
            </Link>
          );
        })}
      </div>

      <div className="p-4 bg-slate-950/30 border-t border-slate-800">
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">{user?.username}</span>
            <span className="text-xs text-slate-500 capitalize">{user?.role} Account</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-shrink-0 w-64 shadow-xl z-20">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-slate-900 shadow-2xl transform transition-transform duration-300">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between h-16 px-4 bg-white border-b border-slate-200 sm:px-6 lg:px-8 z-10">
          <div className="flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 mr-4 text-slate-500 rounded-md md:hidden hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-semibold text-slate-800 font-display hidden sm:block">
              {navItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              {format(new Date(), 'EEEE, dd MMM yyyy')}
            </div>
            <button className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Main Scrollable Content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
