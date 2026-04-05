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

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading settings...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center mb-8">
        <div className="flex items-center gap-2 mb-2">
          <SettingsIcon className="w-6 h-6 text-slate-700" />
          <h1 className="text-2xl font-bold text-slate-900 font-display">Settings</h1>
        </div>
        <p className="text-sm text-slate-500 mb-4">Manage companies, stores, suppliers, and budgets.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {/* Manage Suppliers */}
        <div className="card overflow-hidden">
          <div className="bg-brand-600 px-4 py-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-white" />
            <h3 className="text-white font-medium text-sm">Manage Suppliers</h3>
          </div>
          <div className="p-5 space-y-5">
            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 mb-2">{editingSupplierId ? 'Edit Supplier' : 'Add New Supplier'}</h4>
              <div>
                <label className="label-text">Supplier Name <span className="text-red-500">*</span></label>
                <input type="text" required className="input-field" value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} />
              </div>
              
              <div>
                <label className="label-text">Phone Number</label>
                <input type="text" className="input-field" value={newSupplierPhone} onChange={e => setNewSupplierPhone(e.target.value)} />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary">
                  <PlusCircle className="w-4 h-4 mr-2" /> {editingSupplierId ? 'Update' : 'Add Supplier'}
                </button>
                {editingSupplierId && (
                  <button type="button" onClick={() => { setEditingSupplierId(null); setNewSupplierName(''); setNewSupplierPhone(''); }} className="btn-secondary">
                    Cancel
                  </button>
                )}
              </div>
            </form>
            <hr className="border-slate-100" />
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3">Existing Suppliers</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {suppliers.length === 0 ? (
                  <p className="text-sm text-slate-500">No suppliers found.</p>
                ) : (
                  suppliers.map(supplier => (
                    <div key={supplier.id} className="flex justify-between items-center border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors">
                      <span className="text-sm font-medium text-slate-700">{supplier.name} <span className="text-xs text-slate-400 font-normal ml-1">({supplier.phone || 'N/A'})</span></span>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditSupplier(supplier)} className="text-brand-600 hover:text-brand-900 transition-colors p-1"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteSupplier(supplier.id)} className="text-red-500 hover:text-red-700 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Manage Budgets (Placeholder for future) */}
        <div className="card overflow-hidden opacity-75">
          <div className="bg-emerald-600 px-4 py-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-white" />
            <h3 className="text-white font-medium text-sm">Manage Budgets (Coming Soon)</h3>
          </div>
          <div className="p-5">
            <p className="text-sm text-slate-500">Budget management features will be available in the next update.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
