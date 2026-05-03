import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
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
import { format, differenceInDays, parseISO } from 'date-fns';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;

    let unsubStaff = () => {};
    let unsubStores = () => {};

    const checkExpirations = (staffData: any[], storeData: any[]) => {
      const newNotifs: any[] = [];
      const today = new Date();
      
      const checkExpiry = (dateStr: string, name: string, type: string, path: string) => {
        if (!dateStr) return;
        try {
           const days = differenceInDays(parseISO(dateStr), today);
           if (days <= 30) {
             newNotifs.push({
               id: `${name}-${type}`,
               title: name,
               message: `${type} ${days < 0 ? 'expired ' + Math.abs(days) + ' days ago' : 'expires in ' + days + ' days'}`,
               isExpired: days < 0,
               path
             });
           }
        } catch(e) {}
      }

      staffData.forEach(member => {
         if (user.role === 'admin' || member.storeId === user.username) {
            checkExpiry(member.iqamaExpiry, `${member.name} (${member.storeId})`, 'Iqama', '/staff');
            checkExpiry(member.baladiaExpiry, `${member.name} (${member.storeId})`, 'Baladia', '/staff');
         }
      });

      storeData.forEach(store => {
         if (user.role === 'admin' || store.name === user.username) {
             checkExpiry(store.licenseExpiry, store.name, 'License', '/stores');
             checkExpiry(store.waterFilterExpiry, store.name, 'Water Filter', '/stores');
             checkExpiry(store.fireExtExpiry, store.name, 'Fire Extinguisher', '/stores');
         }
      });

      setNotifications(newNotifs.sort((a, b) => (b.isExpired ? 1 : 0) - (a.isExpired ? 1 : 0)));
    };

    let staffCache: any[] = [];
    let storeCache: any[] = [];

    unsubStaff = onSnapshot(collection(db, 'staff'), (snapshot) => {
      staffCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      checkExpirations(staffCache, storeCache);
    });

    unsubStores = onSnapshot(collection(db, 'stores'), (snapshot) => {
      storeCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      checkExpirations(staffCache, storeCache);
    });

    return () => {
      unsubStaff();
      unsubStores();
    };
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const allNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'store'] },
    { name: 'Sales', path: '/sales', icon: TrendingUp, roles: ['admin', 'store'] },
    { name: 'Expenses', path: '/expenses', icon: Receipt, roles: ['admin', 'store'] },
    { name: 'Staff', path: '/staff', icon: Users, roles: ['admin', 'store'] },
    { name: 'Schedule', path: '/schedule', icon: CalendarDays, roles: ['admin', 'store'] },
    { name: 'Stores', path: '/stores', icon: Store, roles: ['admin', 'store'] },
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
            <div className="relative" ref={notifRef}>
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors relative focus:outline-none">
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden" animate-in="true" slide-in-from-top-2="true">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-semibold text-slate-800">Alerts</h3>
                    <span className="text-xs font-medium px-2 py-1 bg-red-100 text-red-600 rounded-full">
                      {notifications.length} upcoming/expired
                    </span>
                  </div>
                  
                  <div className="max-h-[70vh] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm">No expiration alerts</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {notifications.map(notif => (
                          <button
                            key={notif.id}
                            onClick={() => {
                              navigate(notif.path);
                              setShowNotifications(false);
                            }}
                            className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-start gap-3 ${notif.isExpired ? 'bg-red-50/30' : ''}`}
                          >
                            <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${notif.isExpired ? 'bg-red-500' : 'bg-amber-400'}`} />
                            <div>
                              <p className="text-sm font-medium text-slate-800">{notif.title}</p>
                              <p className={`text-xs mt-1 ${notif.isExpired ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                                {notif.message}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Scrollable Content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none flex flex-col">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
            <Outlet />
          </div>
          
          {/* Global Footer */}
          <footer className="w-full py-4 px-6 border-t border-slate-200 bg-white mt-auto">
            <div className="max-w-7xl mx-auto text-center">
              <p className="text-sm text-slate-500 font-medium">
                Developer Waleed Al-Qadasi -0503189758 &copy; 2026 BudgetSystem. All rights reserved.
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
