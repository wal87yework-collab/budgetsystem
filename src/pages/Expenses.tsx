import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { PlusCircle, Edit, Trash2, X, TrendingUp, Download } from 'lucide-react';

export default function Expenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [filterStore, setFilterStore] = useState('All');
  const [filterMonth, setFilterMonth] = useState('04');
  const [filterYear, setFilterYear] = useState('2026');

  const initialFormState = {
    storeId: '', date: '', supplier: '', amount: '', notes: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
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

    const qExpenses = user?.role === 'store'
      ? query(collection(db, 'expenses'), where('storeId', '==', user.username))
      : collection(db, 'expenses');
    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      expensesData.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setExpenses(expensesData);
      setLoading(false);
    });

    return () => { unsubStores(); unsubSuppliers(); unsubExpenses(); };
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteDoc(doc(db, 'expenses', id));
      } catch (error) {
        console.error("Error deleting expense:", error);
      }
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    if (filterStore !== 'All' && expense.storeId !== filterStore) return false;
    if (expense.date) {
      const [y, m] = expense.date.split('-');
      if (y !== filterYear || m !== filterMonth) return false;
    }
    return true;
  });

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading expenses...</div>;

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
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="01">01</option><option value="02">02</option><option value="03">03</option>
            <option value="04">04</option><option value="05">05</option><option value="06">06</option>
            <option value="07">07</option><option value="08">08</option><option value="09">09</option>
            <option value="10">10</option><option value="11">11</option><option value="12">12</option>
          </select>
          <select 
            className="input-field py-1.5 w-auto"
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
            className="btn-primary"
          >
            <PlusCircle className="w-4 h-4 mr-2" /> Add Expense
          </button>
        </div>
      </div>

      <div className="card p-5 flex items-center max-w-sm transition-all hover:shadow-md">
        <div className="p-3 rounded-xl bg-red-50 text-red-600 mr-4">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">Total Expenses</p>
          <p className="text-xl font-bold text-slate-900 font-display mt-0.5">{totalAmount.toFixed(2)} SAR</p>
        </div>
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
