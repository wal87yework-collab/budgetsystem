import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Store, PlusCircle, Edit, Trash2, X, Download, FileSpreadsheet } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { exportToPDF, exportToExcel } from '../lib/exportUtils';

export default function Stores() {
  const { user } = useAuth();
  const [stores, setStores] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const initialFormState = {
    name: '', number: '', company: '', 
    licenseExpiry: '', waterFilterExpiry: '', fireExtExpiry: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    const qStores = user?.role === 'store' 
      ? query(collection(db, 'stores'), where('name', '==', user.username))
      : collection(db, 'stores');
      
    const unsubStores = onSnapshot(qStores, (snapshot) => {
      const storesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStores(storesData);
      setLoading(false);
    });

    const unsubCompanies = onSnapshot(collection(db, 'companies'), (snapshot) => {
      setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubStores();
      unsubCompanies();
    };
  }, [user]);

  const calculateRem = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const days = differenceInDays(parseISO(dateStr), new Date());
      if (days < 0) return `Expired (${Math.abs(days)} days)`;
      return `${days} Days`;
    } catch {
      return 'Invalid Date';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate store names
    if (!editingId) {
      const isDuplicate = stores.some(s => s.name.toLowerCase() === formData.name.trim().toLowerCase());
      if (isDuplicate) {
        alert('A store with this name already exists.');
        return;
      }
    }

    const storeData = {
      ...formData,
      licenseRem: calculateRem(formData.licenseExpiry),
      waterFilterRem: calculateRem(formData.waterFilterExpiry),
      fireExtRem: calculateRem(formData.fireExtExpiry),
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'stores', editingId), storeData);
      } else {
        await addDoc(collection(db, 'stores'), { ...storeData, createdAt: new Date().toISOString() });
      }
      setIsModalOpen(false);
      setFormData(initialFormState);
      setEditingId(null);
    } catch (error) {
      console.error("Error saving store:", error);
      alert("Failed to save store.");
    }
  };

  const handleEdit = (store: any) => {
    setFormData({
      name: store.name || '',
      number: store.number || '',
      company: store.company || '',
      licenseExpiry: store.licenseExpiry || '',
      waterFilterExpiry: store.waterFilterExpiry || '',
      fireExtExpiry: store.fireExtExpiry || ''
    });
    setEditingId(store.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this store?')) {
      try {
        await deleteDoc(doc(db, 'stores', id));
      } catch (error) {
        console.error("Error deleting store:", error);
      }
    }
  };

  const handleExportPDF = () => {
    const columns = ['Store Name', 'Store Number', 'Company', 'License Expiry', 'Water Filter Expiry', 'Fire Ext Expiry'];
    const data = stores.map(s => [
      s.name, s.number, s.company, 
      `${s.licenseExpiry || ''} (${s.licenseRem || ''})`, 
      `${s.waterFilterExpiry || ''} (${s.waterFilterRem || ''})`,
      `${s.fireExtExpiry || ''} (${s.fireExtRem || ''})`
    ]);
    exportToPDF(`Stores Report`, columns, data);
  };

  const handleExportExcel = () => {
    const data = stores.map(s => ({
      'Store Name': s.name, 'Store Number': s.number, Company: s.company, 
      'License Expiry': s.licenseExpiry, 'License Rem': s.licenseRem,
      'Water Filter Expiry': s.waterFilterExpiry, 'Water Filter Rem': s.waterFilterRem,
      'Fire Ext Expiry': s.fireExtExpiry, 'Fire Ext Rem': s.fireExtRem
    }));
    exportToExcel(`Stores Report`, data);
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading stores...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900 font-display">Stores Management</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2 border-slate-200 pr-3 mr-1">
            <button onClick={handleExportPDF} className="btn-secondary py-1.5 px-3" title="Export PDF">
              <Download className="w-4 h-4 text-red-500" />
            </button>
            <button onClick={handleExportExcel} className="btn-secondary py-1.5 px-3" title="Export Excel">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            </button>
          </div>
          {user?.role === 'admin' && (
            <button 
              onClick={() => {
                setFormData(initialFormState);
                setEditingId(null);
                setIsModalOpen(true);
              }}
              className="btn-primary"
            >
              <PlusCircle className="w-4 h-4 mr-2" /> Add New Store
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="table-header">Store Name</th>
                <th className="table-header">Store Number</th>
                <th className="table-header">Company</th>
                <th className="table-header">License Expiry</th>
                <th className="table-header">Water Filter Expiry</th>
                <th className="table-header">Fire Ext Expiry</th>
                <th className="table-header text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {stores.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">No stores found.</td></tr>
              ) : (
                stores.map((store) => (
                  <tr key={store.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-cell font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-slate-400" />
                        {store.name}
                      </div>
                    </td>
                    <td className="table-cell">{store.number}</td>
                    <td className="table-cell">{store.company}</td>
                    <td className="table-cell whitespace-pre-line">
                      {store.licenseExpiry}
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${store.licenseRem?.includes('Expired') ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {store.licenseRem}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell whitespace-pre-line">
                      {store.waterFilterExpiry}
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${store.waterFilterRem?.includes('Expired') ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {store.waterFilterRem}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell whitespace-pre-line">
                      {store.fireExtExpiry}
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${store.fireExtRem?.includes('Expired') ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {store.fireExtRem}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell text-center">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => handleEdit(store)} className="text-brand-600 hover:text-brand-900 transition-colors" title="Edit"><Edit className="w-4 h-4" /></button>
                        {user?.role === 'admin' && (
                          <button onClick={() => handleDelete(store.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        )}
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
              <h2 className="text-xl font-bold text-slate-900 font-display">{editingId ? 'Edit Store' : 'Add New Store'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="label-text">Store Name <span className="text-red-500">*</span></label>
                <input type="text" required className="input-field disabled:opacity-50" disabled={user?.role !== 'admin'} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="label-text">Store Number</label>
                <input type="text" className="input-field disabled:opacity-50" disabled={user?.role !== 'admin'} value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} />
              </div>
              <div>
                <label className="label-text">Company</label>
                <select 
                  className="input-field disabled:opacity-50" 
                  disabled={user?.role !== 'admin'}
                  value={formData.company} 
                  onChange={e => setFormData({...formData, company: e.target.value})}
                >
                  <option value="">Select Company...</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.name || 'Unnamed Company'}>{c.name || 'Unnamed Company'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-text">License Expiry</label>
                <input type="date" className="input-field" value={formData.licenseExpiry} onChange={e => setFormData({...formData, licenseExpiry: e.target.value})} />
              </div>
              <div>
                <label className="label-text">Water Filter Expiry</label>
                <input type="date" className="input-field" value={formData.waterFilterExpiry} onChange={e => setFormData({...formData, waterFilterExpiry: e.target.value})} />
              </div>
              <div>
                <label className="label-text">Fire Extinguisher Expiry</label>
                <input type="date" className="input-field" value={formData.fireExtExpiry} onChange={e => setFormData({...formData, fireExtExpiry: e.target.value})} />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Update Store' : 'Save Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
