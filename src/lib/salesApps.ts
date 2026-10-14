import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export type SalesAppStatus = 'active' | 'hidden' | 'disabled';

export interface SalesApp {
  id: string;
  name: string;
  key: string;
  status: SalesAppStatus;
  icon?: string;
  color?: string;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_SALES_APPS: Omit<SalesApp, 'id'>[] = [
  { key: 'stc', name: 'STC', status: 'active', icon: 'smartphone', color: 'purple', displayOrder: 1 },
  { key: 'wasal', name: 'Wasal', status: 'active', icon: 'route', color: 'blue', displayOrder: 2 },
  { key: 'toYou', name: 'ToYou', status: 'active', icon: 'shopping-bag', color: 'pink', displayOrder: 3 },
  { key: 'jahez', name: 'Jahez', status: 'active', icon: 'utensils', color: 'orange', displayOrder: 4 },
  { key: 'hungerStation', name: 'Hunger Station', status: 'active', icon: 'coffee', color: 'yellow', displayOrder: 5 },
  { key: 'keeta', name: 'Keeta', status: 'active', icon: 'zap', color: 'rose', displayOrder: 6 },
];

export function toAppKey(input: string): string {
  const cleaned = input.trim().replace(/[^a-zA-Z0-9\s_-]/g, '');
  if (!cleaned) return 'app_' + Date.now();
  
  const words = cleaned.split(/[\s_-]+/).filter(Boolean);
  if (words.length === 0) return 'app_' + Date.now();
  
  const camel = words.map((w, idx) => {
    const lower = w.toLowerCase();
    if (idx === 0) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join('');

  return camel;
}

// Ensures default apps exist in Firestore without overriding existing customizations
export async function ensureDefaultSalesApps(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, 'sales_apps'));
    const existingKeys = new Set(snapshot.docs.map(d => d.data().key || d.id));

    const promises = DEFAULT_SALES_APPS.map(async (defApp) => {
      if (!existingKeys.has(defApp.key)) {
        const docRef = doc(db, 'sales_apps', defApp.key);
        await setDoc(docRef, {
          ...defApp,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    });

    await Promise.all(promises);
  } catch (err) {
    console.warn('Could not auto-seed sales_apps:', err);
  }
}

// Safely get numeric amount for a specific app from a sale document
export function getSaleAppAmount(sale: any, appKey: string): number {
  if (!sale) return 0;
  if (sale[appKey] !== undefined && sale[appKey] !== null && sale[appKey] !== '') {
    const val = parseFloat(sale[appKey]);
    if (!isNaN(val)) return val;
  }
  if (sale.appValues && typeof sale.appValues === 'object') {
    const val = parseFloat(sale.appValues[appKey]);
    if (!isNaN(val)) return val;
  }
  return 0;
}

// Calculate total sales across all apps for a single sale document given a list of apps
export function calculateSaleTotalApps(sale: any, apps: SalesApp[]): number {
  if (!sale) return 0;
  if (!apps || apps.length === 0) {
    return parseFloat(sale.totalApps) || 0;
  }

  let total = 0;
  const countedKeys = new Set<string>();

  apps.forEach(app => {
    total += getSaleAppAmount(sale, app.key);
    countedKeys.add(app.key);
  });

  if (sale.appValues && typeof sale.appValues === 'object') {
    Object.keys(sale.appValues).forEach(k => {
      if (!countedKeys.has(k)) {
        const val = parseFloat(sale.appValues[k]);
        if (!isNaN(val)) total += val;
      }
    });
  }

  if (total === 0 && sale.totalApps) {
    const fallback = parseFloat(sale.totalApps);
    if (!isNaN(fallback) && fallback > 0) return fallback;
  }

  return total;
}

// Color theme helper for UI badges and cards
export function getAppColorClasses(colorName?: string): {
  badge: string;
  bgLight: string;
  text: string;
  border: string;
} {
  switch (colorName) {
    case 'purple':
      return { badge: 'bg-purple-100 text-purple-700 border-purple-200', bgLight: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' };
    case 'blue':
      return { badge: 'bg-blue-100 text-blue-700 border-blue-200', bgLight: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
    case 'pink':
      return { badge: 'bg-pink-100 text-pink-700 border-pink-200', bgLight: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' };
    case 'orange':
      return { badge: 'bg-orange-100 text-orange-700 border-orange-200', bgLight: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' };
    case 'yellow':
      return { badge: 'bg-amber-100 text-amber-700 border-amber-200', bgLight: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' };
    case 'rose':
    case 'red':
      return { badge: 'bg-rose-100 text-rose-700 border-rose-200', bgLight: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' };
    case 'emerald':
    case 'green':
      return { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', bgLight: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' };
    case 'indigo':
      return { badge: 'bg-indigo-100 text-indigo-700 border-indigo-200', bgLight: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' };
    case 'cyan':
      return { badge: 'bg-cyan-100 text-cyan-700 border-cyan-200', bgLight: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' };
    default:
      return { badge: 'bg-slate-100 text-slate-700 border-slate-200', bgLight: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
  }
}
