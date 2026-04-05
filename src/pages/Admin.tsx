import React from 'react';
import { ShieldAlert, Database, Upload, Download, RefreshCw, AlertCircle } from 'lucide-react';

export default function Admin() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 font-display">
          <ShieldAlert className="w-6 h-6 text-brand-600" /> Admin Tools
        </h1>
        <p className="text-sm text-slate-500">Database Management and System Utilities.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full Backup */}
        <div className="card overflow-hidden">
          <div className="bg-brand-600 px-4 py-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-white" />
            <h3 className="text-white font-medium text-sm">Full Backup (DB & Photos)</h3>
          </div>
          <div className="p-5 space-y-5">
            <button className="btn-primary w-full justify-center bg-emerald-600 hover:bg-emerald-700">
              <Download className="w-4 h-4 mr-2" /> Create New Full Backup
            </button>
            <hr className="border-slate-100" />
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <ListIcon className="w-4 h-4 text-slate-400" /> Existing Backups
              </h4>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 text-center">
                <p className="text-sm text-slate-500">No full backups (.zip) found.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Restore Backup */}
        <div className="card overflow-hidden">
          <div className="bg-amber-500 px-4 py-3 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-white" />
            <h3 className="text-white font-medium text-sm">Restore Full Backup (DB & Photos)</h3>
          </div>
          <div className="p-5 space-y-5">
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-100">
              <div className="flex items-start gap-3 font-medium">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-500" /> 
                <p className="leading-relaxed">Warning: Restoring a full backup will overwrite the current database AND photos. Ensure you have a recent backup if needed. The current database and photos folder will be backed up automatically before restore.</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-slate-900 mb-3">Option 1: Upload Backup File (.zip)</h4>
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden mb-3 bg-slate-50">
                <button className="bg-white px-4 py-2.5 text-sm font-medium border-r border-slate-200 hover:bg-slate-50 transition-colors">Choose file</button>
                <span className="px-4 py-2.5 text-sm text-slate-500">No file chosen</span>
              </div>
              <button className="btn-primary w-full justify-center">
                <Upload className="w-4 h-4 mr-2" /> Restore from Uploaded File
              </button>
            </div>

            <hr className="border-slate-100" />

            <div>
              <h4 className="text-sm font-medium text-slate-900 mb-2">Option 2: Select Existing Backup</h4>
              <p className="text-xs text-slate-500 mb-2">Choose a backup to restore:</p>
              <select className="input-field mb-3 text-slate-500">
                <option>No backups available</option>
              </select>
              <button className="btn-primary w-full justify-center bg-cyan-600 hover:bg-cyan-700">
                <RefreshCw className="w-4 h-4 mr-2" /> Restore from Selected Backup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple ListIcon component since it's not imported from lucide-react above
function ListIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
