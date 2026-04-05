import React from 'react';
import { Package } from 'lucide-react';

export default function Inventory() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 font-display">
          <Package className="w-6 h-6 text-brand-600" /> Inventory Cost
        </h1>
        <p className="text-sm text-slate-500">Manage inventory and track costs.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="p-8 text-center text-slate-500">
          <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Inventory Management</h3>
          <p className="text-sm">This feature is currently under development and will be available soon.</p>
        </div>
      </div>
    </div>
  );
}
