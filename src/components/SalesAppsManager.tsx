import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  SalesApp, 
  SalesAppStatus, 
  ensureDefaultSalesApps, 
  toAppKey, 
  getAppColorClasses 
} from '../lib/salesApps';
import { confirmDelete, confirmUpdate } from '../lib/alerts';
import { 
  Smartphone, 
  Route, 
  ShoppingBag, 
  Utensils, 
  Coffee, 
  Zap, 
  Bike, 
  Globe, 
  Package, 
  Store,
  PlusCircle, 
  Edit, 
  Trash2, 
  EyeOff, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Sparkles, 
  HelpCircle, 
  X 
} from 'lucide-react';

export const ICON_OPTIONS: { id: string; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'smartphone', label: 'Mobile / Phone', icon: Smartphone },
  { id: 'route', label: 'Route / Delivery', icon: Route },
  { id: 'shopping-bag', label: 'Bag / Store', icon: ShoppingBag },
  { id: 'utensils', label: 'Utensils / Food', icon: Utensils },
  { id: 'coffee', label: 'Coffee / Cafe', icon: Coffee },
  { id: 'zap', label: 'Lightning / Fast', icon: Zap },
  { id: 'bike', label: 'Bike / Courier', icon: Bike },
  { id: 'globe', label: 'Web / Online', icon: Globe },
  { id: 'package', label: 'Parcel / Package', icon: Package },
  { id: 'store', label: 'Store / Shop', icon: Store },
];

