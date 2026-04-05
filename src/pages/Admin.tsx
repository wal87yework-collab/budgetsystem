import React from 'react';
import { ShieldAlert, Database, Upload, Download, RefreshCw, AlertCircle } from 'lucide-react';

export default function Admin() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6" /> Admin Tools
        </h1>
        <p className="text-sm text-gray-500">Database Management and System Utilities.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full Backup */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-blue-600 px-4 py-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-white" />
            <h3 className="text-white font-medium text-sm">Full Backup (DB & Photos)</h3>
          </div>
          <div className="p-4 space-y-4">
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center">
              <Download className="w-4 h-4 mr-2" /> Create New Full Backup
            </button>
            <hr className="border-gray-200" />
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                <ListIcon className="w-4 h-4" /> Existing Backups
              </h4>
              <p className="text-sm text-gray-500">No full backups (.zip) found.</p>
            </div>
          </div>
        </div>

        {/* Restore Backup */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-yellow-500 px-4 py-3 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-white" />
            <h3 className="text-white font-medium text-sm">Restore Full Backup (DB & Photos)</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm border border-red-200">
              <div className="flex items-start gap-2 font-medium mb-1">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> 
                <p>Warning: Restoring a full backup will overwrite the current database AND photos. Ensure you have a recent backup if needed. The current database and photos folder will be backed up automatically before restore.</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Option 1: Upload Backup File (.zip)</h4>
              <div className="flex items-center border border-gray-300 rounded-md overflow-hidden mb-2">
                <button className="bg-gray-100 px-3 py-2 text-sm border-r border-gray-300">Choose file</button>
                <span className="px-3 py-2 text-sm text-gray-500">No file chosen</span>
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center w-full justify-center">
                <Upload className="w-4 h-4 mr-2" /> Restore from Uploaded File
              </button>
            </div>

            <hr className="border-gray-200" />

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Option 2: Select Existing Backup</h4>
              <p className="text-xs text-gray-500 mb-1">Choose a backup to restore:</p>
              <select className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border mb-2 text-gray-500">
                <option>No backups available</option>
              </select>
              <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded text-sm font-medium flex items-center w-full justify-center">
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
