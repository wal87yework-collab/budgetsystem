import React from 'react';
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
  LogOut
} from 'lucide-react';
import { format } from 'date-fns';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const allNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'store'] },
    { name: 'Sales', path: '/sales', icon: TrendingUp, roles: ['admin', 'store'] },
    { name: 'Expenses Reports', path: '/expenses', icon: Receipt, roles: ['admin'] },
    { name: 'Staff', path: '/staff', icon: Users, roles: ['admin', 'store'] },
    { name: 'Schedule', path: '/schedule', icon: CalendarDays, roles: ['admin', 'store'] },
    { name: 'Companies & Stores', path: '/stores', icon: Store, roles: ['admin'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['admin'] },
    { name: 'Inventory Cost', path: '/inventory', icon: Package, roles: ['admin'] },
  ];

  const navItems = allNavItems.filter(item => user && item.roles.includes(user.role));

  if (user?.role === 'admin') {
    navItems.push({ name: 'Admin', path: '/admin', icon: ShieldAlert, roles: ['admin'] });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center gap-2">
                <Store className="h-6 w-6 text-blue-600" />
                <span className="font-bold text-xl text-gray-900">BudgetSystem</span>
              </div>
              <nav className="hidden sm:ml-6 sm:flex sm:space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || 
                                   (item.path !== '/' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium border-b-2 ${
                        isActive
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                Today: {format(new Date(), 'EEEE, dd MMMM yyyy')}
              </div>
              <div className="flex items-center gap-2 border-l pl-4">
                <span className="text-sm font-medium text-gray-700">
                  {user?.username} ({user?.role})
                </span>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      
      <footer className="bg-white border-t py-4 text-center text-xs text-gray-500">
        Developer Waleed Al-Qadasi © {new Date().getFullYear()} BudgetSystem. All rights reserved.
      </footer>
    </div>
  );
}
