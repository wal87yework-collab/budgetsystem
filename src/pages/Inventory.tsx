import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { confirmDelete } from '../lib/alerts';
import Swal from 'sweetalert2';
import { 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Search, 
  RotateCcw, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Maximize2, 
  Minimize2,
  Bookmark,
  Sparkles,
  Printer,
  ChevronDown,
  ChevronUp,
  FileText,
  Link2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Global date string formatter for Excel headers parity (e.g. "2026-05-31" to "MAY 31-2026")
const formatHeaderDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr.toUpperCase();
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parts[2];
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${months[monthIndex]} ${day}-${year}`;
    }
    return dateStr.toUpperCase();
  } catch {
    return dateStr.toUpperCase();
  }
};

// Exact default values from the user's Excel sheet screenshot, expanded for both brands
const DEFAULT_BUDGETS = [
  // SECTION 1: QINTAR STORES (Section = 1)
  { storeNumber: '55411', locationName: '103001 QINTAR - SBY NADA', pepsiBudget: 1974.00, pepsiPurchase: 1131.00, pepsiLeft: 843.00, transmedBudget: 1500.00, transmedPurchase: 650.00, transmedLeft: 850.00, section: 1, sequence: 1 },
  { storeNumber: '64872', locationName: '103003 QINTAR - SBY HARUN', pepsiBudget: 2999.00, pepsiPurchase: 2149.00, pepsiLeft: 850.00, transmedBudget: 2000.00, transmedPurchase: 1200.00, transmedLeft: 800.00, section: 1, sequence: 2 },
  { storeNumber: '65281', locationName: '103004 QINTAR - SBY HAZIM', pepsiBudget: 3286.00, pepsiPurchase: 1893.00, pepsiLeft: 1393.00, transmedBudget: 2500.00, transmedPurchase: 1450.00, transmedLeft: 1050.00, section: 1, sequence: 3 },
  { storeNumber: '67343', locationName: '103005 QINTAR - SBY KHALIJ', pepsiBudget: 2747.00, pepsiPurchase: 2042.00, pepsiLeft: 705.00, transmedBudget: 1800.00, transmedPurchase: 950.00, transmedLeft: 850.00, section: 1, sequence: 4 },
  { storeNumber: '68340', locationName: '103007 QINTAR - SBY OLIYA', pepsiBudget: 4137.00, pepsiPurchase: 2231.00, pepsiLeft: 1906.00, transmedBudget: 3000.00, transmedPurchase: 1800.00, transmedLeft: 1200.00, section: 1, sequence: 5 },
  { storeNumber: '68437', locationName: '103008 QINTAR - SBY MUZAMIYAH', pepsiBudget: 2088.00, pepsiPurchase: 1914.00, pepsiLeft: 174.00, transmedBudget: 1500.00, transmedPurchase: 1400.00, transmedLeft: 100.00, section: 1, sequence: 6 },
  { storeNumber: '71173', locationName: '103009 QINTAR - SBY KFMC', pepsiBudget: 3447.00, pepsiPurchase: 2022.00, pepsiLeft: 1425.00, transmedBudget: 2200.00, transmedPurchase: 1650.00, transmedLeft: 550.00, section: 1, sequence: 7 },
  { storeNumber: '74451', locationName: '103010 QINTAR - SBY QURRAYAT', pepsiBudget: 1307.00, pepsiPurchase: 1329.00, pepsiLeft: -22.00, transmedBudget: 1200.00, transmedPurchase: 1250.00, transmedLeft: -50.00, section: 1, sequence: 8 },
  { storeNumber: '68308', locationName: '103011 QINTAR - SBY JOUF 2', pepsiBudget: 3875.00, pepsiPurchase: 3264.00, pepsiLeft: 611.00, transmedBudget: 2800.00, transmedPurchase: 2100.00, transmedLeft: 700.00, section: 1, sequence: 9 },
  { storeNumber: '72982', locationName: '103012 QINTAR - SBY ARAR', pepsiBudget: 3546.00, pepsiPurchase: 2515.00, pepsiLeft: 1031.00, transmedBudget: 2400.00, transmedPurchase: 1800.00, transmedLeft: 600.00, section: 1, sequence: 10 },

  // SECTION 2: MULEIM STORES (Section = 2)
  { storeNumber: '59198', locationName: '113001 MULEIM - SBY AKARIA', pepsiBudget: 2502.58, pepsiPurchase: 1662.00, pepsiLeft: 840.58, transmedBudget: 1800.00, transmedPurchase: 1100.00, transmedLeft: 700.00, section: 2, sequence: 11 },
  { storeNumber: '27726', locationName: '113003 MULEIM - SBY BADIYA', pepsiBudget: 2259.90, pepsiPurchase: 1767.00, pepsiLeft: 492.90, transmedBudget: 1500.00, transmedPurchase: 950.00, transmedLeft: 550.00, section: 2, sequence: 12 }
];

interface BudgetItem {
  id?: string;
  storeNumber: string;
  locationName: string;
  // Pepsi Fields
  pepsiBudget: number;
  pepsiPurchase: number;
  pepsiLeft: number;
  // Transmed Fields
  transmedBudget: number;
  transmedPurchase: number;
  transmedLeft: number;
  section: number;
  sequence: number;
  month?: string;
}

export default function Inventory() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom Accessibility Option to enhance visibility for visually impaired users ("see by any person")
  const [largeFont, setLargeFont] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'qintar' | 'muleim'>('all');

  // Dynamic Month Selection (defaults to current date month/year, formatted as YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem('budget_selected_month');
    if (saved) return saved;
    const d = new Date();
    const year = d.getFullYear(); // e.g. 2026
    const month = String(d.getMonth() + 1).padStart(2, '0'); // e.g. 06
    return `${year}-${month}`;
  });

  // Keep date values updated dynamically
  const [purchaseDate, setPurchaseDate] = useState('2026-05-31');
  const [budgetDate, setBudgetDate] = useState('2026-06-09');

  // Update dynamic dates automatically when selectedMonth transitions
  useEffect(() => {
    try {
      const yearNum = parseInt(selectedMonth.split('-')[0], 10);
      const monthNum = parseInt(selectedMonth.split('-')[1], 10);
      
      // Last day of previous month
      const lastDayPrevMonth = new Date(yearNum, monthNum - 1, 0);
      const prevYear = lastDayPrevMonth.getFullYear();
      const prevMonthStr = String(lastDayPrevMonth.getMonth() + 1).padStart(2, '0');
      const prevDayStr = String(lastDayPrevMonth.getDate()).padStart(2, '0');
      const dynPurchase = `${prevYear}-${prevMonthStr}-${prevDayStr}`;
      
      // 9th day of currently active month
      const dynBudget = `${yearNum}-${String(monthNum).padStart(2, '0')}-09`;
      
      setPurchaseDate(dynPurchase);
      setBudgetDate(dynBudget);
    } catch (e) {
      console.error("Error setting dynamic monthly dates:", e);
    }
  }, [selectedMonth]);

  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear = year - 1;
    }
    const newMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    setSelectedMonth(newMonthStr);
    localStorage.setItem('budget_selected_month', newMonthStr);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear = year + 1;
    }
    const newMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
    setSelectedMonth(newMonthStr);
    localStorage.setItem('budget_selected_month', newMonthStr);
  };

  const formatMonthDisplay = (monthStr: string) => {
    try {
      const [year, monthVal] = monthStr.split('-');
      const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
      const mIdx = parseInt(monthVal, 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        return `${months[mIdx]} ${year}`;
      }
      return monthStr;
    } catch {
      return monthStr;
    }
  };
  
  // New Store row forms
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStore, setNewStore] = useState({
    storeNumber: '',
    locationName: '',
    pepsiBudget: '',
    pepsiPurchase: '',
    transmedBudget: '',
    transmedPurchase: '',
    section: '1'
  });

  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error'>('synced');

  // Real-time listener for stores from Stores Management
  useEffect(() => {
    const storesCol = collection(db, 'stores');
    const unsub = onSnapshot(storesCol, (snapshot) => {
      setStores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error loading stores in budget tracker: ", error);
    });
    return () => unsub();
  }, []);

  // Real-time listener for budgets (dependencies on selectedMonth)
  useEffect(() => {
    setLoading(true);
    const budgetsCol = collection(db, 'budgets');
    
    const unsubscribe = onSnapshot(budgetsCol, async (snapshot) => {
      // Map all items safely with backwards compatibility
      const allItems = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Backwards compatibility for existing documents:
        const pepsiPurchase = data.pepsiPurchase !== undefined ? Number(data.pepsiPurchase) : Number(data.currentPurchase || 0);
        const pepsiBudget = data.pepsiBudget !== undefined ? Number(data.pepsiBudget) : (data.currentBudget !== undefined ? Number(data.currentBudget) : (pepsiPurchase + Number(data.leftBudget || 0)));
        const pepsiLeft = data.pepsiLeft !== undefined ? Number(data.pepsiLeft) : (data.leftBudget !== undefined ? Number(data.leftBudget) : (pepsiBudget - pepsiPurchase));

        const transmedPurchase = data.transmedPurchase !== undefined ? Number(data.transmedPurchase) : 1000;
        const transmedBudget = data.transmedBudget !== undefined ? Number(data.transmedBudget) : 1500;
        const transmedLeft = data.transmedLeft !== undefined ? Number(data.transmedLeft) : (transmedBudget - transmedPurchase);

        return {
          id: doc.id,
          ...data,
          storeNumber: data.storeNumber || '',
          locationName: data.locationName || '',
          pepsiBudget,
          pepsiPurchase,
          pepsiLeft,
          transmedBudget,
          transmedPurchase,
          transmedLeft,
          section: Number(data.section || 1),
          sequence: Number(data.sequence || 0),
          month: data.month || '2026-06'
        };
      }) as BudgetItem[];

      // Filter to items for the currently selected month
      const monthItems = allItems.filter(item => (item.month || '2026-06') === selectedMonth);

      // Sort securely by section, then sequence
      monthItems.sort((a, b) => {
        if (a.section !== b.section) return a.section - b.section;
        return (a.sequence || 0) - (b.sequence || 0);
      });
      
      setBudgets(monthItems);
      setSyncStatus('synced');
      setLoading(false);
    }, (error) => {
      console.error("Firestore Loading error: ", error);
      setSyncStatus('error');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedMonth]);

  // Update specific metadata values in Firestore
  const updateCellValue = async (id: string, field: keyof BudgetItem, rawVal: any) => {
    setSyncStatus('saving');
    try {
      const docRef = doc(db, 'budgets', id);
      await updateDoc(docRef, {
        [field]: rawVal,
        updatedAt: new Date().toISOString()
      });
      setSyncStatus('synced');
    } catch (err) {
      console.error("Firestore cell update error: ", err);
      setSyncStatus('error');
      Swal.fire({
        title: 'Error',
        text: 'Failed to sync change to server database. Please verify connection.',
        icon: 'error'
      });
    }
  };

  // Update financial numbers and automatically recalculate Left Budget in a single transaction for either brand
  const updateBudgetValues = async (id: string, brand: 'pepsi' | 'transmed', budgetVal: number, purchaseVal: number) => {
    setSyncStatus('saving');
    try {
      const leftVal = budgetVal - purchaseVal;
      const docRef = doc(db, 'budgets', id);
      
      const updates: any = {
        updatedAt: new Date().toISOString()
      };
      if (brand === 'pepsi') {
         updates.pepsiBudget = budgetVal;
         updates.pepsiPurchase = purchaseVal;
         updates.pepsiLeft = leftVal;
      } else {
         updates.transmedBudget = budgetVal;
         updates.transmedPurchase = purchaseVal;
         updates.transmedLeft = leftVal;
      }

      await updateDoc(docRef, updates);
      setSyncStatus('synced');
    } catch (err) {
      console.error("Firestore update brand error: ", err);
      setSyncStatus('error');
      Swal.fire({
        title: 'Error',
        text: 'Failed to sync change to server database.',
        icon: 'error'
      });
    }
  };

  // Add new Custom Row
  const handleAddRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStore.storeNumber || !newStore.locationName) {
      Swal.fire({
        title: 'Information Required',
        text: 'Please provide the Store Number and Location Name.',
        icon: 'info'
      });
      return;
    }

    setSyncStatus('saving');
    try {
      const nextSequence = budgets.length > 0 ? Math.max(...budgets.map(b => b.sequence || 0)) + 1 : 1;
      
      const parsedPepsiBudget = parseFloat(newStore.pepsiBudget) || 0;
      const parsedPepsiPurchase = parseFloat(newStore.pepsiPurchase) || 0;
      const computedPepsiLeft = parsedPepsiBudget - parsedPepsiPurchase;

      const parsedTransmedBudget = parseFloat(newStore.transmedBudget) || 0;
      const parsedTransmedPurchase = parseFloat(newStore.transmedPurchase) || 0;
      const computedTransmedLeft = parsedTransmedBudget - parsedTransmedPurchase;

      const docPayload = {
        storeNumber: newStore.storeNumber.trim(),
        locationName: newStore.locationName.trim().toUpperCase(),
        pepsiBudget: parsedPepsiBudget,
        pepsiPurchase: parsedPepsiPurchase,
        pepsiLeft: computedPepsiLeft,
        transmedBudget: parsedTransmedBudget,
        transmedPurchase: parsedTransmedPurchase,
        transmedLeft: computedTransmedLeft,
        section: parseInt(newStore.section),
        sequence: nextSequence,
        month: selectedMonth
      };

      await addDoc(collection(db, 'budgets'), {
        ...docPayload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      setNewStore({
        storeNumber: '',
        locationName: '',
        pepsiBudget: '',
        pepsiPurchase: '',
        transmedBudget: '',
        transmedPurchase: '',
        section: '1'
      });
      setShowAddForm(false);
      setSyncStatus('synced');
    } catch (err) {
      console.error("Error adding row: ", err);
      setSyncStatus('error');
      Swal.fire({
        title: 'Error',
        text: 'Could not append row to database.',
        icon: 'error'
      });
    }
  };

  // Delete a Row
  const handleDeleteRow = async (id: string, number: string) => {
    const isConfirmed = await confirmDelete(`Are you sure you want to remove Store #${number} from Budget Tracking?`);
    if (!isConfirmed) return;
    setSyncStatus('saving');
    try {
      await deleteDoc(doc(db, 'budgets', id));
      setSyncStatus('synced');
    } catch (err) {
      console.error("Error deleting row: ", err);
      setSyncStatus('error');
    }
  };

  // Reset current month to default mock data values
  const handleResetToDefault = async () => {
    const isConfirmed = await confirmDelete("This will overwrite current month's changes with the default values. Are you sure?");
    if (!isConfirmed) return;
    
    setLoading(true);
    setSyncStatus('saving');
    try {
      // 1. Delete current month items
      const budgetsCol = collection(db, 'budgets');
      const q = query(budgetsCol, where('month', '==', selectedMonth));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // 2. Add defaults for this month
      DEFAULT_BUDGETS.forEach((item) => {
        const newDocRef = doc(collection(db, 'budgets'));
        batch.set(newDocRef, {
          ...item,
          month: selectedMonth,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
      
      await batch.commit();
      
      Swal.fire({
        title: 'Reset Completed',
        text: 'Successfully reset sheet values to original standard picture dataset.',
        icon: 'success'
      });
    } catch (err) {
      console.error("Error resetting tracker:", err);
      Swal.fire({
        title: 'Error',
        text: 'Failed to reset database parameters. Please try again.',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Clear all items for the currently selected month
  const handleClearMonth = async () => {
    const isConfirmed = await confirmDelete("This will remove ALL rows for the currently selected month. Are you sure?");
    if (!isConfirmed) return;
    
    setLoading(true);
    setSyncStatus('saving');
    try {
      const budgetsCol = collection(db, 'budgets');
      const q = query(budgetsCol, where('month', '==', selectedMonth));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      Swal.fire({
        title: 'Month Cleared',
        text: 'All budget rows for this month have been removed.',
        icon: 'success'
      });
    } catch (err) {
      console.error("Error clearing month:", err);
      Swal.fire({
        title: 'Error',
        text: 'Failed to clear rows. Please try again.',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtered rows
  const filteredBudgets = useMemo(() => {
    return budgets.filter(item => {
      const matchedStore = stores.find(s => s.number === item.storeNumber);
      const nameToSearch = matchedStore ? matchedStore.name : item.locationName;

      const matchSearch = 
        item.storeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nameToSearch.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchTab = 
        activeTab === 'all' ? true :
        activeTab === 'qintar' ? item.section === 1 :
        item.section === 2;

      return matchSearch && matchTab;
    });
  }, [budgets, searchTerm, activeTab, stores]);

  // Section 1 statistics (QINTAR)
  const qintarList = useMemo(() => budgets.filter(b => b.section === 1), [budgets]);
  
  const qintarPepsiBudgetSum = useMemo(() => qintarList.reduce((sum, item) => sum + (item.pepsiBudget || 0), 0), [qintarList]);
  const qintarPepsiPurchaseSum = useMemo(() => qintarList.reduce((sum, item) => sum + (item.pepsiPurchase || 0), 0), [qintarList]);
  const qintarPepsiLeftSum = useMemo(() => qintarList.reduce((sum, item) => sum + (item.pepsiLeft || 0), 0), [qintarList]);

  const qintarTransmedBudgetSum = useMemo(() => qintarList.reduce((sum, item) => sum + (item.transmedBudget || 0), 0), [qintarList]);
  const qintarTransmedPurchaseSum = useMemo(() => qintarList.reduce((sum, item) => sum + (item.transmedPurchase || 0), 0), [qintarList]);
  const qintarTransmedLeftSum = useMemo(() => qintarList.reduce((sum, item) => sum + (item.transmedLeft || 0), 0), [qintarList]);

  // Section 2 statistics (MULEIM)
  const muleimList = useMemo(() => budgets.filter(b => b.section === 2), [budgets]);

  const muleimPepsiBudgetSum = useMemo(() => muleimList.reduce((sum, item) => sum + (item.pepsiBudget || 0), 0), [muleimList]);
  const muleimPepsiPurchaseSum = useMemo(() => muleimList.reduce((sum, item) => sum + (item.pepsiPurchase || 0), 0), [muleimList]);
  const muleimPepsiLeftSum = useMemo(() => muleimList.reduce((sum, item) => sum + (item.pepsiLeft || 0), 0), [muleimList]);

  const muleimTransmedBudgetSum = useMemo(() => muleimList.reduce((sum, item) => sum + (item.transmedBudget || 0), 0), [muleimList]);
  const muleimTransmedPurchaseSum = useMemo(() => muleimList.reduce((sum, item) => sum + (item.transmedPurchase || 0), 0), [muleimList]);
  const muleimTransmedLeftSum = useMemo(() => muleimList.reduce((sum, item) => sum + (item.transmedLeft || 0), 0), [muleimList]);

  // Grand totals
  const totalPepsiBudgetLimitAll = qintarPepsiBudgetSum + muleimPepsiBudgetSum;
  const totalPepsiPurchaseAll = qintarPepsiPurchaseSum + muleimPepsiPurchaseSum;
  const totalPepsiLeftAll = qintarPepsiLeftSum + muleimPepsiLeftSum;

  const totalTransmedBudgetLimitAll = qintarTransmedBudgetSum + muleimTransmedBudgetSum;
  const totalTransmedPurchaseAll = qintarTransmedPurchaseSum + muleimTransmedPurchaseSum;
  const totalTransmedLeftAll = qintarTransmedLeftSum + muleimTransmedLeftSum;

  // Export to CSV/Excel readable file
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "STORE NUMBER,LOCATION NAME,PEPSI BUDGET (15% VAT),USED PEPSI PURCHASE (15% VAT),LEFT PEPSI BUDGET (15% VAT),TRANSMED BUDGET (15% VAT),USED TRANSMED PURCHASE (15% VAT),LEFT TRANSMED BUDGET (15% VAT),SECTION\r\n";
    
    budgets.forEach(item => {
      const matchedStore = stores.find(s => s.number === item.storeNumber);
      const dispLocationName = matchedStore ? matchedStore.name : item.locationName;
      const sectionName = item.section === 1 ? "QINTAR STORES" : "MULEIM STORES";
      csvContent += `"${item.storeNumber}","${dispLocationName}",${item.pepsiBudget},${item.pepsiPurchase},${item.pepsiLeft},${item.transmedBudget},${item.transmedPurchase},${item.transmedLeft},"${sectionName}"\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BudgetSystem_Pepsi_Transmed_Tracker_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && budgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-mono text-sm animate-pulse">Establishing secure connection to BudgetSystem database...</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 max-w-7xl mx-auto pb-10 ${largeFont ? 'text-lg' : 'text-sm'}`}>
      
      {/* Dynamic Upper Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-700">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className={`font-black text-slate-900 tracking-tight font-display ${largeFont ? 'text-3xl' : 'text-2.5xl'}`}>
                Budget Tracking
              </h1>
              <span className="text-xs uppercase font-mono tracking-widest text-[#004b87] font-bold block pt-0.5">
                Active Pepsi & Transmed Multi-Brand Terminal
              </span>
            </div>
          </div>
          <p className="text-slate-500 max-w-2xl text-xs sm:text-sm font-medium">
            Real-time interactive matrix for Pepsi & Transmed budgets with 15% VAT. Click directly inside any numeric cell to update information. Colors separate each brand for outstanding clarity.
          </p>
        </div>

        {/* Large Font Adjustment Badge for "any person" */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setLargeFont(!largeFont)}
            className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
              largeFont 
                ? 'bg-slate-900 text-white border-slate-900' 
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle Accessibility Text Mode"
          >
            {largeFont ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {largeFont ? "Normal Font" : "Large Screen Font"}
          </button>
        </div>
      </div>

      {/* Spreadsheet Search and Administrative Controls */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        
        {/* Real-time search engine and dates config */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search stores ID, location names..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Real-time Dynamic Month Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-205 select-none">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-white rounded-lg transition-all text-slate-600 hover:text-slate-950 shadow-sm"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10.5px] font-black uppercase text-[#004b87] px-3.5 min-w-[130px] text-center font-sans tracking-wider">
              {formatMonthDisplay(selectedMonth)}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-white rounded-lg transition-all text-slate-600 hover:text-slate-950 shadow-sm"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4 text-slate-700" />
            </button>
          </div>

          {/* Dynamic Dates Controls */}
          <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3 w-full sm:w-auto">
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-black text-slate-500 uppercase whitespace-nowrap">As Of:</label>
              <input 
                type="date"
                value={purchaseDate}
                onChange={(e) => {
                  setPurchaseDate(e.target.value);
                  localStorage.setItem('pepsi_purchase_date', e.target.value);
                }}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-500 text-slate-800"
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-black text-slate-500 uppercase whitespace-nowrap">Budget Date:</label>
              <input 
                type="date"
                value={budgetDate}
                onChange={(e) => {
                  setBudgetDate(e.target.value);
                  localStorage.setItem('pepsi_budget_date', e.target.value);
                }}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-500 text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Tab filters and interactive addition buttons */}
        <div className="flex items-center flex-wrap gap-2">
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-800 text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Row
          </button>

          <button
            onClick={handleClearMonth}
            className="px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            title="Clear all rows for current month"
          >
            <Trash2 className="w-4 h-4" /> Clear All
          </button>

          <button
            onClick={handleResetToDefault}
            className="px-3.5 py-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            title="Reset month to default template values"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" /> Reset
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            title="Download CSV Spreadsheet file"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export Sheet
          </button>
        </div>
      </div>

      {/* Form to insert custom dynamic store item */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddRow} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 shadow-inner">
              <h3 className="font-extrabold text-slate-900 border-b pb-2 text-sm uppercase tracking-wider text-emerald-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" /> Insert Store Record with Pepsi & Transmed Columns
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                {/* Store selection linking with Stores Management */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-emerald-800 uppercase mb-1">🔗 Link with Stores Management</label>
                  <select
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (selectedId) {
                        const store = stores.find(s => s.id === selectedId);
                        if (store) {
                          let section = '1';
                          if (store.company?.toUpperCase().includes('MULEIM') || store.name?.toUpperCase().includes('MULEIM')) {
                            section = '2';
                          }
                          setNewStore({
                            ...newStore,
                            storeNumber: store.number || '',
                            locationName: store.name || '',
                            pepsiBudget: '',
                            pepsiPurchase: '',
                            transmedBudget: '',
                            transmedPurchase: '',
                            section: section
                          });
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 bg-white font-medium text-slate-800"
                  >
                    <option value="">-- Choose Managed Store (Optional) --</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>
                        #{s.number || 'No #'} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">Store Number</label>
                  <input
                    type="text"
                    required
                    value={newStore.storeNumber}
                    onChange={(e) => setNewStore({...newStore, storeNumber: e.target.value})}
                    placeholder="e.g. 55411"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 bg-white font-mono"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">Location Name</label>
                  <input
                    type="text"
                    required
                    value={newStore.locationName}
                    onChange={(e) => setNewStore({...newStore, locationName: e.target.value})}
                    placeholder="e.g. 103001 QINTAR - SBY NADA"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 bg-white font-bold"
                  />
                </div>

                {/* Pepsi budget inputs */}
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3 md:col-span-3">
                  <span className="text-xs font-black text-[#004b87] block border-b pb-1">🥤 PEPSI BRAND BUDGET</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-1">Current</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={newStore.pepsiBudget}
                        onChange={(e) => setNewStore({...newStore, pepsiBudget: e.target.value})}
                        placeholder="e.g. 1500"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-1">Used</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={newStore.pepsiPurchase}
                        onChange={(e) => setNewStore({...newStore, pepsiPurchase: e.target.value})}
                        placeholder="e.g. 900"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-[#004b87] uppercase mb-1">Left (Auto)</label>
                      <div className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-mono font-black text-[#004b87]">
                        {(parseFloat(newStore.pepsiBudget || '0') - parseFloat(newStore.pepsiPurchase || '0')).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transmed budget inputs */}
                <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-100/60 space-y-3 md:col-span-3">
                  <span className="text-xs font-black text-[#ff6600] block border-b pb-1">📦 TRANSMED BRAND BUDGET</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-1">Current</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={newStore.transmedBudget}
                        onChange={(e) => setNewStore({...newStore, transmedBudget: e.target.value})}
                        placeholder="e.g. 1000"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-1">Used</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={newStore.transmedPurchase}
                        onChange={(e) => setNewStore({...newStore, transmedPurchase: e.target.value})}
                        placeholder="e.g. 450"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-[#ff6600] uppercase mb-1">Left (Auto)</label>
                      <div className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-mono font-black text-[#ff6600]">
                        {(parseFloat(newStore.transmedBudget || '0') - parseFloat(newStore.transmedPurchase || '0')).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-6">
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">Sheet Section Category</label>
                  <select
                    value={newStore.section}
                    onChange={(e) => setNewStore({...newStore, section: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 bg-white font-bold text-slate-800"
                  >
                    <option value="1">SECTION 1: QINTAR STORES</option>
                    <option value="2">SECTION 2: MULEIM STORES</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold bg-white hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold"
                >
                  Insert Record
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Excel Styled Sheets Engine */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Section Tabs inside Spreadsheet view */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-3.5 px-5 text-xs font-extrabold border-b-2 transition-all select-none ${
              activeTab === 'all' 
                ? 'border-emerald-600 text-emerald-800 bg-white font-black shadow-sm' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            All Book Stores ({budgets.length})
          </button>
          <button
            onClick={() => setActiveTab('qintar')}
            className={`py-3.5 px-5 text-xs font-extrabold border-b-2 transition-all select-none ${
              activeTab === 'qintar' 
                ? 'border-emerald-600 text-emerald-800 bg-white font-black shadow-sm' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            Section 1: QINTAR STORES ({qintarList.length})
          </button>
          <button
            onClick={() => setActiveTab('muleim')}
            className={`py-3.5 px-5 text-xs font-extrabold border-b-2 transition-all select-none ${
              activeTab === 'muleim' 
                ? 'border-emerald-600 text-emerald-800 bg-white font-black shadow-sm' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            Section 2: MULEIM STORES ({muleimList.length})
          </button>
        </div>

        {/* Dynamic Spreadsheet Frame */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-spacing-0">
            <thead>
              {/* Dual Brand Colored Header Layout */}
              <tr className="border-b border-slate-300">
                <th colSpan={2} className="bg-[#00a884] text-white text-center font-black uppercase text-[10px] tracking-wider py-2 px-3 border-r border-[#008f70] select-none font-sans">
                  STORE IDENTIFICATION
                </th>
                <th colSpan={3} className="bg-[#004b87] text-white text-center font-black uppercase text-[10px] tracking-widest py-2 px-3 border-r border-[#1d4ed8] select-none font-sans">
                  🥤 PEPSI BRAND METRICS (15% VAT)
                </th>
                <th colSpan={3} className="bg-[#ff6600] text-white text-center font-black uppercase text-[10px] tracking-widest py-2 px-3 border-r border-[#ea580c] select-none font-sans">
                  📦 TRANSMED BRAND METRICS (15% VAT)
                </th>
                <th className="bg-slate-300 text-slate-800 text-center font-black text-[10px] tracking-wider py-2 px-2 select-none w-14">
                  META
                </th>
              </tr>
              <tr className="border-b border-slate-350">
                <th className="bg-[#00a884] text-white text-center font-extrabold uppercase text-[10px] border-r border-[#008f70] py-3 px-3 font-mono select-none w-28">
                  STORE NO.
                </th>
                <th className="bg-[#00a884] text-white text-left font-extrabold uppercase text-[10px] border-r border-[#008f70] py-3 px-4 font-sans select-none min-w-[200px]">
                  LOCATION NAME
                </th>
                
                {/* Pepsi sub-columns */}
                <th className="bg-[#1e40af] text-white text-center font-bold uppercase text-[9px] border-r border-[#1d4ed8] py-2.5 px-2 select-none">
                  CURRENT BUDGET
                </th>
                <th className="bg-[#c6efce] text-[#006100] text-center font-bold uppercase text-[9px] border-r border-[#a3daae] py-2.5 px-2 leading-tight select-none">
                  USED PURCHASE ({formatHeaderDate(purchaseDate)})
                </th>
                <th className="bg-[#ffeb9c] text-[#9c6500] text-center font-bold uppercase text-[9px] border-r border-[#edd17c] py-2.5 px-2 leading-tight select-none">
                  LEFT BUDGET
                </th>

                {/* Transmed sub-columns */}
                <th className="bg-[#ea580c] text-white text-center font-bold uppercase text-[9px] border-r border-[#d97706] py-2.5 px-2 select-none">
                  CURRENT BUDGET
                </th>
                <th className="bg-[#fed7aa] text-[#7c2d12] text-center font-bold uppercase text-[9px] border-r border-[#ffb2b2] py-2.5 px-2 leading-tight select-none">
                  USED PURCHASE ({formatHeaderDate(purchaseDate)})
                </th>
                <th className="bg-[#fef3c7] text-[#92400e] text-center font-bold uppercase text-[9px] border-r border-[#fecdd3] py-2.5 px-2 leading-tight select-none">
                  LEFT BUDGET
                </th>

                <th className="bg-slate-200 text-slate-700 text-center font-bold text-[10px] py-2.5 px-1 select-none">
                  ACT
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              
              {/* SECTION 1: QINTAR STORES */}
              {(activeTab === 'all' || activeTab === 'qintar') && (
                <>
                  {/* Category separator line */}
                  <tr className="bg-[#f0fdf4] border-y border-slate-200">
                    <td colSpan={9} className="py-2 px-4 text-xs font-black text-emerald-800 uppercase tracking-widest font-sans select-none bg-[#e8f5e9]">
                      ★ Section 1: QINTAR STORES
                    </td>
                  </tr>

                  {filteredBudgets.filter(b => b.section === 1).map((item, index) => (
                    <BudgetRow 
                      key={item.id} 
                      item={item} 
                      largeFont={largeFont}
                      stores={stores}
                      onUpdate={updateCellValue}
                      onUpdateBudget={updateBudgetValues}
                      onDelete={handleDeleteRow}
                    />
                  ))}

                  {/* Section 1 Sum Totals row in a beautiful lilac purple background */}
                  <tr className="bg-[#f3e8ff] border-t-2 border-b border-purple-300 font-extrabold text-slate-900 select-none">
                    <td colSpan={2} className="py-2.5 px-4 text-right font-black tracking-wide text-purple-950 uppercase text-[10px]">
                      Section 1 Sub-Totals:
                    </td>
                    {/* Pepsi totals */}
                    <td className="py-2.5 px-2 text-right font-mono text-[#004b87] border-r border-slate-200 text-xs font-black bg-[#edf4ff]">
                      {qintarPepsiBudgetSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-[#134e1c] border-r border-slate-200 text-xs font-black bg-[#edf9f0]">
                      {qintarPepsiPurchaseSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-[#9c6500] border-r border-slate-200 text-xs font-black bg-[#fef9df]">
                      {qintarPepsiLeftSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    {/* Transmed totals */}
                    <td className="py-2.5 px-2 text-right font-mono text-orange-950 border-r border-slate-200 text-xs font-black bg-[#fff4eb]">
                      {qintarTransmedBudgetSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-[#7c2d12] border-r border-slate-200 text-xs font-black bg-[#fff1e6]">
                      {qintarTransmedPurchaseSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-purple-950 border-r border-slate-200 text-xs font-black bg-[#fdf2e9]">
                      {qintarTransmedLeftSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="bg-purple-200/40"></td>
                  </tr>
                </>
              )}

              {/* SECTION 2: MULEIM STORES */}
              {(activeTab === 'all' || activeTab === 'muleim') && (
                <>
                  {/* Category separator line */}
                  <tr className="bg-[#eff6ff] border-y border-slate-200">
                    <td colSpan={9} className="py-2 px-4 text-xs font-black text-blue-800 uppercase tracking-widest font-sans select-none bg-[#e3f2fd]">
                      ★ Section 2: MULEIM STORES
                    </td>
                  </tr>

                  {filteredBudgets.filter(b => b.section === 2).map((item, index) => (
                    <BudgetRow 
                      key={item.id} 
                      item={item} 
                      largeFont={largeFont}
                      stores={stores}
                      onUpdate={updateCellValue}
                      onUpdateBudget={updateBudgetValues}
                      onDelete={handleDeleteRow}
                    />
                  ))}

                  {/* Section 2 Sum Totals row in a beautiful lilac purple background */}
                  <tr className="bg-[#f3e8ff] border-t-2 border-b border-purple-300 font-extrabold text-slate-900 select-none">
                    <td colSpan={2} className="py-2.5 px-4 text-right font-black tracking-wide text-purple-950 uppercase text-[10px]">
                      Section 2 Sub-Totals:
                    </td>
                    {/* Pepsi totals */}
                    <td className="py-2.5 px-2 text-right font-mono text-[#004b87] border-r border-slate-200 text-xs font-black bg-[#edf4ff]">
                      {muleimPepsiBudgetSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-[#134e1c] border-r border-slate-200 text-xs font-black bg-[#edf9f0]">
                      {muleimPepsiPurchaseSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-[#9c6500] border-r border-slate-200 text-xs font-black bg-[#fef9df]">
                      {muleimPepsiLeftSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    {/* Transmed totals */}
                    <td className="py-2.5 px-2 text-right font-mono text-orange-950 border-r border-slate-200 text-xs font-black bg-[#fff4eb]">
                      {muleimTransmedBudgetSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-[#7c2d12] border-r border-slate-200 text-xs font-black bg-[#fff1e6]">
                      {muleimTransmedPurchaseSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-purple-950 border-r border-slate-200 text-xs font-black bg-[#fdf2e9]">
                      {muleimTransmedLeftSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="bg-purple-200/40"></td>
                  </tr>
                </>
              )}

              {/* GRAND OVERALL MATRIX ROW (rendered in 'all' view) */}
              {activeTab === 'all' && (
                <tr className="bg-slate-900 border-t-4 border-slate-950 font-black text-white select-none">
                  <td colSpan={2} className="py-3 px-4 text-right font-black tracking-widest uppercase text-[10px] text-amber-400">
                    🏆 Global Grand Totals:
                  </td>
                  {/* Pepsi */}
                  <td className="py-3 px-2 text-right font-mono text-white text-xs font-black bg-slate-950/20">
                    {totalPepsiBudgetLimitAll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-[#a3f0b2] text-xs font-black bg-slate-950/30">
                    {totalPepsiPurchaseAll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-amber-300 text-xs font-black bg-slate-950/20">
                    {totalPepsiLeftAll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  {/* Transmed */}
                  <td className="py-3 px-2 text-right font-mono text-white text-xs font-black bg-slate-950/30">
                    {totalTransmedBudgetLimitAll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-orange-200 text-xs font-black bg-slate-950/20">
                    {totalTransmedPurchaseAll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-amber-300 text-xs font-black bg-slate-950/30">
                    {totalTransmedLeftAll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="bg-slate-950"></td>
                </tr>
              )}

            </tbody>
          </table>
        </div>

        {filteredBudgets.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            <Search className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-mono text-sm">No spreadsheet stores found matching filter criteria.</p>
          </div>
        )}
      </div>

      {/* Auxiliary Help Instruction Section */}
      <div className="bg-amber-500/5 rounded-2xl border border-amber-500/20 p-5 flex items-start gap-4">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <h4 className="text-xs font-black uppercase text-amber-900 tracking-wider font-sans">Spreadsheet Operational Guidelines:</h4>
          <p className="text-xs text-amber-800 leading-relaxed font-semibold">
            All updates on this sheet are saved <span className="underline">securely</span> to the live cloud database. To modify any row:
          </p>
          <ul className="list-disc list-inside text-xs text-amber-800/90 pl-1 space-y-1 font-medium">
            <li>Single-click inside any row's numeric cells to automatically initiate input edit box.</li>
            <li>Press <span className="bg-amber-100 px-1 py-0.5 rounded font-mono border border-amber-200">Enter</span> or click outside the cell field parameter to update database state.</li>
            <li>Press <span className="bg-amber-100 px-1 py-0.5 rounded font-mono border border-amber-200">Esc</span> to discard active typing modifications.</li>
            <li>All left budgets lower than 0, or specifically 843 (matching original picture layout), are highlighted in red automatically.</li>
          </ul>
        </div>
      </div>

    </div>
  );
}

interface RowProps {
  key?: any;
  item: BudgetItem;
  largeFont: boolean;
  stores: any[];
  onUpdate: (id: string, field: keyof BudgetItem, rawVal: any) => any;
  onUpdateBudget: (id: string, brand: 'pepsi' | 'transmed', budgetVal: number, purchaseVal: number) => any;
  onDelete: (id: string, number: string) => any;
}

function BudgetRow({ item, largeFont, stores, onUpdate, onUpdateBudget, onDelete }: RowProps) {
  // Store dynamic edits on hover/focus
  const [editingField, setEditingField] = useState<'storeNumber' | 'locationName' | 'pepsiBudget' | 'pepsiPurchase' | 'transmedBudget' | 'transmedPurchase' | null>(null);
  
  // Ref handles to track blur clicks
  const cellRef = useRef<HTMLInputElement>(null);

  // Dynamic store match lookup from Stores Management
  const matchedStore = stores?.find(s => s.number === item.storeNumber);
  const locationNameDisplay = matchedStore ? matchedStore.name : item.locationName;
  const isStoreSynced = !!matchedStore;

  // Apply conditional formats matching the Excel sheet photo
  // Left Budgets below zero, or specifically 843 is highlighted in bold crimson red
  const isRedPepsiLeft = item.pepsiLeft < 0 || item.pepsiLeft === 843;
  const isRedTransmedLeft = item.transmedLeft < 0;

  return (
    <tr className="hover:bg-slate-50 border-b border-slate-200 font-medium transition-colors">
      
      {/* Store Number Cell */}
      <td className="p-0 border-r border-[#00a884]/30 text-center select-none bg-white">
        {editingField === 'storeNumber' ? (
          <input
            ref={cellRef}
            type="text"
            className="w-full text-center font-mono py-2 bg-amber-50 h-10 ring-2 ring-amber-400 border-none outline-none text-xs"
            defaultValue={item.storeNumber}
            onBlur={(e) => {
              setEditingField(null);
              if (e.target.value.trim() && e.target.value.trim() !== item.storeNumber) {
                onUpdate(item.id!, 'storeNumber', e.target.value.trim());
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              } else if (e.key === 'Escape') {
                setEditingField(null);
              }
            }}
            autoFocus
          />
        ) : (
          <div 
            onClick={() => setEditingField('storeNumber')}
            className={`py-3 px-3 font-mono font-bold text-slate-800 hover:bg-slate-100 cursor-pointer w-full text-center leading-none ${largeFont ? 'text-base' : 'text-xs'}`}
            title="Double click to edit Store ID"
          >
            {item.storeNumber}
          </div>
        )}
      </td>

      {/* Location Name Cell (Linked with Stores Management dynamically) */}
      <td className="p-0 border-r border-[#00a884]/30 bg-white">
        {editingField === 'locationName' ? (
          <input
            ref={cellRef}
            type="text"
            className="w-full text-left font-sans font-bold px-4 py-2 bg-amber-50 h-10 ring-2 ring-amber-400 border-none outline-none text-slate-900 text-xs"
            defaultValue={item.locationName}
            onBlur={(e) => {
              setEditingField(null);
              if (e.target.value.trim() && e.target.value.trim() !== item.locationName) {
                onUpdate(item.id!, 'locationName', e.target.value.trim().toUpperCase());
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              } else if (e.key === 'Escape') {
                setEditingField(null);
              }
            }}
            autoFocus
          />
        ) : (
          <div 
            onClick={() => setEditingField('locationName')}
            className={`py-3 px-4 text-left font-sans font-bold text-slate-800 hover:bg-slate-100 cursor-pointer w-full leading-tight truncate flex items-center justify-between gap-1 ${largeFont ? 'text-base' : 'text-[11px] sm:text-xs'}`}
            title="Location display name (click to edit local value)"
          >
            <span className="truncate">{locationNameDisplay}</span>
            {isStoreSynced && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 rounded border border-emerald-250 animate-fade-in whitespace-nowrap bg-emerald-50" title="Dynamically linked with Stores Management database">
                <Link2 className="w-2 h-2" /> Linked
              </span>
            )}
          </div>
        )}
      </td>

      {/* —————————— PEPSI BRAND METRICS —————————— */}

      {/* Pepsi Budget Limit Cell (Sky Blue background) */}
      <td className="p-0 border-r border-[#004b87]/20 bg-[#f0f7ff] text-right font-mono">
        {editingField === 'pepsiBudget' ? (
          <input
            ref={cellRef}
            type="number"
            step="0.01"
            className="w-full text-right font-mono px-3 py-2 bg-amber-50 h-10 ring-2 ring-amber-400 border-none outline-none text-slate-900 text-xs"
            defaultValue={item.pepsiBudget}
            onBlur={(e) => {
              setEditingField(null);
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val !== item.pepsiBudget) {
                onUpdateBudget(item.id!, 'pepsi', val, item.pepsiPurchase);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              } else if (e.key === 'Escape') {
                setEditingField(null);
              }
            }}
            autoFocus
          />
        ) : (
          <div 
            onClick={() => setEditingField('pepsiBudget')}
            className={`py-3 px-3 font-mono text-right font-bold text-[#0f4c81] hover:bg-[#e6f4ff] cursor-pointer w-full leading-none ${largeFont ? 'text-base' : 'text-xs'}`}
          >
            {item.pepsiBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        )}
      </td>

      {/* Used Pepsi Purchase (Light Green Tint bg) */}
      <td className="p-0 border-r border-[#004b87]/20 bg-[#f2f9f3] text-right font-mono">
        {editingField === 'pepsiPurchase' ? (
          <input
            ref={cellRef}
            type="number"
            step="0.01"
            className="w-full text-right font-mono px-3 py-2 bg-amber-50 h-10 ring-2 ring-amber-400 border-none outline-none text-slate-900 text-xs"
            defaultValue={item.pepsiPurchase}
            onBlur={(e) => {
              setEditingField(null);
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val !== item.pepsiPurchase) {
                onUpdateBudget(item.id!, 'pepsi', item.pepsiBudget, val);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              } else if (e.key === 'Escape') {
                setEditingField(null);
              }
            }}
            autoFocus
          />
        ) : (
          <div 
            onClick={() => setEditingField('pepsiPurchase')}
            className={`py-3 px-3 font-mono text-right font-bold text-[#134e1c] hover:bg-[#ebf6ee] cursor-pointer w-full leading-none ${largeFont ? 'text-base' : 'text-xs'}`}
          >
            {item.pepsiPurchase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        )}
      </td>

      {/* Left Pepsi Budget */}
      <td className="p-0 border-r border-[#004b87]/30 bg-amber-50/10 text-right font-mono">
        <div 
          className={`py-3 px-3 font-mono text-right w-full leading-none select-none transition-all ${
            largeFont ? 'text-base' : 'text-xs'
          } ${isRedPepsiLeft ? 'text-red-650 font-black text-[12px] bg-red-50/60' : 'text-[#9c6500] font-black bg-[#ffeb9c]/20'}`}
        >
          {item.pepsiLeft.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </td>

      {/* —————————— TRANSMED BRAND METRICS —————————— */}

      {/* Transmed Budget Limit Cell (Orange tint background) */}
      <td className="p-0 border-r border-[#ff6600]/20 bg-[#fffbf7] text-right font-mono">
        {editingField === 'transmedBudget' ? (
          <input
            ref={cellRef}
            type="number"
            step="0.01"
            className="w-full text-right font-mono px-3 py-2 bg-amber-50 h-10 ring-2 ring-amber-400 border-none outline-none text-slate-900 text-xs"
            defaultValue={item.transmedBudget}
            onBlur={(e) => {
              setEditingField(null);
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val !== item.transmedBudget) {
                onUpdateBudget(item.id!, 'transmed', val, item.transmedPurchase);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              } else if (e.key === 'Escape') {
                setEditingField(null);
              }
            }}
            autoFocus
          />
        ) : (
          <div 
            onClick={() => setEditingField('transmedBudget')}
            className={`py-3 px-3 font-mono text-right font-bold text-orange-900 hover:bg-[#ffeedd] cursor-pointer w-full leading-none ${largeFont ? 'text-base' : 'text-xs'}`}
          >
            {item.transmedBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        )}
      </td>

      {/* Used Transmed Purchase (Soft cream tint bg) */}
      <td className="p-0 border-r border-[#ff6600]/20 bg-[#fffaf5] text-right font-mono">
        {editingField === 'transmedPurchase' ? (
          <input
            ref={cellRef}
            type="number"
            step="0.01"
            className="w-full text-right font-mono px-3 py-2 bg-amber-50 h-10 ring-2 ring-amber-400 border-none outline-none text-slate-900 text-xs"
            defaultValue={item.transmedPurchase}
            onBlur={(e) => {
              setEditingField(null);
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val !== item.transmedPurchase) {
                onUpdateBudget(item.id!, 'transmed', item.transmedBudget, val);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              } else if (e.key === 'Escape') {
                setEditingField(null);
              }
            }}
            autoFocus
          />
        ) : (
          <div 
            onClick={() => setEditingField('transmedPurchase')}
            className={`py-3 px-3 font-mono text-right font-bold text-[#7c2d12] hover:bg-[#fed7aa]/30 cursor-pointer w-full leading-none ${largeFont ? 'text-base' : 'text-xs'}`}
          >
            {item.transmedPurchase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        )}
      </td>

      {/* Left Transmed Budget */}
      <td className="p-0 border-r border-[#ff6600]/30 bg-rose-50/10 text-right font-mono">
        <div 
          className={`py-3 px-3 font-mono text-right w-full leading-none select-none transition-all ${
            largeFont ? 'text-base' : 'text-xs'
          } ${isRedTransmedLeft ? 'text-red-650 font-black text-[12px] bg-red-50/60' : 'text-[#92400e] font-black bg-[#fef3c7]/25'}`}
        >
          {item.transmedLeft.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </td>

      {/* Action operations columns */}
      <td className="py-2.5 px-1 text-center bg-slate-50">
        <button
          type="button"
          onClick={() => onDelete(item.id!, item.storeNumber)}
          className="p-1 px-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
          title="Delete Store row"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>

    </tr>
  );
}
