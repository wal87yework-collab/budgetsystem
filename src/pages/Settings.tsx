import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Settings as SettingsIcon, PlusCircle, Edit, Trash2, Building2, DollarSign, Calculator, Calendar, Download, FileSpreadsheet, Briefcase } from 'lucide-react';
import { exportToPDF, exportToExcel } from '../lib/exportUtils';

export default function Settings() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Supplier State
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

  // Company State
  const initialCompanyForm = { name: '', telephone: '', phone: '', email: '', taxNumber: '', location: '', notes: '' };
  const [companyFormData, setCompanyFormData] = useState(initialCompanyForm);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const unsubCompanies = onSnapshot(collection(db, 'companies'), (snapshot) => {
      setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubSuppliers();
      unsubCompanies();
    };
  }, []);

  // --- Supplier Handlers ---
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

  // --- Company Handlers ---
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyFormData.name?.trim()) return;

    // Prevent duplicate company names
    if (!editingCompanyId) {
      const isDuplicate = companies.some(c => c.name && c.name.toLowerCase() === companyFormData.name.trim().toLowerCase());
      if (isDuplicate) {
        alert('A company with this name already exists.');
        return;
      }
    }

    try {
      if (editingCompanyId) {
        await updateDoc(doc(db, 'companies', editingCompanyId), companyFormData);
      } else {
        await addDoc(collection(db, 'companies'), {
          ...companyFormData,
          createdAt: new Date().toISOString()
        });
      }
      setCompanyFormData(initialCompanyForm);
      setEditingCompanyId(null);
    } catch (error) {
      console.error("Error saving company:", error);
      alert("Failed to save company.");
    }
  };

  const handleEditCompany = (company: any) => {
    setCompanyFormData({
      name: company.name || '',
      telephone: company.telephone || '',
      phone: company.phone || '',
      email: company.email || '',
      taxNumber: company.taxNumber || '',
      location: company.location || '',
      notes: company.notes || ''
    });
    setEditingCompanyId(company.id);
  };

  const handleDeleteCompany = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      try {
        await deleteDoc(doc(db, 'companies', id));
      } catch (error) {
        console.error("Error deleting company:", error);
      }
    }
  };

  // --- Export Handlers ---
  const handleExportPDF = () => {
    const columns = ['Supplier Name', 'Phone Number'];
    const data = suppliers.map(s => [s.name, s.phone || 'N/A']);
    exportToPDF(`Suppliers Report`, columns, data);
  };

  const handleExportExcel = () => {
    const data = suppliers.map(s => ({
      'Supplier Name': s.name, 'Phone Number': s.phone || 'N/A'
    }));
    exportToExcel(`Suppliers Report`, data);
  };

  const handleExportCompaniesPDF = () => {
    const columns = ['Company Name', 'Telephone', 'Tax Number', 'Location', 'Email'];
    const data = companies.map(c => [c.name || 'N/A', c.telephone || 'N/A', c.taxNumber || 'N/A', c.location || 'N/A', c.email || 'N/A']);
    exportToPDF(`Companies Report`, columns, data);
  };

  const handleExportCompaniesExcel = () => {
    const data = companies.map(c => ({
      'Company Name': c.name || 'N/A', 'Telephone': c.telephone || 'N/A', 'Phone': c.phone || 'N/A',
      'Tax Number': c.taxNumber || 'N/A', 'Location': c.location || 'N/A', 'Email': c.email || 'N/A'
    }));
    exportToExcel(`Companies Report`, data);
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
        {/* Manage Companies */}
        <div className="card overflow-hidden">
          <div className="bg-indigo-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-white" />
              <h3 className="text-white font-medium text-sm">Manage Companies</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={handleExportCompaniesPDF} className="text-white hover:text-red-200 transition-colors" title="Export PDF">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={handleExportCompaniesExcel} className="text-white hover:text-emerald-200 transition-colors" title="Export Excel">
                <FileSpreadsheet className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-5 space-y-5">
            <form onSubmit={handleSaveCompany} className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 mb-2">{editingCompanyId ? 'Edit Company' : 'Add New Company'}</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label-text">Company Name <span className="text-red-500">*</span></label>
                  <input type="text" required className="input-field" value={companyFormData.name} onChange={e => setCompanyFormData({...companyFormData, name: e.target.value})} />
                </div>
                <div>
                  <label className="label-text">Telephone</label>
                  <input type="text" className="input-field" value={companyFormData.telephone} onChange={e => setCompanyFormData({...companyFormData, telephone: e.target.value})} />
                </div>
                <div>
                  <label className="label-text">Mobile Phone</label>
                  <input type="text" className="input-field" value={companyFormData.phone} onChange={e => setCompanyFormData({...companyFormData, phone: e.target.value})} />
                </div>
                <div>
                  <label className="label-text">Email</label>
                  <input type="email" className="input-field" value={companyFormData.email} onChange={e => setCompanyFormData({...companyFormData, email: e.target.value})} />
                </div>
                <div>
                  <label className="label-text">Tax Number</label>
                  <input type="text" className="input-field" value={companyFormData.taxNumber} onChange={e => setCompanyFormData({...companyFormData, taxNumber: e.target.value})} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label-text">Location / Address</label>
                  <input type="text" className="input-field" value={companyFormData.location} onChange={e => setCompanyFormData({...companyFormData, location: e.target.value})} />
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary bg-indigo-600 hover:bg-indigo-700">
                  <PlusCircle className="w-4 h-4 mr-2" /> {editingCompanyId ? 'Update' : 'Add Company'}
                </button>
                {editingCompanyId && (
                  <button type="button" onClick={() => { setEditingCompanyId(null); setCompanyFormData(initialCompanyForm); }} className="btn-secondary">
                    Cancel
                  </button>
                )}
              </div>
            </form>
            <hr className="border-slate-100" />
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3">Existing Companies</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {companies.length === 0 ? (
                  <p className="text-sm text-slate-500">No companies found.</p>
                ) : (
                  companies.map(company => (
                    <div key={company.id} className="flex justify-between items-center border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors">
                      <div>
                        <span className="text-sm font-medium text-slate-700 block">{company.name || 'Unnamed Company'}</span>
                        <span className="text-xs text-slate-500">{company.taxNumber ? `Tax: ${company.taxNumber}` : 'No Tax ID'}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditCompany(company)} className="text-brand-600 hover:text-brand-900 transition-colors p-1"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteCompany(company.id)} className="text-red-500 hover:text-red-700 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Manage Suppliers */}
        <div className="card overflow-hidden">
          <div className="bg-brand-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-white" />
              <h3 className="text-white font-medium text-sm">Manage Suppliers</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={handleExportPDF} className="text-white hover:text-red-200 transition-colors" title="Export PDF">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={handleExportExcel} className="text-white hover:text-emerald-200 transition-colors" title="Export Excel">
                <FileSpreadsheet className="w-4 h-4" />
              </button>
            </div>
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

      </div>
    </div>
  );
}
