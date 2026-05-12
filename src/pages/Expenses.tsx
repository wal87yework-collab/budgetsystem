import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { confirmDelete, confirmUpdate } from '../lib/alerts';
import { PlusCircle, Edit, Trash2, X, TrendingUp, Download, FileSpreadsheet, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { exportToPDF, exportToExcel } from '../lib/exportUtils';

export default function Expenses() {
  const { user } = useAuth();
  
  const [expenses, setExpenses] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [filterStore, setFilterStore] = useState('All');
  const [filterSupplier, setFilterSupplier] = useState('All');
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const initialFormState = {
    storeId: '', date: '', supplier: '', amount: '', notes: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (user && !user.username.includes('103011')) {
      setLoading(false);
      return;
    }
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

    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    let baseQuery: any = collection(db, 'expenses');
    if (user?.role === 'store') {
      baseQuery = query(collection(db, 'expenses'), where('storeId', '==', user.username));
    }

    const qExpenses = query(
      baseQuery,
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    const unsubExpenses = onSnapshot(qExpenses, (snapshot: any) => {
      const expensesData = snapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as any) }));
      expensesData.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setExpenses(expensesData);
      setLoading(false);
    });

    return () => { unsubStores(); unsubSuppliers(); unsubExpenses(); };
  }, [user, startDate, endDate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      if (!(await confirmUpdate())) return;
    }

    const expenseData = {
      ...formData,
      amount: parseFloat(formData.amount) || 0,
      createdAt: new Date().toISOString()
    };

    if (user?.role === 'store') {
      expenseData.storeId = user.username;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, 'expenses', editingId), expenseData);
      } else {
        await addDoc(collection(db, 'expenses'), expenseData);
      }
      setIsModalOpen(false);
      setFormData(initialFormState);
      setEditingId(null);
    } catch (error) {
      console.error("Error saving expense:", error);
      alert("Failed to save expense.");
    }
  };

  const handleEdit = (expense: any) => {
    setFormData({
      storeId: expense.storeId || '',
      date: expense.date || '',
      supplier: expense.supplier || '',
      amount: expense.amount?.toString() || '',
      notes: expense.notes || ''
    });
    setEditingId(expense.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (await confirmDelete()) {
      try {
        await deleteDoc(doc(db, 'expenses', id));
      } catch (error) {
        console.error("Error deleting expense:", error);
      }
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    if (filterStore !== 'All' && expense.storeId !== filterStore) return false;
    if (filterSupplier !== 'All' && expense.supplier !== filterSupplier) return false;
    return true;
  });

  const handleExportPDF = () => {
    const columns = ['Store', 'Date', 'Supplier', 'Amount', 'Notes'];
    const data = filteredExpenses.map(e => [
      e.storeId, e.date, e.supplier, e.amount?.toFixed(2) || '0.00', e.notes || ''
    ]);
    const storeNameText = user?.role === 'store' ? user.username : (filterStore === 'All' ? 'All Stores' : filterStore);
    exportToPDF(`Expenses Report - ${startDate} to ${endDate}`, columns, data, 'portrait', `Store: ${storeNameText}`);
  };

  const handleExportExcel = () => {
    const data = filteredExpenses.map(e => ({
      Store: e.storeId, Date: e.date, Supplier: e.supplier, Amount: e.amount, Notes: e.notes
    }));
    exportToExcel(`Expenses Report - ${startDate} to ${endDate}`, data);
  };

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const lastMonthDate = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const lastMonthStr = format(lastMonthDate, 'yyyy-MM');

  const supplierStats = expenses.reduce((acc, exp) => {
    if (filterStore !== 'All' && exp.storeId !== filterStore) return acc;
    if (filterSupplier !== 'All' && exp.supplier !== filterSupplier) return acc;

    const supplier = exp.supplier || 'Unknown';
    if (!acc[supplier]) {
      acc[supplier] = { selected: 0, thisMonth: 0, lastMonth: 0 };
    }

    if (exp.date && exp.date >= startDate && exp.date <= endDate) {
      acc[supplier].selected += (exp.amount || 0);
    }

    const expMonth = exp.date?.substring(0, 7);
    if (expMonth === currentMonthStr) {
      acc[supplier].thisMonth += (exp.amount || 0);
    } else if (expMonth === lastMonthStr) {
      acc[supplier].lastMonth += (exp.amount || 0);
    }

    return acc;
  }, {} as Record<string, { selected: number, thisMonth: number, lastMonth: number }>);
  
  const suppliersToRender = Object.entries(supplierStats)
    .filter(([_, stats]) => stats.selected > 0 || stats.thisMonth > 0 || stats.lastMonth > 0)
    .sort((a, b) => b[1].selected - a[1].selected);

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading expenses...</div>;

  if (user && !user.username.includes('103011')) {
    return (
      <div className="p-8 text-center text-slate-500">
        You do not have permission to view Expenses Reports. Only store 103011 - SBY JOUF 2 can access this.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900 font-display">Expenses Reports</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {user?.role === 'admin' && (
            <select 
              className="input-field py-1.5 w-auto"
              value={filterStore}
              onChange={(e) => setFilterStore(e.target.value)}
            >
              <option value="All">All Stores</option>
              {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          )}
          <select 
            className="input-field py-1.5 w-auto"
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
          >
            <option value="All">All Suppliers</option>
            {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <input 
            type="date" 
            className="input-field py-1.5 w-auto"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span className="text-slate-500 font-medium text-sm">to</span>
          <input 
            type="date" 
            className="input-field py-1.5 w-auto"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          
          <div className="flex gap-2 border-l border-slate-200 pl-3 ml-1">
            <button onClick={handleExportPDF} className="btn-secondary py-1.5 px-3" title="Export PDF">
              <Download className="w-4 h-4 text-red-500" />
            </button>
            <button onClick={handleExportExcel} className="btn-secondary py-1.5 px-3" title="Export Excel">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            </button>
          </div>

          <button 
            onClick={() => {
              setFormData(initialFormState);
              if (user?.role === 'store') {
                setFormData(prev => ({ ...prev, storeId: user.username }));
              }
              setEditingId(null);
              setIsModalOpen(true);
            }}
            className="btn-primary"
          >
            <PlusCircle className="w-4 h-4 mr-2" /> Add Expense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="card p-5 flex items-center transition-all hover:shadow-md">
          <div className="p-3 rounded-xl bg-red-50 text-red-600 mr-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Expenses</p>
            <p className="text-xl font-bold text-slate-900 font-display mt-0.5">{totalAmount.toFixed(2)} SAR</p>
          </div>
        </div>
        
        {suppliersToRender.map(([supplier, stats], index) => {
          const colors = [
            { bg: 'bg-indigo-50', text: 'text-indigo-600' },
            { bg: 'bg-emerald-50', text: 'text-emerald-600' },
            { bg: 'bg-amber-50', text: 'text-amber-600' },
            { bg: 'bg-fuchsia-50', text: 'text-fuchsia-600' },
            { bg: 'bg-blue-50', text: 'text-blue-600' },
            { bg: 'bg-rose-50', text: 'text-rose-600' },
            { bg: 'bg-teal-50', text: 'text-teal-600' },
            { bg: 'bg-violet-50', text: 'text-violet-600' },
            { bg: 'bg-orange-50', text: 'text-orange-600' },
            { bg: 'bg-cyan-50', text: 'text-cyan-600' },
          ];
          const color = colors[index % colors.length];
          const percentChange = stats.lastMonth > 0 
            ? ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100 
            : 0;

          return (
            <div key={supplier} className="card p-5 flex flex-col transition-all hover:shadow-md">
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-xl ${color.bg} ${color.text} mr-4 shrink-0`}>
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500 truncate" title={supplier}>{supplier}</p>
                  <p className="text-lg font-bold text-slate-900 font-display mt-0.5">{stats.selected.toFixed(2)} SAR</p>
                </div>
              </div>
              
              <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                 <div className="text-left leading-tight">
                    <p className="text-slate-400">This Month</p>
                    <p className="font-semibold text-slate-700">{stats.thisMonth.toFixed(0)}</p>
                 </div>
                 <div className="text-center leading-tight">
                    <p className="text-slate-400">Last Month</p>
                    <p className="font-semibold text-slate-700">{stats.lastMonth.toFixed(0)}</p>
                 </div>
                 <div className="text-right leading-tight min-w-[50px]">
                    <p className="text-slate-400">Change</p>
                    <p className={`font-semibold ${stats.thisMonth > stats.lastMonth ? 'text-rose-500' : stats.thisMonth < stats.lastMonth ? 'text-emerald-500' : 'text-slate-500'}`}>
                      {stats.thisMonth > stats.lastMonth ? '+' : ''}{percentChange.toFixed(1)}%
                    </p>
                 </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="table-header">Store</th>
                <th className="table-header">Date</th>
                <th className="table-header">Supplier</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header">Notes</th>
                <th className="table-header text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredExpenses.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">No expenses found for the selected period.</td></tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-cell font-medium">{expense.storeId}</td>
                    <td className="table-cell text-slate-500">{expense.date}</td>
                    <td className="table-cell">{expense.supplier}</td>
                    <td className="table-cell text-right font-medium text-slate-900">{expense.amount?.toFixed(2) || '0.00'}</td>
                    <td className="table-cell text-slate-600">{expense.notes}</td>
                    <td className="table-cell text-center">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => handleEdit(expense)} className="text-brand-600 hover:text-brand-900 transition-colors" title="Edit"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(expense.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-8 transform transition-all">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900 font-display">{editingId ? 'Edit Expense' : 'Add New Expense'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="label-text">Store <span className="text-red-500">*</span></label>
                <select 
                  required disabled={user?.role === 'store'}
                  className="input-field"
                  value={formData.storeId} onChange={e => setFormData({...formData, storeId: e.target.value})}
                >
                  <option value="">Choose Store...</option>
                  {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  {user?.role === 'store' && !stores.find(s => s.name === user.username) && (
                    <option value={user.username}>{user.username}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="label-text">Date <span className="text-red-500">*</span></label>
                <input type="date" required className="input-field" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div>
                <label className="label-text">Supplier <span className="text-red-500">*</span></label>
                <select 
                  required
                  className="input-field"
                  value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})}
                >
                  <option value="">Choose Supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="label-text">Amount <span className="text-red-500">*</span></label>
                <input type="number" step="0.01" required className="input-field" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              </div>
              <div>
                <label className="label-text">Notes</label>
                <textarea className="input-field" rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Optional notes..."></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
