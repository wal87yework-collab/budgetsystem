import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Settings as SettingsIcon, PlusCircle, Edit, Trash2, Building2, DollarSign, Calculator, Calendar } from 'lucide-react';

export default function Settings() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

  useEffect(() => {
    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubSuppliers();
  }, []);

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;

    try {
      if (editingSupplierId) {
        await updateDoc(doc(db, 'suppliers', editingSupplierId), {
          name: newSupplierName,
          phone: newSupplierPhone
        });
      } else {
        await addDoc(collection(db, 'suppliers'), {
          name: newSupplierName,
          phone: newSupplierPhone,
          createdAt: new Date().toISOString()
        });
      }
      setNewSupplierName('');
      setNewSupplierPhone('');
      setEditingSupplierId(null);
    } catch (error) {
      console.error("Error saving supplier:", error);
      alert("Failed to save supplier.");
    }
  };

  const handleEditSupplier = (supplier: any) => {
    setNewSupplierName(supplier.name);
    setNewSupplierPhone(supplier.phone || '');
    setEditingSupplierId(supplier.id);
  };

  const handleDeleteSupplier = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await deleteDoc(doc(db, 'suppliers', id));
      } catch (error) {
        console.error("Error deleting supplier:", error);
      }
    }
  };

  if (loading) return <div className="p-4">Loading settings...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center mb-8">
        <div className="flex items-center gap-2 mb-2">
          <SettingsIcon className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>
        <p className="text-sm text-gray-500 mb-4">Manage companies, stores, suppliers, and budgets.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {/* Manage Suppliers */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-blue-600 px-4 py-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-white" />
            <h3 className="text-white font-medium text-sm">Manage Suppliers</h3>
          </div>
          <div className="p-4 space-y-4">
            <form onSubmit={handleSaveSupplier}>
              <h4 className="text-sm font-bold text-gray-900 mb-2">{editingSupplierId ? 'Edit Supplier' : 'Add New Supplier'}</h4>
              <label className="block text-xs font-medium text-gray-700 mb-1">Supplier Name <span className="text-red-500">*</span></label>
              <input type="text" required className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-1.5 px-3 border mb-2" value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} />
              
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
              <input type="text" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-1.5 px-3 border mb-3" value={newSupplierPhone} onChange={e => setNewSupplierPhone(e.target.value)} />
              
              <div className="flex gap-2">
                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center">
                  <PlusCircle className="w-3 h-3 mr-1" /> {editingSupplierId ? 'Update' : 'Add Supplier'}
                </button>
                {editingSupplierId && (
                  <button type="button" onClick={() => { setEditingSupplierId(null); setNewSupplierName(''); setNewSupplierPhone(''); }} className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm font-medium">
                    Cancel
                  </button>
                )}
              </div>
            </form>
            <hr className="border-gray-200" />
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-2">Existing Suppliers</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {suppliers.length === 0 ? (
                  <p className="text-sm text-gray-500">No suppliers found.</p>
                ) : (
                  suppliers.map(supplier => (
                    <div key={supplier.id} className="flex justify-between items-center border border-gray-200 rounded p-2">
                      <span className="text-sm text-gray-700">{supplier.name} <span className="text-xs text-gray-400">({supplier.phone || 'N/A'})</span></span>
                      <div className="flex gap-1">
                        <button onClick={() => handleEditSupplier(supplier)} className="text-blue-500 hover:text-blue-700 border border-blue-200 p-1 rounded"><Edit className="w-3 h-3" /></button>
                        <button onClick={() => handleDeleteSupplier(supplier.id)} className="text-red-500 hover:text-red-700 border border-red-200 p-1 rounded"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Manage Budgets (Placeholder for future) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden opacity-75">
          <div className="bg-green-700 px-4 py-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-white" />
            <h3 className="text-white font-medium text-sm">Manage Budgets (Coming Soon)</h3>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-500">Budget management features will be available in the next update.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
