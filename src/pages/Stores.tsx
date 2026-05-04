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
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredStores = stores.filter(store => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        store.name?.toLowerCase().includes(search) ||
        store.number?.toLowerCase().includes(search) ||
        store.company?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const handleExportPDF = () => {
    const columns = ['Store Name', 'Store Number', 'Company', 'License Expiry', 'Water Filter Expiry', 'Fire Ext Expiry'];
    const data = filteredStores.map(s => [
      s.name, s.number, s.company, 
      `${s.licenseExpiry || ''} (${s.licenseRem || ''})`, 
      `${s.waterFilterExpiry || ''} (${s.waterFilterRem || ''})`,
      `${s.fireExtExpiry || ''} (${s.fireExtRem || ''})`
    ]);
    exportToPDF(`Stores Report`, columns, data);
  };

  const handleExportExcel = () => {
    const data = filteredStores.map(s => ({
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
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-grow-0 sm:min-w-[200px]">
             <input
                type="text"
                placeholder="Search stores..."
                className="input-field pl-9 py-1.5 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
             <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <div className="flex gap-2 border-l border-slate-200 pl-3 ml-1">
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

      <div className="card shadow-sm border mt-6">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold text-slate-800">Stores Directory</h3>
          </div>
          <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-200">
            {filteredStores.length} Store{filteredStores.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50">
                <th className="table-header text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-6 text-left">Store Info</th>
                <th className="table-header text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-6 text-left">Company</th>
                <th className="table-header text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-6 text-left">License Details</th>
                <th className="table-header text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-6 text-left">Water Filter</th>
                <th className="table-header text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-6 text-left">Fire Extinguisher</th>
                <th className="table-header text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredStores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 font-medium">No stores found for the selected view.</p>
                  </td>
                </tr>
              ) : (
                filteredStores.map((store) => (
                  <tr key={store.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                          <Store className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{store.name}</p>
                          <p className="text-xs text-slate-500">#{store.number || 'No number'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell font-medium text-slate-700">{store.company || '-'}</td>
                    <td className="table-cell whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-800">{store.licenseExpiry || 'Not provided'}</span>
                        {store.licenseRem && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] w-fit font-bold uppercase tracking-wider ${store.licenseRem?.includes('Expired') ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {store.licenseRem}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-800">{store.waterFilterExpiry || 'Not provided'}</span>
                        {store.waterFilterRem && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] w-fit font-bold uppercase tracking-wider ${store.waterFilterRem?.includes('Expired') ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {store.waterFilterRem}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-800">{store.fireExtExpiry || 'Not provided'}</span>
                        {store.fireExtRem && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] w-fit font-bold uppercase tracking-wider ${store.fireExtRem?.includes('Expired') ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {store.fireExtRem}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-center align-middle">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEdit(store)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors" title="Edit Store">
                          <Edit className="w-4 h-4" />
                        </button>
                        {user?.role === 'admin' && (
                          <button onClick={() => handleDelete(store.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Delete Store">
                            <Trash2 className="w-4 h-4" />
                          </button>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 transform transition-all">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
                <Store className="w-5 h-5 text-indigo-500" />
                {editingId ? 'Edit Store' : 'Add New Store'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="label-text">Store Name <span className="text-red-500">*</span></label>
                  <input type="text" required className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="label-text">Store Number</label>
                  <input type="text" className="input-field" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} />
                </div>
                
                <div className="md:col-span-2">
                  <label className="label-text">Company</label>
                  <select 
                    className="input-field" 
                    value={formData.company} 
                    onChange={e => setFormData({...formData, company: e.target.value})}
                  >
                    <option value="">Select Company...</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.name || 'Unnamed Company'}>{c.name || 'Unnamed Company'}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
                <h4 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">Compliance Expiry Dates</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label-text text-xs">License Expiry</label>
                    <input type="date" disabled={user?.role !== 'admin'} className="input-field text-sm disabled:bg-slate-100 disabled:opacity-75" value={formData.licenseExpiry} onChange={e => setFormData({...formData, licenseExpiry: e.target.value})} />
                  </div>
                  <div>
                    <label className="label-text text-xs">Water Filter Expiry</label>
                    <input type="date" disabled={user?.role !== 'admin'} className="input-field text-sm disabled:bg-slate-100 disabled:opacity-75" value={formData.waterFilterExpiry} onChange={e => setFormData({...formData, waterFilterExpiry: e.target.value})} />
                  </div>
                  <div>
                    <label className="label-text text-xs">Fire Extinguisher Expiry</label>
                    <input type="date" disabled={user?.role !== 'admin'} className="input-field text-sm disabled:bg-slate-100 disabled:opacity-75" value={formData.fireExtExpiry} onChange={e => setFormData({...formData, fireExtExpiry: e.target.value})} />
                  </div>
                </div>
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
