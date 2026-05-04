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
  const [searchTerm, setSearchTerm] = useState('');

  const initialFormState = {
    storeId: '', name: '', phone: '', email: '', iqamaNumber: '', iqamaExpiry: '', baladiaExpiry: '', sandwichArtist1Check: '', sandwichArtist2Check: ''
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
      baladiaExpiry: member.baladiaExpiry || '',
      sandwichArtist1Check: member.sandwichArtist1Check || '',
      sandwichArtist2Check: member.sandwichArtist2Check || ''
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
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        member.name?.toLowerCase().includes(search) ||
        member.phone?.toLowerCase().includes(search) ||
        member.email?.toLowerCase().includes(search) ||
        member.iqamaNumber?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const handleExportPDF = () => {
    const columns = ['Store', 'Name', 'Phone', 'Email', 'Iqama No.', 'Iqama Expiry', 'Baladia Expiry', 'Sandwich Artist 1', 'Sandwich Artist 2'];
    const data = filteredStaff.map(s => [
      s.storeId, s.name, s.phone, s.email, s.iqamaNumber, 
      `${s.iqamaExpiry || ''} (${s.iqamaRem || ''})`, 
      `${s.baladiaExpiry || ''} (${s.baladiaRem || ''})`,
      s.sandwichArtist1Check || 'No',
      s.sandwichArtist2Check || 'No'
    ]);
    exportToPDF(`Staff Report`, columns, data, 'landscape');
  };

  const handleExportExcel = () => {
    const data = filteredStaff.map(s => ({
      Store: s.storeId, Name: s.name, Phone: s.phone, Email: s.email, 'Iqama No.': s.iqamaNumber, 
      'Iqama Expiry': s.iqamaExpiry, 'Iqama Rem': s.iqamaRem,
      'Baladia Expiry': s.baladiaExpiry, 'Baladia Rem': s.baladiaRem,
      'Sandwich Artist 1': s.sandwichArtist1Check === 'Yes' ? 'Yes' : 'No',
      'Sandwich Artist 2': s.sandwichArtist2Check === 'Yes' ? 'Yes' : 'No'
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
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-grow-0 sm:min-w-[200px]">
             <input
                type="text"
                placeholder="Search staff..."
                className="input-field pl-9 py-1.5 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
             <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
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

      <div className="card shadow-sm border mt-6">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold text-slate-800">Staff Directory</h3>
          </div>
          <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-200">
            {filteredStaff.length} Member{filteredStaff.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50">
                <th className="table-header text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-6 text-left">Store</th>
                <th className="table-header text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-6 text-left">Staff Info</th>
                <th className="table-header text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-6 text-left">Contact</th>
                <th className="table-header text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-6 text-left">Iqama Details</th>
                <th className="table-header text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-6 text-left">Baladia Expiry</th>
                <th className="table-header text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-6 text-left whitespace-nowrap">Training (1 / 2)</th>
                <th className="table-header text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 font-medium">No staff found for the selected view.</p>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="table-cell font-bold text-slate-700 whitespace-nowrap">{member.storeId}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                          {member.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{member.name}</p>
                          <p className="text-xs text-slate-500">{member.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-sm text-slate-600">{member.phone || '-'}</td>
                    <td className="table-cell">
                      <p className="font-medium text-slate-800 text-sm">{member.iqamaNumber || 'Not provided'}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">{member.iqamaExpiry || 'No date'}</span>
                        {member.iqamaRem && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${member.iqamaRem?.includes('Expired') ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {member.iqamaRem}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-800">{member.baladiaExpiry || 'Not provided'}</span>
                        {member.baladiaRem && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] w-fit font-bold uppercase tracking-wider ${member.baladiaRem?.includes('Expired') ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {member.baladiaRem}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-col gap-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium w-fit border ${member.sandwichArtist1Check === 'Yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {member.sandwichArtist1Check === 'Yes' ? '✓ SA 1 Complete' : '◷ SA 1 Pending'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium w-fit border ${member.sandwichArtist2Check === 'Yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {member.sandwichArtist2Check === 'Yes' ? '✓ SA 2 Complete' : '◷ SA 2 Pending'}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell text-center align-middle">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEdit(member)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors" title="Edit Staff">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(member.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Delete Staff">
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                <Users className="w-5 h-5 text-indigo-500" />
                {editingId ? 'Edit Staff Member' : 'Add New Staff'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
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
                  <label className="label-text">Email</label>
                  <input type="email" className="input-field" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
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
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-3">
                <h4 className="text-sm font-semibold text-slate-800">Training Checklists</h4>
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                      checked={formData.sandwichArtist1Check === 'Yes'}
                      onChange={e => setFormData({...formData, sandwichArtist1Check: e.target.checked ? 'Yes' : 'No'})}
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Sandwich Artist 1 Complete</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                      checked={formData.sandwichArtist2Check === 'Yes'}
                      onChange={e => setFormData({...formData, sandwichArtist2Check: e.target.checked ? 'Yes' : 'No'})}
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Sandwich Artist 2 Complete</span>
                  </label>
                </div>
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
