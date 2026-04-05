import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { PlusCircle, Edit, Trash2, X, Users } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

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

  if (loading) return <div className="p-4">Loading staff...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
        </div>
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
            <PlusCircle className="w-4 h-4 mr-2" /> Add Staff
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Iqama No.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Iqama Expiry</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Baladia Expiry</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStaff.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">No staff found.</td></tr>
              ) : (
                filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.storeId}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        {member.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.phone}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.iqamaNumber}</td>
                    <td className="px-4 py-3 whitespace-pre-line text-sm text-gray-900">
                      {member.iqamaExpiry}
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${member.iqamaRem?.includes('Expired') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {member.iqamaRem}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-pre-line text-sm text-gray-900">
                      {member.baladiaExpiry}
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${member.baladiaRem?.includes('Expired') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {member.baladiaRem}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEdit(member)} className="text-blue-600 hover:text-blue-900"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(member.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md my-8">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Staff' : 'Add New Staff'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Store <span className="text-red-500">*</span></label>
                <select 
                  required disabled={user?.role === 'store'}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border disabled:bg-gray-100"
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
                <label className="block text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input type="text" required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                <input type="text" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Iqama Number</label>
                <input type="text" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.iqamaNumber} onChange={e => setFormData({...formData, iqamaNumber: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Iqama Expiry</label>
                <input type="date" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.iqamaExpiry} onChange={e => setFormData({...formData, iqamaExpiry: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Baladia Expiry</label>
                <input type="date" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.baladiaExpiry} onChange={e => setFormData({...formData, baladiaExpiry: e.target.value})} />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                  Close
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                  {editingId ? 'Update Staff' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
