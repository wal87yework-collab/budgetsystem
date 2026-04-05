import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { PlusCircle, Edit, Trash2, X, TrendingUp, DollarSign, CreditCard, Smartphone } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Sales() {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Filters
  const [filterStore, setFilterStore] = useState('All');
  const [filterMonth, setFilterMonth] = useState('04');
  const [filterYear, setFilterYear] = useState('2026');

  const initialFormState = {
    storeId: '', date: '', netSales: '', mastercard: '', span: '', visa: '',
    stc: '', wasal: '', toYou: '', jahez: '', hungerStation: '',
    advance: '', used: '', notes: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    // Fetch Stores
    const qStores = user?.role === 'store' 
      ? query(collection(db, 'stores'), where('name', '==', user.username))
      : collection(db, 'stores');
      
    const unsubStores = onSnapshot(qStores, (snapshot) => {
      const storesData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setStores(storesData);
      if (user?.role === 'store' && storesData.length > 0) {
        setFormData(prev => ({ ...prev, storeId: storesData[0].name }));
      }
    });

    // Fetch Sales
    const qSales = user?.role === 'store'
      ? query(collection(db, 'sales'), where('storeId', '==', user.username))
      : collection(db, 'sales');

    const unsubSales = onSnapshot(qSales, (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by date descending
      salesData.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSales(salesData);
      setLoading(false);
    });

    return () => {
      unsubStores();
      unsubSales();
    };
  }, [user]);

  // Math Calculations
  const parseNum = (val: any) => parseFloat(val) || 0;
  const netSales = parseNum(formData.netSales);
  const tax = netSales * 0.15;
  const totalAfterTax = netSales + tax;
  
  const mastercard = parseNum(formData.mastercard);
  const span = parseNum(formData.span);
  const visa = parseNum(formData.visa);
  const totalAtms = mastercard + span + visa;
  
  const stc = parseNum(formData.stc);
  const wasal = parseNum(formData.wasal);
  const toYou = parseNum(formData.toYou);
  const jahez = parseNum(formData.jahez);
  const hungerStation = parseNum(formData.hungerStation);
  const totalApps = stc + wasal + toYou + jahez + hungerStation;
  
  const royaltyFee = netSales * 0.08;
  const marketingFee = netSales * 0.045;
  const totalFees = royaltyFee + marketingFee;
  
  const cashSalesOfDay = totalAfterTax - totalAtms - totalApps;
  const advance = parseNum(formData.advance);
  const used = parseNum(formData.used);
  const finalCashSales = cashSalesOfDay + advance - used;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const saleData = {
      ...formData,
      netSales, tax, totalAfterTax, mastercard, span, visa, totalAtms,
      stc, wasal, toYou, jahez, hungerStation, totalApps,
      royaltyFee, marketingFee, totalFees,
      cashSalesOfDay, advance, used, finalCashSales,
      createdAt: new Date().toISOString()
    };

    // Force storeId if user is a store
    if (user?.role === 'store') {
      saleData.storeId = user.username;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, 'sales', editingId), saleData);
      } else {
        await addDoc(collection(db, 'sales'), saleData);
      }
      setIsModalOpen(false);
      setFormData(initialFormState);
      setEditingId(null);
    } catch (error) {
      console.error("Error saving sale:", error);
      alert("Failed to save record.");
    }
  };

  const handleEdit = (sale: any) => {
    setFormData({
      storeId: sale.storeId || '',
      date: sale.date || '',
      netSales: sale.netSales?.toString() || '',
      mastercard: sale.mastercard?.toString() || '',
      span: sale.span?.toString() || '',
      visa: sale.visa?.toString() || '',
      stc: sale.stc?.toString() || '',
      wasal: sale.wasal?.toString() || '',
      toYou: sale.toYou?.toString() || '',
      jahez: sale.jahez?.toString() || '',
      hungerStation: sale.hungerStation?.toString() || '',
      advance: sale.advance?.toString() || '',
      used: sale.used?.toString() || '',
      notes: sale.notes || ''
    });
    setEditingId(sale.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await deleteDoc(doc(db, 'sales', id));
      } catch (error) {
        console.error("Error deleting sale:", error);
      }
    }
  };

  const filteredSales = sales.filter(sale => {
    if (filterStore !== 'All' && sale.storeId !== filterStore) return false;
    if (sale.date) {
      const [y, m] = sale.date.split('-');
      if (y !== filterYear || m !== filterMonth) return false;
    }
    return true;
  });

  const totalSalesAmount = filteredSales.reduce((sum, sale) => sum + (sale.totalAfterTax || 0), 0);
  const totalAtmsAmount = filteredSales.reduce((sum, sale) => sum + (sale.totalAtms || 0), 0);
  const totalAppsAmount = filteredSales.reduce((sum, sale) => sum + (sale.totalApps || 0), 0);
  const totalCashAmount = filteredSales.reduce((sum, sale) => sum + (sale.finalCashSales || 0), 0);

  const chartData = filteredSales.slice(0, 10).reverse().map(sale => ({
    name: sale.date ? format(parseISO(sale.date), 'dd MMM') : 'Unknown',
    sales: sale.totalAfterTax || 0
  }));

  if (loading) return <div className="p-4">Loading sales data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Sales Management</h1>
        <div className="flex flex-wrap items-center gap-2">
          {user?.role === 'admin' && (
            <select 
              className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-1.5 px-3 border"
              value={filterStore}
              onChange={(e) => setFilterStore(e.target.value)}
            >
              <option value="All">All Stores</option>
              {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          )}
          <select 
            className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-1.5 px-3 border"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="01">01</option><option value="02">02</option><option value="03">03</option>
            <option value="04">04</option><option value="05">05</option><option value="06">06</option>
            <option value="07">07</option><option value="08">08</option><option value="09">09</option>
            <option value="10">10</option><option value="11">11</option><option value="12">12</option>
          </select>
          <select 
            className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-1.5 px-3 border"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
          <button 
            onClick={() => {
              setFormData(initialFormState);
              if (user?.role === 'store') {
                setFormData(prev => ({ ...prev, storeId: user.username }));
              }
              setEditingId(null);
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium flex items-center"
          >
            <PlusCircle className="w-4 h-4 mr-2" /> Add Record
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Sales</p>
            <p className="text-xl font-bold text-gray-900">{totalSalesAmount.toFixed(2)} SAR</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center">
          <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total ATMs</p>
            <p className="text-xl font-bold text-gray-900">{totalAtmsAmount.toFixed(2)} SAR</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center">
          <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Apps</p>
            <p className="text-xl font-bold text-gray-900">{totalAppsAmount.toFixed(2)} SAR</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center">
          <div className="p-3 rounded-full bg-orange-100 text-orange-600 mr-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Final Cash</p>
            <p className="text-xl font-bold text-gray-900">{totalCashAmount.toFixed(2)} SAR</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Sales Trend (Last 10 Records)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dx={-10} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '0.5rem', color: '#F9FAFB' }}
                itemStyle={{ color: '#F9FAFB' }}
              />
              <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Sales</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total After Tax</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Final Cash</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No sales records found.</td></tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.storeId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{sale.netSales?.toFixed(2) || '0.00'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">{sale.totalAfterTax?.toFixed(2) || '0.00'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium text-green-600">{sale.finalCashSales?.toFixed(2) || '0.00'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEdit(sale)} className="text-blue-600 hover:text-blue-900"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(sale.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-8">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Sales Record' : 'Add New Sales Record'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Store <span className="text-red-500">*</span></label>
                  <select 
                    required
                    disabled={user?.role === 'store'}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border disabled:bg-gray-100"
                    value={formData.storeId}
                    onChange={e => setFormData({...formData, storeId: e.target.value})}
                  >
                    <option value="">Choose Store...</option>
                    {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    {user?.role === 'store' && !stores.find(s => s.name === user.username) && (
                      <option value={user.username}>{user.username}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sale Date <span className="text-red-500">*</span></label>
                  <input 
                    type="date" required
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              </div>

              {/* Sales Section */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-1">Sales</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Net Sales</label>
                    <input type="number" step="0.01" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.netSales} onChange={e => setFormData({...formData, netSales: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tax</label>
                    <input type="text" readOnly className="w-full bg-gray-100 border-gray-200 rounded-md shadow-sm sm:text-sm py-2 px-3 border text-gray-500" value={tax.toFixed(2)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Total After Tax</label>
                    <input type="text" readOnly className="w-full bg-gray-100 border-gray-200 rounded-md shadow-sm sm:text-sm py-2 px-3 border text-gray-500" value={totalAfterTax.toFixed(2)} />
                  </div>
                </div>
              </div>

              {/* ATMs Section */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-1">ATMs</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Mastercard</label>
                    <input type="number" step="0.01" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.mastercard} onChange={e => setFormData({...formData, mastercard: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Span</label>
                    <input type="number" step="0.01" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.span} onChange={e => setFormData({...formData, span: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Visa</label>
                    <input type="number" step="0.01" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.visa} onChange={e => setFormData({...formData, visa: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Total ATMs</label>
                  <input type="text" readOnly className="w-full bg-gray-100 border-gray-200 rounded-md shadow-sm sm:text-sm py-2 px-3 border text-gray-500" value={totalAtms.toFixed(2)} />
                </div>
              </div>

              {/* Apps Section */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-1">Apps</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Stc</label>
                    <input type="number" step="0.01" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.stc} onChange={e => setFormData({...formData, stc: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Wasal</label>
                    <input type="number" step="0.01" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.wasal} onChange={e => setFormData({...formData, wasal: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">To You</label>
                    <input type="number" step="0.01" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.toYou} onChange={e => setFormData({...formData, toYou: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Jahez</label>
                    <input type="number" step="0.01" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.jahez} onChange={e => setFormData({...formData, jahez: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hunger Station</label>
                    <input type="number" step="0.01" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.hungerStation} onChange={e => setFormData({...formData, hungerStation: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Total Apps</label>
                    <input type="text" readOnly className="w-full bg-gray-100 border-gray-200 rounded-md shadow-sm sm:text-sm py-2 px-3 border text-gray-500" value={totalApps.toFixed(2)} />
                  </div>
                </div>
              </div>

              {/* Fees Section */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-1">Fees</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Royalty Fee (8%)</label>
                    <input type="text" readOnly className="w-full bg-gray-100 border-gray-200 rounded-md shadow-sm sm:text-sm py-2 px-3 border text-gray-500" value={royaltyFee.toFixed(2)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Marketing (4.5%)</label>
                    <input type="text" readOnly className="w-full bg-gray-100 border-gray-200 rounded-md shadow-sm sm:text-sm py-2 px-3 border text-gray-500" value={marketingFee.toFixed(2)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Total Fees</label>
                    <input type="text" readOnly className="w-full bg-gray-100 border-gray-200 rounded-md shadow-sm sm:text-sm py-2 px-3 border text-gray-500" value={totalFees.toFixed(2)} />
                  </div>
                </div>
              </div>

              {/* Petty Cash Section */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-1">Petty Cash</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Advance</label>
                    <input type="number" step="0.01" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.advance} onChange={e => setFormData({...formData, advance: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Used</label>
                    <input type="number" step="0.01" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.used} onChange={e => setFormData({...formData, used: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Cash Sales Section */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-1">Cash Sales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Cash Sales Of Day</label>
                    <input type="text" readOnly className="w-full bg-gray-100 border-gray-200 rounded-md shadow-sm sm:text-sm py-2 px-3 border text-gray-500" value={cashSalesOfDay.toFixed(2)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Final Cash Sales</label>
                    <input type="text" readOnly className="w-full bg-gray-100 border-gray-200 rounded-md shadow-sm sm:text-sm py-2 px-3 border text-gray-500" value={finalCashSales.toFixed(2)} />
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea 
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" 
                  rows={3}
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                  Close
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                  {editingId ? 'Update Record' : 'Add Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