export const COLOR_OPTIONS: { id: string; label: string; bg: string }[] = [
  { id: 'purple', label: 'Purple', bg: 'bg-purple-500' },
  { id: 'blue', label: 'Blue', bg: 'bg-blue-500' },
  { id: 'pink', label: 'Pink', bg: 'bg-pink-500' },
  { id: 'orange', label: 'Orange', bg: 'bg-orange-500' },
  { id: 'yellow', label: 'Amber', bg: 'bg-amber-500' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500' },
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500' },
  { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-500' },
];

export function renderAppIcon(iconName?: string, className: string = 'w-4 h-4') {
  switch (iconName) {
    case 'route': return <Route className={className} />;
    case 'shopping-bag': return <ShoppingBag className={className} />;
    case 'utensils': return <Utensils className={className} />;
    case 'coffee': return <Coffee className={className} />;
    case 'zap': return <Zap className={className} />;
    case 'bike': return <Bike className={className} />;
    case 'globe': return <Globe className={className} />;
    case 'package': return <Package className={className} />;
    case 'store': return <Store className={className} />;
    case 'smartphone':
    default:
      return <Smartphone className={className} />;
  }
}

export default function SalesAppsManager() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [apps, setApps] = useState<SalesApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);

  // Form State
  const initialForm = {
    name: '',
    key: '',
    status: 'active' as SalesAppStatus,
    icon: 'smartphone',
    color: 'purple',
    displayOrder: 1,
  };
  const [formData, setFormData] = useState(initialForm);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Initial auto-seed default apps if none exist
    ensureDefaultSalesApps();

    const q = query(collection(db, 'sales_apps'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: SalesApp[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as any)
      }));
      // Sort by displayOrder ascending, then name
      list.sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99) || a.name.localeCompare(b.name));
      setApps(list);
      setLoading(false);
    }, (err) => {
      console.warn("Error fetching sales apps:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenAdd = () => {
    if (!isAdmin) return;
    setEditingAppId(null);
    setFormData({
      ...initialForm,
      displayOrder: apps.length + 1
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (app: SalesApp) => {
    if (!isAdmin) return;
    setEditingAppId(app.id);
    setFormData({
      name: app.name,
      key: app.key || app.id,
      status: app.status || 'active',
      icon: app.icon || 'smartphone',
      color: app.color || 'purple',
      displayOrder: app.displayOrder || 1,
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSaveApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setErrorMsg('App name is required.');
      return;
    }

    const appKey = formData.key.trim() || toAppKey(trimmedName);

    // Duplicate check on key or name (excluding currently edited item)
    const duplicate = apps.find(a => 
      a.id !== editingAppId && 
      (a.key.toLowerCase() === appKey.toLowerCase() || a.name.toLowerCase() === trimmedName.toLowerCase())
    );
    if (duplicate) {
      setErrorMsg(`An app with this name or key ("${duplicate.name}") already exists.`);
      return;
    }

    if (editingAppId) {
      if (!(await confirmUpdate('Are you sure you want to update this sales app?'))) return;
    }

    if (!isAdmin) {
      setErrorMsg('Only administrators can create or edit delivery apps.');
      return;
    }

    try {
      const docId = editingAppId || appKey;
      const docRef = doc(db, 'sales_apps', docId);

      const payload = {
        name: trimmedName,
        key: appKey,
        status: formData.status,
        icon: formData.icon,
        color: formData.color,
        displayOrder: Number(formData.displayOrder) || 1,
        updatedAt: new Date().toISOString()
      };

      if (!editingAppId) {
        (payload as any).createdAt = new Date().toISOString();
      }

      await setDoc(docRef, payload, { merge: true });
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error saving sales app:", err);
      setErrorMsg("Failed to save sales app: " + (err.message || 'Unknown error'));
    }
  };

  const handleToggleStatus = async (app: SalesApp, newStatus: SalesAppStatus) => {
    if (!isAdmin) {
      alert("Only administrators can change delivery app status.");
      return;
    }
    try {
      await updateDoc(doc(db, 'sales_apps', app.id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error updating app status:", err);
      alert("Failed to update status.");
    }
  };

  const handleDelete = async (app: SalesApp) => {
    if (!isAdmin) {
      alert("Only administrators can delete delivery apps.");
      return;
    }
    const confirmed = await confirmDelete(
      `Delete "${app.name}" app?\n\nNote: Historical sales records with this app will remain safely preserved in the database and history, but it will no longer be listed.`
    );
    if (confirmed) {
      try {
        await deleteDoc(doc(db, 'sales_apps', app.id));
      } catch (err) {
        console.error("Error deleting sales app:", err);
        alert("Failed to delete sales app.");
      }
    }
  };

  const handleRestoreDefaults = async () => {
    if (!isAdmin) {
      alert("Only administrators can refresh default delivery apps.");
      return;
    }
    setIsPreloading(true);
    try {
      await ensureDefaultSalesApps();
      alert("Default sales apps (STC, Wasal, ToYou, Jahez, Hunger Station, Keeta) have been checked and refreshed.");
    } catch (err) {
      console.error("Error refreshing default apps:", err);
      alert("Failed to refresh default apps.");
    } finally {
      setIsPreloading(false);
    }
  };

  const activeCount = apps.filter(a => a.status === 'active').length;
  const hiddenCount = apps.filter(a => a.status === 'hidden').length;
  const disabledCount = apps.filter(a => a.status === 'disabled').length;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-4 flex flex-wrap items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-xs">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base leading-tight">Delivery & Sales Apps</h3>
              <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-white/30">
                Admin Only
              </span>
            </div>
            <p className="text-xs text-amber-100">Configure online delivery apps (STC, Jahez, Keeta, custom apps, etc.)</p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={handleRestoreDefaults}
              disabled={isPreloading}
              className="text-xs bg-white/15 hover:bg-white/25 px-2.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 text-white border border-white/20"
              title="Preload / Ensure 6 standard default apps"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isPreloading ? 'animate-spin' : ''}`} />
              Preload Defaults
            </button>
            <button 
              type="button"
              onClick={handleOpenAdd}
              className="text-xs bg-white text-amber-900 hover:bg-amber-50 px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <PlusCircle className="w-4 h-4 text-amber-600" />
              Add New App
            </button>
          </div>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 border border-emerald-200/60 rounded-xl p-3 text-center">
            <span className="text-xs font-semibold text-emerald-700 block uppercase tracking-wider">Active</span>
            <span className="text-xl font-bold text-emerald-900 font-display">{activeCount}</span>
            <span className="text-[10px] text-emerald-600 block mt-0.5">Shown in new sales</span>
          </div>
          <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3 text-center">
            <span className="text-xs font-semibold text-amber-700 block uppercase tracking-wider">Hidden</span>
            <span className="text-xl font-bold text-amber-900 font-display">{hiddenCount}</span>
            <span className="text-[10px] text-amber-600 block mt-0.5">Visible only in history</span>
          </div>
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-center">
            <span className="text-xs font-semibold text-slate-700 block uppercase tracking-wider">Disabled</span>
            <span className="text-xl font-bold text-slate-900 font-display">{disabledCount}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Inactive</span>
          </div>
        </div>

        {/* Informative Note */}
        <div className="flex items-start gap-2.5 p-3 bg-amber-50/70 border border-amber-100 rounded-xl text-xs text-amber-800">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            <strong>Behavior rule:</strong> Active apps are displayed in the <em>Add New Sales Record</em> entry form. 
            Hidden and Disabled apps will not appear in new entries, but all past sales records for them are safely preserved and calculated in historical reports.
          </p>
        </div>

        {/* Apps List */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Configured Sales Apps ({apps.length})</h4>
          
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-500">Loading delivery apps...</div>
          ) : apps.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-3">
              <Smartphone className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm text-slate-600 font-medium">No sales apps configured yet.</p>
              <button 
                type="button" 
                onClick={handleRestoreDefaults}
                className="btn-primary text-xs"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Preload Default 6 Apps (STC, Jahez, Keeta, etc.)
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {apps.map((app) => {
                const colorClasses = getAppColorClasses(app.color);
                return (
                  <div 
                    key={app.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-white hover:bg-slate-50/50 transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorClasses.bgLight} ${colorClasses.text} border ${colorClasses.border}`}>
                        {renderAppIcon(app.icon, 'w-4 h-4')}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800 truncate">{app.name}</span>
                          <span className="text-[11px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {app.key}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-400">Order: #{app.displayOrder || 1}</span>
                          <span className="text-slate-300">•</span>
                          {app.status === 'active' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                            </span>
                          )}
                          {app.status === 'hidden' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <EyeOff className="w-3 h-3 text-amber-600" /> Hidden from new entries
                            </span>
                          )}
                          {app.status === 'disabled' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              <XCircle className="w-3 h-3 text-slate-400" /> Disabled
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Status Select & Action Buttons - Admin only */}
                    {isAdmin && (
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(app, 'active')}
                            className={`px-2 py-1 rounded-md font-medium transition-all ${
                              app.status === 'active' 
                                ? 'bg-emerald-600 text-white shadow-xs font-semibold' 
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="Active: Shown in new sales record entries"
                          >
                            Active
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(app, 'hidden')}
                            className={`px-2 py-1 rounded-md font-medium transition-all ${
                              app.status === 'hidden' 
                                ? 'bg-amber-500 text-white shadow-xs font-semibold' 
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="Hidden: Kept in past history, hidden from new sales entries"
                          >
                            Hide
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(app, 'disabled')}
                            className={`px-2 py-1 rounded-md font-medium transition-all ${
                              app.status === 'disabled' 
                                ? 'bg-slate-700 text-white shadow-xs font-semibold' 
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="Disabled: Inactive"
                          >
                            Disable
                          </button>
                        </div>

                        <button 
                          type="button"
                          onClick={() => handleOpenEdit(app)}
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Edit App Details"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDelete(app)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete App"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit App Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 font-display">
                  {editingAppId ? 'Edit Sales App' : 'Add New Sales App'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveApp} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="label-text">App Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Mrsool, Cari, Ninja, Keeta"
                  className="input-field"
                  value={formData.name}
                  onChange={e => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      name: val,
                      key: !editingAppId ? toAppKey(val) : prev.key
                    }));
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Field Key / ID</label>
                  <input 
                    type="text" 
                    required
                    disabled={!!editingAppId}
                    placeholder="e.g. mrsool"
                    className="input-field font-mono text-xs"
                    value={formData.key}
                    onChange={e => setFormData({ ...formData, key: e.target.value.trim() })}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {editingAppId ? 'Key cannot be changed after creation.' : 'Database property key used in sales documents.'}
                  </p>
                </div>

                <div>
                  <label className="label-text">Display Order</label>
                  <input 
                    type="number" 
                    min="1"
                    className="input-field"
                    value={formData.displayOrder}
                    onChange={e => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div>
                <label className="label-text">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'active' })}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                      formData.status === 'active' 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 font-bold' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Active</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'hidden' })}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                      formData.status === 'hidden' 
                        ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20 font-bold' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <EyeOff className="w-4 h-4 text-amber-600" />
                    <span>Hide From New</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'disabled' })}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                      formData.status === 'disabled' 
                        ? 'bg-slate-100 border-slate-500 text-slate-900 ring-2 ring-slate-500/20 font-bold' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-slate-500" />
                    <span>Disabled</span>
                  </button>
                </div>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="label-text">App Icon</label>
                <div className="grid grid-cols-5 gap-2">
                  {ICON_OPTIONS.map(opt => {
                    const IconComp = opt.icon;
                    const isSelected = formData.icon === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: opt.id })}
                        className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                          isSelected 
                            ? 'bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-500/20' 
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        title={opt.label}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="text-[9px] mt-1 truncate max-w-full">{opt.label.split('/')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="label-text">Badge Accent Color</label>
                <div className="flex flex-wrap gap-2.5">
                  {COLOR_OPTIONS.map(col => {
                    const isSelected = formData.color === col.id;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: col.id })}
                        className={`w-7 h-7 rounded-full ${col.bg} transition-all flex items-center justify-center ${
                          isSelected ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'opacity-80 hover:opacity-100'
                        }`}
                        title={col.label}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary bg-amber-600 hover:bg-amber-700"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  {editingAppId ? 'Update App' : 'Save New App'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
