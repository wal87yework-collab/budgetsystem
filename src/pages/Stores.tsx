import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Store, PlusCircle, Edit, Trash2, X } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

export default function Stores() {
  const { user } = useAuth();
  const [stores, setStores] = useState<any[]>([]);
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

    return () => unsubStores();
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

  if (loading) return <div className="p-4">Loading stores...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">Stores Management</h1>
        </div>
        {user?.role === 'admin' && (
          <button 
            onClick={() => {
              setFormData(initialFormState);
              setEditingId(null);
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium flex items-center"
          >
            <PlusCircle className="w-4 h-4 mr-2" /> Add New Store
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Expiry</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Water Filter Expiry</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fire Ext Expiry</th>
                {user?.role === 'admin' && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stores.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">No stores found.</td></tr>
              ) : (
                stores.map((store) => (
                  <tr key={store.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-gray-400" />
                        {store.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{store.number}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{store.company}</td>
                    <td className="px-4 py-3 whitespace-pre-line text-sm text-gray-900">
                      {store.licenseExpiry}
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${store.licenseRem?.includes('Expired') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {store.licenseRem}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-pre-line text-sm text-gray-900">
                      {store.waterFilterExpiry}
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${store.waterFilterRem?.includes('Expired') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {store.waterFilterRem}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-pre-line text-sm text-gray-900">
                      {store.fireExtExpiry}
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${store.fireExtRem?.includes('Expired') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {store.fireExtRem}
                        </span>
                      </div>
                    </td>
                    {user?.role === 'admin' && (
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleEdit(store)} className="text-blue-600 hover:text-blue-900"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(store.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    )}
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
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Store' : 'Add New Store'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Store Name <span className="text-red-500">*</span></label>
                <input type="text" required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Store Number</label>
                <input type="text" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
                <input type="text" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">License Expiry</label>
                <input type="date" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.licenseExpiry} onChange={e => setFormData({...formData, licenseExpiry: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Water Filter Expiry</label>
                <input type="date" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.waterFilterExpiry} onChange={e => setFormData({...formData, waterFilterExpiry: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fire Extinguisher Expiry</label>
                <input type="date" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border" value={formData.fireExtExpiry} onChange={e => setFormData({...formData, fireExtExpiry: e.target.value})} />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                  Close
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                  {editingId ? 'Update Store' : 'Add Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
