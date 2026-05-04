import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, Users, Store, DollarSign, ArrowUpRight, ArrowDownRight, 
  Receipt, Wallet, CalendarRange, BarChart3, Activity, Target
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ComposedChart
} from 'recharts';
import { 
  format, parseISO, subDays, startOfMonth, endOfMonth, 
  subMonths, startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval, isSameMonth
} from 'date-fns';

type TimeFrame = 'this_month' | 'last_month' | 'this_year';

export default function Dashboard() {
  const { user } = useAuth();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('this_month');
  
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [staffCount, setStaffCount] = useState(0);
  const [storeCount, setStoreCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    if (timeFrame === 'this_month') {
      return { 
        startDate: format(startOfMonth(today), 'yyyy-MM-dd'), 
        endDate: format(endOfMonth(today), 'yyyy-MM-dd') 
      };
    } else if (timeFrame === 'last_month') {
      const lastMonth = subMonths(today, 1);
      return { 
        startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), 
        endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd') 
      };
    } else { // this_year
      return { 
        startDate: format(startOfYear(today), 'yyyy-MM-dd'), 
        endDate: format(endOfYear(today), 'yyyy-MM-dd') 
      };
    }
  }, [timeFrame]);

  useEffect(() => {
    setLoading(true);
    let unsubSales = () => {};
    let unsubExpenses = () => {};
    let unsubStaff = () => {};
    let unsubStores = () => {};

    // Fetch Sales
    let qSales = collection(db, 'sales');
    if (user?.role === 'store') {
      qSales = query(collection(db, 'sales'), where('storeId', '==', user.username), where('date', '>=', startDate), where('date', '<=', endDate));
    } else {
      qSales = query(collection(db, 'sales'), where('date', '>=', startDate), where('date', '<=', endDate));
    }

    unsubSales = onSnapshot(qSales, (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSales(salesData);
    });

    // Fetch Expenses
    let qExpenses = collection(db, 'expenses');
    if (user?.role === 'store') {
      qExpenses = query(collection(db, 'expenses'), where('storeId', '==', user.username), where('date', '>=', startDate), where('date', '<=', endDate));
    } else {
      qExpenses = query(collection(db, 'expenses'), where('date', '>=', startDate), where('date', '<=', endDate));
    }

    unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpenses(expensesData);
    });

    // Fetch Staff Check
    const qStaff = user?.role === 'store'
      ? query(collection(db, 'staff'), where('storeId', '==', user.username))
      : collection(db, 'staff');
    
    unsubStaff = onSnapshot(qStaff, (snapshot) => {
      setStaffCount(snapshot.docs.length);
    });

    // Fetch Stores Check
    const qStores = user?.role === 'store'
      ? query(collection(db, 'stores'), where('name', '==', user.username))
      : collection(db, 'stores');
      
    unsubStores = onSnapshot(qStores, (snapshot) => {
      setStoreCount(snapshot.docs.length);
      setLoading(false);
    });

    return () => {
      unsubSales();
      unsubExpenses();
      unsubStaff();
      unsubStores();
    };
  }, [user, startDate, endDate]);

  const totalSales = sales.reduce((sum, sale) => sum + (sale.netSales || 0), 0);
  const totalTax = sales.reduce((sum, sale) => sum + ((sale.totalAfterTax || 0) - (sale.netSales || 0)), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const netProfit = totalSales - totalExpenses;
  
  const avgDailyRevenue = sales.length > 0 ? (totalSales / new Set(sales.map(s => s.date)).size) : 0;

  const stats = [
    { name: 'Net Sales', value: `${totalSales.toFixed(2)} SAR`, icon: DollarSign, color: 'bg-blue-500' },
    { name: 'Expenses', value: `${totalExpenses.toFixed(2)} SAR`, icon: Receipt, color: 'bg-red-500' },
    { name: 'Net Profit', value: `${netProfit.toFixed(2)} SAR`, icon: Wallet, color: 'bg-emerald-500' },
    { name: 'Avg. Daily Rev.', value: `${avgDailyRevenue.toFixed(2)} SAR`, icon: TrendingUp, color: 'bg-amber-500' },
  ];

  // Top Stores logic
  const storeSales = sales.reduce((acc, sale) => {
    acc[sale.storeId] = (acc[sale.storeId] || 0) + (sale.netSales || 0);
    return acc;
  }, {} as Record<string, number>);
  
  const topStores = Object.entries(storeSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  // Chart Data preparation
  const chartData = useMemo(() => {
    if (timeFrame === 'this_year') {
      // Group by month
      const months = eachMonthOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
      return months.map(monthDate => {
        const monthStr = format(monthDate, 'yyyy-MM');
        const monthSales = sales.filter(s => s.date?.startsWith(monthStr)).reduce((sum, s) => sum + (s.netSales || 0), 0);
        const monthExpenses = expenses.filter(e => e.date?.startsWith(monthStr)).reduce((sum, e) => sum + (e.amount || 0), 0);
        return {
          name: format(monthDate, 'MMM'),
          Sales: parseFloat(monthSales.toFixed(2)),
          Expenses: parseFloat(monthExpenses.toFixed(2)),
          Profit: parseFloat((monthSales - monthExpenses).toFixed(2))
        };
      });
    } else {
      // Group by day
      const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
      return days.map(dayDate => {
        const dayStr = format(dayDate, 'yyyy-MM-dd');
        const daySales = sales.filter(s => s.date === dayStr).reduce((sum, s) => sum + (s.netSales || 0), 0);
        const dayExpenses = expenses.filter(e => e.date === dayStr).reduce((sum, e) => sum + (e.amount || 0), 0);
        return {
          name: format(dayDate, 'dd MMM'),
          Sales: parseFloat(daySales.toFixed(2)),
          Expenses: parseFloat(dayExpenses.toFixed(2)),
          Profit: parseFloat((daySales - dayExpenses).toFixed(2))
        };
      });
    }
  }, [sales, expenses, startDate, endDate, timeFrame]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Loading dashboard overview...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Welcome back, {user?.username}!</h1>
          <p className="mt-1 text-sm text-slate-500">Here is your business overview and insights.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
          <button 
            onClick={() => setTimeFrame('this_month')} 
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${timeFrame === 'this_month' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            This Month
          </button>
          <button 
            onClick={() => setTimeFrame('last_month')} 
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${timeFrame === 'last_month' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Last Month
          </button>
          <button 
            onClick={() => setTimeFrame('this_year')} 
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${timeFrame === 'this_year' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            This Year
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card p-5 border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10`}>
                  <Icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
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
        <div className="lg:col-span-2 card p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800 font-display flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              Financial Overview 
              <span className="text-sm font-normal text-slate-500 ml-2">
                ({timeFrame === 'this_year' ? 'Monthly' : 'Daily'})
              </span>
            </h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} tickFormatter={(val) => String(val)} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '13px', fontWeight: 500 }}
                  labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Area type="monotone" dataKey="Sales" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                <Bar dataKey="Expenses" barSize={12} fill="#EF4444" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="flex flex-col gap-6">
          <div className="card p-6 shadow-sm border flex-grow">
            <h3 className="text-lg font-semibold text-slate-800 font-display mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-500" />
              Quick Summary
            </h3>
            <div className="space-y-4">
               <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                 <span className="text-slate-600 font-medium">VAT Total (Collected)</span>
                 <span className="font-bold text-slate-900">{totalTax.toFixed(2)} SAR</span>
               </div>
               {user?.role === 'admin' ? (
                 <>
                   <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                     <span className="text-slate-600 font-medium">Total Stores</span>
                     <span className="font-bold text-slate-900 flex items-center gap-2"><Store className="w-4 h-4 text-indigo-500"/> {storeCount}</span>
                   </div>
                   <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                     <span className="text-slate-600 font-medium">Total Staff Members</span>
                     <span className="font-bold text-slate-900 flex items-center gap-2"><Users className="w-4 h-4 text-brand-500"/> {staffCount}</span>
                   </div>
                 </>
               ) : (
                 <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                   <span className="text-slate-600 font-medium">Store Co-workers</span>
                   <span className="font-bold text-slate-900 flex items-center gap-2"><Users className="w-4 h-4 text-brand-500"/> {staffCount}</span>
                 </div>
               )}
            </div>
          </div>

          {user?.role === 'admin' ? (
            <div className="card p-6 shadow-sm border max-h-80 overflow-y-auto mt-6">
              <h3 className="text-lg font-semibold text-slate-800 font-display mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                Top Performing Stores
              </h3>
              <div className="space-y-3">
                {topStores.map((store, i) => (
                  <div key={store.name} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        {i + 1}
                      </div>
                      <p className="text-sm font-medium text-slate-800 truncate max-w-[120px]">{store.name}</p>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{store.value.toFixed(2)} SAR</span>
                  </div>
                ))}
                {topStores.length === 0 && (
                  <p className="text-sm text-slate-500 py-4 text-center">No sales data available for this period.</p>
                )}
              </div>
            </div>
          ) : (
             <div className="card p-6 shadow-sm border max-h-80 overflow-y-auto mt-6">
              <h3 className="text-lg font-semibold text-slate-800 font-display mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-red-500" />
                Top Expenses by Supplier
              </h3>
              <div className="space-y-3">
                {Object.entries(expenses.reduce((acc, exp) => {
                  acc[exp.supplier || 'Unknown'] = (acc[exp.supplier || 'Unknown'] || 0) + (exp.amount || 0);
                  return acc;
                }, {} as Record<string, number>))
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([supplier, amount], i) => (
                    <div key={supplier} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-slate-100 text-slate-500">
                          {i + 1}
                        </div>
                        <p className="text-sm font-medium text-slate-800 truncate max-w-[120px]" title={supplier}>{supplier}</p>
                      </div>
                      <span className="text-sm font-bold text-slate-900">{amount.toFixed(2)} SAR</span>
                    </div>
                  ))}
                {expenses.length === 0 && (
                  <p className="text-sm text-slate-500 py-4 text-center">No expense data available for this period.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}

