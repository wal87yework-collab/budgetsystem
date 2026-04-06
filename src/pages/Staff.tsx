import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { PlusCircle, Edit, Trash2, X, Users, Download, FileSpreadsheet } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { exportToPDF, exportToExcel } from '../lib/exportUtils';

export default function Staff() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [filterStore, setFilterStore] = useState('All');

  const initialFormState = {
    storeId: '', name: '', phone: '', email: '', iqamaNumber: '', iqamaExpiry: '', baladiaExpiry: ''
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

    const qStaff = user?.role === 'store'
      ? query(collection(db, 'staff'), where('storeId', '==', user.username))
      : collection(db, 'staff');
    const unsubStaff = onSnapshot(qStaff, (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => { unsubStores(); unsubStaff(); };
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
    const staffData = {
      ...formData,
      iqamaRem: calculateRem(formData.iqamaExpiry),
      baladiaRem: calculateRem(formData.baladiaExpiry),
      updatedAt: new Date().toISOString()
    };

    if (user?.role === 'store') {
      staffData.storeId = user.username;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, 'staff', editingId), staffData);
      } else {
        await addDoc(collection(db, 'staff'), { ...staffData, createdAt: new Date().toISOString() });
      }
      setIsModalOpen(false);
      setFormData(initialFormState);
      setEditingId(null);
    } catch (error) {
      console.error("Error saving staff:", error);
      alert("Failed to save staff.");
    }
  };

  const handleEdit = (member: any) => {
    setFormData({
      storeId: member.storeId || '',
      name: member.name || '',
      phone: member.phone || '',
      email: member.email || '',
      iqamaNumber: member.iqamaNumber || '',
      iqamaExpiry: member.iqamaExpiry || '',
      baladiaExpiry: member.baladiaExpiry || ''
    });
    setEditingId(member.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        await deleteDoc(doc(db, 'staff', id));
      } catch (error) {
        console.error("Error deleting staff:", error);
      }
    }
  };

  const filteredStaff = staff.filter(member => {
    if (filterStore !== 'All' && member.storeId !== filterStore) return false;
    return true;
  });

  const handleExportPDF = () => {
    const columns = ['Store', 'Name', 'Phone', 'Iqama No.', 'Iqama Expiry', 'Baladia Expiry'];
    const data = filteredStaff.map(s => [
      s.storeId, s.name, s.phone, s.iqamaNumber, 
      `${s.iqamaExpiry || ''} (${s.iqamaRem || ''})`, 
      `${s.baladiaExpiry || ''} (${s.baladiaRem || ''})`
    ]);
    exportToPDF(`Staff Report`, columns, data);
  };

  const handleExportExcel = () => {
    const data = filteredStaff.map(s => ({
      Store: s.storeId, Name: s.name, Phone: s.phone, 'Iqama No.': s.iqamaNumber, 
      'Iqama Expiry': s.iqamaExpiry, 'Iqama Rem': s.iqamaRem,
      'Baladia Expiry': s.baladiaExpiry, 'Baladia Rem': s.baladiaRem
    }));
    exportToExcel(`Staff Report`, data);
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading staff...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900 font-display">Staff Management</h1>
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
            <PlusCircle className="w-4 h-4 mr-2" /> Add Staff
          </button>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="table-header">Store</th>
                <th className="table-header">Name</th>
                <th className="table-header">Phone</th>
                <th className="table-header">Iqama No.</th>
                <th className="table-header">Iqama Expiry</th>
                <th className="table-header">Baladia Expiry</th>
                <th className="table-header text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredStaff.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">No staff found.</td></tr>
              ) : (
                filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-cell font-medium">{member.storeId}</td>
                    <td className="table-cell font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        {member.name}
                      </div>
                    </td>
                    <td className="table-cell">{member.phone}</td>
                    <td className="table-cell">{member.iqamaNumber}</td>
                    <td className="table-cell whitespace-pre-line">
                      {member.iqamaExpiry}
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${member.iqamaRem?.includes('Expired') ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {member.iqamaRem}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell whitespace-pre-line">
                      {member.baladiaExpiry}
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${member.baladiaRem?.includes('Expired') ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {member.baladiaRem}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell text-center">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => handleEdit(member)} className="text-brand-600 hover:text-brand-900 transition-colors" title="Edit"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(member.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
              <h2 className="text-xl font-bold text-slate-900 font-display">{editingId ? 'Edit Staff' : 'Add New Staff'}</h2>
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
                <label className="label-text">Name <span className="text-red-500">*</span></label>
                <input type="text" required className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="label-text">Phone</label>
                <input type="text" className="input-field" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label className="label-text">Iqama Number</label>
                <input type="text" className="input-field" value={formData.iqamaNumber} onChange={e => setFormData({...formData, iqamaNumber: e.target.value})} />
              </div>
              <div>
                <label className="label-text">Iqama Expiry</label>
                <input type="date" className="input-field" value={formData.iqamaExpiry} onChange={e => setFormData({...formData, iqamaExpiry: e.target.value})} />
              </div>
              <div>
                <label className="label-text">Baladia Expiry</label>
                <input type="date" className="input-field" value={formData.baladiaExpiry} onChange={e => setFormData({...formData, baladiaExpiry: e.target.value})} />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Update Staff' : 'Save Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
