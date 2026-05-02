import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Store, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO, subDays } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [staffCount, setStaffCount] = useState(0);
  const [storeCount, setStoreCount] = useState(0);

  useEffect(() => {
    // Fetch Sales
    const qSales = user?.role === 'store'
      ? query(collection(db, 'sales'), where('storeId', '==', user.username))
      : collection(db, 'sales');

    const unsubSales = onSnapshot(qSales, (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSales(salesData);
    });

    // Fetch Staff
    const qStaff = user?.role === 'store'
      ? query(collection(db, 'staff'), where('storeId', '==', user.username))
      : collection(db, 'staff');
    
    const unsubStaff = onSnapshot(qStaff, (snapshot) => {
      setStaffCount(snapshot.docs.length);
    });

    // Fetch Stores
    const qStores = user?.role === 'store'
      ? query(collection(db, 'stores'), where('name', '==', user.username))
      : collection(db, 'stores');
      
    const unsubStores = onSnapshot(qStores, (snapshot) => {
      setStoreCount(snapshot.docs.length);
    });

    return () => {
      unsubSales();
      unsubStaff();
      unsubStores();
    };
  }, [user]);

  const totalSales = sales.reduce((sum, sale) => sum + (sale.totalAfterTax || 0), 0);
  const avgDailyRevenue = sales.length > 0 ? totalSales / sales.length : 0;

  const stats = [
    { name: 'Total Sales', value: `${totalSales.toFixed(2)} SAR`, change: '+12.5%', trend: 'up', icon: DollarSign, color: 'bg-blue-500' },
    { name: 'Active Stores', value: storeCount.toString(), change: '+2', trend: 'up', icon: Store, color: 'bg-indigo-500' },
    { name: 'Total Staff', value: staffCount.toString(), change: '-1', trend: 'down', icon: Users, color: 'bg-emerald-500' },
    { name: 'Avg. Daily Revenue', value: `${avgDailyRevenue.toFixed(2)} SAR`, change: '+5.2%', trend: 'up', icon: TrendingUp, color: 'bg-amber-500' },
  ];

  // Prepare chart data (last 7 days)
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const daySales = sales.filter(s => s.date === dateStr).reduce((sum, s) => sum + (s.totalAfterTax || 0), 0);
    chartData.push({
      name: format(date, 'dd MMM'),
      sales: daySales
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-display">Welcome back, {user?.username}!</h1>
        <p className="mt-1 text-sm text-slate-500">Here's what's happening across your stores today.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card p-6 transition-all duration-200 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10`}>
                  <Icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
                </div>
                <div className={`flex items-center text-sm font-medium ${stat.trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {stat.change}
                  {stat.trend === 'up' ? <ArrowUpRight className="w-4 h-4 ml-1" /> : <ArrowDownRight className="w-4 h-4 ml-1" />}
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-medium text-slate-500">{stat.name}</h3>
                <p className="text-2xl font-bold text-slate-900 font-display mt-1">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-lg font-semibold text-slate-800 font-display mb-4">Revenue Overview (Last 7 Days)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '0.75rem', color: '#F8FAFC', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#F8FAFC' }}
                />
                <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 font-display mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {sales.slice(0, 5).map((sale, i) => (
              <div key={sale.id || i} className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-brand-500"></div>
                <div>
                  <p className="text-sm font-medium text-slate-800">New sale recorded: {sale.totalAfterTax?.toFixed(2)} SAR</p>
                  <p className="text-xs text-slate-500">{sale.storeId} • {sale.date}</p>
                </div>
              </div>
            ))}
            {sales.length === 0 && (
              <p className="text-sm text-slate-500">No recent activity.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
