import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { PlusCircle, Edit, Trash2, X, TrendingUp, DollarSign, CreditCard, Smartphone, Download, FileSpreadsheet, Printer, CalendarRange } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { exportToPDF, exportToExcel } from '../lib/exportUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Sales() {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Filters
  const [filterStore, setFilterStore] = useState('All');
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'MM'));
  const [filterYear, setFilterYear] = useState(format(new Date(), 'yyyy'));

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  const initialFormState = {
    storeId: '', date: '', netSales: '', mastercard: '', span: '', visa: '',
    stc: '', wasal: '', toYou: '', jahez: '', hungerStation: '',
    advance: '', used: '', bankReceive: '', notes: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    // Fetch Stores
    const qStores = user?.role === 'store' 
      ? query(collection(db, 'stores'), where('name', '==', user.username))
      : collection(db, 'stores');
      
    const unsubStores = onSnapshot(qStores, (snapshot) => {
      const storesData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setStores(storesData);
      if (user?.role === 'store' && storesData.length > 0) {
        setFormData(prev => ({ ...prev, storeId: storesData[0].name }));
      }
    });

    // Fetch Sales
    const qSales = user?.role === 'store'
      ? query(collection(db, 'sales'), where('storeId', '==', user.username))
      : collection(db, 'sales');

    const unsubSales = onSnapshot(qSales, (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by date descending
      salesData.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSales(salesData);
      setLoading(false);
    });

    return () => {
      unsubStores();
      unsubSales();
    };
  }, [user]);

  // Math Calculations
  const parseNum = (val: any) => parseFloat(val) || 0;
  const netSales = parseNum(formData.netSales);
  const tax = netSales * 0.15;
  const totalAfterTax = netSales + tax;
  
  const mastercard = parseNum(formData.mastercard);
  const span = parseNum(formData.span);
  const visa = parseNum(formData.visa);
  const totalAtms = mastercard + span + visa;
  
  const stc = parseNum(formData.stc);
  const wasal = parseNum(formData.wasal);
  const toYou = parseNum(formData.toYou);
  const jahez = parseNum(formData.jahez);
  const hungerStation = parseNum(formData.hungerStation);
  const totalApps = stc + wasal + toYou + jahez + hungerStation;
  
  const royaltyFee = netSales * 0.08;
  const marketingFee = netSales * 0.045;
  const totalFees = royaltyFee + marketingFee;
  
  const cashSalesOfDay = totalAfterTax - totalAtms - totalApps;
  const advance = parseNum(formData.advance);
  const used = parseNum(formData.used);
  const bankReceive = parseNum(formData.bankReceive);
  const finalCashSales = cashSalesOfDay + advance - used;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate entries for the same store and date
    if (!editingId) {
      const storeToCheck = user?.role === 'store' ? user.username : formData.storeId;
      const isDuplicate = sales.some(s => s.storeId === storeToCheck && s.date === formData.date);
      
      if (isDuplicate) {
        alert(`A sales record for ${storeToCheck} on ${formData.date} already exists. Please edit the existing record instead.`);
        return;
      }
    }

    const saleData = {
      ...formData,
      netSales, tax, totalAfterTax, mastercard, span, visa, totalAtms,
      stc, wasal, toYou, jahez, hungerStation, totalApps,
      royaltyFee, marketingFee, totalFees,
      cashSalesOfDay, advance, used, bankReceive, finalCashSales,
      createdAt: new Date().toISOString()
    };

    // Force storeId if user is a store
    if (user?.role === 'store') {
      saleData.storeId = user.username;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, 'sales', editingId), saleData);
      } else {
        await addDoc(collection(db, 'sales'), saleData);
      }
      setIsModalOpen(false);
      setFormData(initialFormState);
      setEditingId(null);
    } catch (error) {
      console.error("Error saving sale:", error);
      alert("Failed to save record.");
    }
  };

  const handleEdit = (sale: any) => {
    setFormData({
      storeId: sale.storeId || '',
      date: sale.date || '',
      netSales: sale.netSales?.toString() || '',
      mastercard: sale.mastercard?.toString() || '',
      span: sale.span?.toString() || '',
      visa: sale.visa?.toString() || '',
      stc: sale.stc?.toString() || '',
      wasal: sale.wasal?.toString() || '',
      toYou: sale.toYou?.toString() || '',
      jahez: sale.jahez?.toString() || '',
      hungerStation: sale.hungerStation?.toString() || '',
      advance: sale.advance?.toString() || '',
      used: sale.used?.toString() || '',
      bankReceive: sale.bankReceive?.toString() || '',
      notes: sale.notes || ''
    });
    setEditingId(sale.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await deleteDoc(doc(db, 'sales', id));
      } catch (error) {
        console.error("Error deleting sale:", error);
      }
    }
  };

  const filteredSales = sales.filter(sale => {
    if (filterStore !== 'All' && sale.storeId !== filterStore) return false;
    if (sale.date) {
      const [y, m] = sale.date.split('-');
      if (y !== filterYear || m !== filterMonth) return false;
    }
    return true;
  });

  const salesColumns = [
    'Store', 'Date', 'Net Sales', 'Tax', 'Total w/ Tax', 
    'Mastercard', 'Span', 'Visa', 'Total ATMs', 
    'STC', 'Wasal', 'ToYou', 'Jahez', 'HungerSt.', 'Total Apps', 
    'Royalty', 'Marketing', 'Total Fees', 
    'Advance', 'Used', 'Cash Sales', 'Final Cash', 'Notes'
  ];

  const mapSaleToRow = (s: any) => [
    s.storeId || '', 
    s.date || '', 
    s.netSales?.toFixed(2) || '0.00', 
    s.tax?.toFixed(2) || '0.00', 
    s.totalAfterTax?.toFixed(2) || '0.00',
    s.mastercard?.toFixed(2) || '0.00', 
    s.span?.toFixed(2) || '0.00', 
    s.visa?.toFixed(2) || '0.00', 
    s.totalAtms?.toFixed(2) || '0.00',
    s.stc?.toFixed(2) || '0.00', 
    s.wasal?.toFixed(2) || '0.00', 
    s.toYou?.toFixed(2) || '0.00', 
    s.jahez?.toFixed(2) || '0.00', 
    s.hungerStation?.toFixed(2) || '0.00', 
    s.totalApps?.toFixed(2) || '0.00',
    s.royaltyFee?.toFixed(2) || '0.00', 
    s.marketingFee?.toFixed(2) || '0.00', 
    s.totalFees?.toFixed(2) || '0.00',
    s.advance?.toFixed(2) || '0.00', 
    s.used?.toFixed(2) || '0.00', 
    s.cashSalesOfDay?.toFixed(2) || '0.00', 
    s.finalCashSales?.toFixed(2) || '0.00', 
    s.notes || ''
  ];

  const mapSaleToExcel = (s: any) => ({
    'Store': s.storeId || '', 
    'Date': s.date || '', 
    'Net Sales': s.netSales || 0, 
    'Tax': s.tax || 0, 
    'Total After Tax': s.totalAfterTax || 0,
    'Mastercard': s.mastercard || 0, 
    'Span': s.span || 0, 
    'Visa': s.visa || 0, 
    'Total ATMs': s.totalAtms || 0,
    'STC': s.stc || 0, 
    'Wasal': s.wasal || 0, 
    'ToYou': s.toYou || 0, 
    'Jahez': s.jahez || 0, 
    'Hunger Station': s.hungerStation || 0, 
    'Total Apps': s.totalApps || 0,
    'Royalty Fee': s.royaltyFee || 0, 
    'Marketing Fee': s.marketingFee || 0, 
    'Total Fees': s.totalFees || 0,
    'Advance': s.advance || 0, 
    'Used': s.used || 0, 
    'Bank Receive': s.bankReceive || 0,
    'Cash Sales Of Day': s.cashSalesOfDay || 0, 
    'Final Cash Sales': s.finalCashSales || 0, 
    'Notes': s.notes || ''
  });

  const handleExportPDF = () => {
    const data = filteredSales.map(mapSaleToRow);
    exportToPDF(`Sales Report - ${filterMonth}-${filterYear}`, salesColumns, data, 'landscape');
  };

  const handleExportExcel = () => {
    const data = filteredSales.map(mapSaleToExcel);
    exportToExcel(`Sales Report - ${filterMonth}-${filterYear}`, data);
  };

  const handlePrintSingleSale = (sale: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138); // brand-900
    doc.text(`DAILY SALES REPORT`, 14, 16);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Store: ${sale.storeId || 'N/A'}`, 14, 24);
    doc.text(`Date: ${sale.date || 'N/A'}`, 14, 30);

    const tableBody = [
      [{ content: 'SALES', colSpan: 2, styles: { halign: 'center', fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' } }],
      ['Net Sales', Number(sale.netSales || 0).toFixed(2)],
      ['Tax', Number(sale.tax || 0).toFixed(2)],
      [{ content: 'Total After Tax', styles: { fontStyle: 'bold' } }, { content: Number(sale.totalAfterTax || 0).toFixed(2), styles: { fontStyle: 'bold' } }],
      
      [{ content: 'ATMs', colSpan: 2, styles: { halign: 'center', fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' } }],
      ['Mastercard', Number(sale.mastercard || 0).toFixed(2)],
      ['Span', Number(sale.span || 0).toFixed(2)],
      ['Visa', Number(sale.visa || 0).toFixed(2)],
      [{ content: 'Total ATMs', styles: { fontStyle: 'bold' } }, { content: Number(sale.totalAtms || 0).toFixed(2), styles: { fontStyle: 'bold' } }],

      [{ content: 'APPS', colSpan: 2, styles: { halign: 'center', fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' } }],
      ['Stc', Number(sale.stc || 0).toFixed(2)],
      ['Wasal', Number(sale.wasal || 0).toFixed(2)],
      ['To You', Number(sale.toYou || 0).toFixed(2)],
      ['Jahez', Number(sale.jahez || 0).toFixed(2)],
      ['Hunger Station', Number(sale.hungerStation || 0).toFixed(2)],
      [{ content: 'Total Apps', styles: { fontStyle: 'bold' } }, { content: Number(sale.totalApps || 0).toFixed(2), styles: { fontStyle: 'bold' } }],

      [{ content: 'ROYALTY & MARKETING FEES', colSpan: 2, styles: { halign: 'center', fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' } }],
      ['Royalty Fee (8%)', Number(sale.royaltyFee || 0).toFixed(2)],
      ['Marketing (4.5%)', Number(sale.marketingFee || 0).toFixed(2)],
      [{ content: 'Total Fees', styles: { fontStyle: 'bold' } }, { content: Number(sale.totalFees || 0).toFixed(2), styles: { fontStyle: 'bold' } }],

      [{ content: 'ADVANCE MONEY FOR PETTY CASH', colSpan: 2, styles: { halign: 'center', fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' } }],
      ['Advance', Number(sale.advance || 0).toFixed(2)],
      [{ content: 'Used', styles: { textColor: [239, 68, 68] } }, { content: Number(sale.used || 0).toFixed(2), styles: { textColor: [239, 68, 68], halign: 'right' } }],
      ['Cash Sales Of Day', Number(sale.cashSalesOfDay || 0).toFixed(2)],
      [{ content: 'Final Cash Sales', styles: { fontStyle: 'bold' } }, { content: Number(sale.finalCashSales || 0).toFixed(2), styles: { fontStyle: 'bold' } }],
    ];

    autoTable(doc, {
      startY: 34,
      head: [['Description', 'Amount (SAR)']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 130 },
        1: { cellWidth: 'auto', halign: 'right' }
      },
      styles: { fontSize: 9, cellPadding: 2.5 },
      margin: { left: 14, right: 14 }
    });

    doc.save(`Daily_Sales_${sale.storeId || 'Store'}_${sale.date || 'Date'}.pdf`);
  };

  const handleExportDateRangeReport = () => {
    if (!reportStartDate || !reportEndDate) {
      alert('Please select both start and end dates.');
      return;
    }
    if (reportStartDate > reportEndDate) {
      alert('Start date cannot be after end date.');
      return;
    }
    
    const filtered = sales.filter(s => {
      if (filterStore !== 'All' && s.storeId !== filterStore) return false;
      return s.date >= reportStartDate && s.date <= reportEndDate;
    });
    
    if (filtered.length === 0) {
      alert('No sales found in this date range.');
      return;
    }

    const reportColumns = [
      'Date', 'Net Sales', '15% VAT', 'Total Sales', 
      'Total Apps', 'Total ATM', 'Box (Final Cash)', 'Used', 
      'Bank Receive'
    ];

    const reportData = filtered.map(s => [
      s.date || '',
      s.netSales?.toFixed(2) || '0.00',
      s.tax?.toFixed(2) || '0.00',
      s.totalAfterTax?.toFixed(2) || '0.00',
      s.totalApps?.toFixed(2) || '0.00',
      s.totalAtms?.toFixed(2) || '0.00',
      s.finalCashSales?.toFixed(2) || '0.00',
      s.used?.toFixed(2) || '0.00',
      s.bankReceive?.toFixed(2) || '0.00'
    ]);
    
    // Calculate totals for the report
    const totalNet = filtered.reduce((sum, s) => sum + (s.netSales || 0), 0);
    const totalTax = filtered.reduce((sum, s) => sum + (s.tax || 0), 0);
    const totalAfterTax = filtered.reduce((sum, s) => sum + (s.totalAfterTax || 0), 0);
    const totalApps = filtered.reduce((sum, s) => sum + (s.totalApps || 0), 0);
    const totalAtms = filtered.reduce((sum, s) => sum + (s.totalAtms || 0), 0);
    const totalCash = filtered.reduce((sum, s) => sum + (s.finalCashSales || 0), 0);
    const totalUsed = filtered.reduce((sum, s) => sum + (s.used || 0), 0);
    const totalBankReceive = filtered.reduce((sum, s) => sum + (s.bankReceive || 0), 0);
    
    reportData.push(Array(9).fill('')); // Empty row
    const totalsRow = [
      'TOTALS',
      totalNet.toFixed(2),
      totalTax.toFixed(2),
      totalAfterTax.toFixed(2),
      totalApps.toFixed(2),
      totalAtms.toFixed(2),
      totalCash.toFixed(2),
      totalUsed.toFixed(2),
      totalBankReceive.toFixed(2)
    ];
    
    reportData.push(totalsRow);

    exportToPDF(`Monthly_Sales_Report_${reportStartDate}_to_${reportEndDate}`, reportColumns, reportData, 'landscape');
    setIsReportModalOpen(false);
  };

  const totalSalesAmount = filteredSales.reduce((sum, sale) => sum + (sale.totalAfterTax || 0), 0);
  const totalAtmsAmount = filteredSales.reduce((sum, sale) => sum + (sale.totalAtms || 0), 0);
  const totalAppsAmount = filteredSales.reduce((sum, sale) => sum + (sale.totalApps || 0), 0);
  const totalCashAmount = filteredSales.reduce((sum, sale) => sum + (sale.finalCashSales || 0), 0);

  const chartData = filteredSales.slice(0, 10).reverse().map(sale => ({
    name: sale.date ? format(parseISO(sale.date), 'dd MMM') : 'Unknown',
    sales: sale.totalAfterTax || 0
  }));

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading sales data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900 font-display">Sales Management</h1>
        <div className="flex flex-wrap items-center gap-3">
          {user?.role === 'admin' && (
            <select 
              className="input-field py-1.5 w-auto"
              value={filterStore}
              onChange={(e) => setFilterStore(e.target.value)}
            >
              <option value="All">All Stores</option>
              {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          )}
          <select 
            className="input-field py-1.5 w-auto"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="01">01</option><option value="02">02</option><option value="03">03</option>
            <option value="04">04</option><option value="05">05</option><option value="06">06</option>
            <option value="07">07</option><option value="08">08</option><option value="09">09</option>
            <option value="10">10</option><option value="11">11</option><option value="12">12</option>
          </select>
          <select 
            className="input-field py-1.5 w-auto"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
          
          <div className="flex gap-2 border-l border-slate-200 pl-3 ml-1">
            <button onClick={() => setIsReportModalOpen(true)} className="btn-secondary py-1.5 px-3 whitespace-nowrap" title="Date to Date Report">
              <CalendarRange className="w-4 h-4 mr-2 text-indigo-500" /> <span className="hidden sm:inline">Monthly Report</span>
            </button>
            <button onClick={handleExportPDF} className="btn-secondary py-1.5 px-3" title="Export PDF">
              <Download className="w-4 h-4 text-red-500" />
            </button>
            <button onClick={handleExportExcel} className="btn-secondary py-1.5 px-3" title="Export Excel">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            </button>
          </div>

          <button 
            onClick={() => {
              setFormData(initialFormState);
              if (user?.role === 'store') {
                setFormData(prev => ({ ...prev, storeId: user.username }));
              }
              setEditingId(null);
              setIsModalOpen(true);
            }}
            className="btn-primary whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4 mr-2" /> Add Sales
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 flex items-center transition-all hover:shadow-md">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 mr-4">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Sales</p>
            <p className="text-xl font-bold text-slate-900 font-display mt-0.5">{totalSalesAmount.toFixed(2)} SAR</p>
          </div>
        </div>
        <div className="card p-5 flex items-center transition-all hover:shadow-md">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 mr-4">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total ATMs</p>
            <p className="text-xl font-bold text-slate-900 font-display mt-0.5">{totalAtmsAmount.toFixed(2)} SAR</p>
          </div>
        </div>
        <div className="card p-5 flex items-center transition-all hover:shadow-md">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600 mr-4">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Apps</p>
            <p className="text-xl font-bold text-slate-900 font-display mt-0.5">{totalAppsAmount.toFixed(2)} SAR</p>
          </div>
        </div>
        <div className="card p-5 flex items-center transition-all hover:shadow-md">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 mr-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Final Cash</p>
            <p className="text-xl font-bold text-slate-900 font-display mt-0.5">{totalCashAmount.toFixed(2)} SAR</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-800 font-display mb-6">Sales Trend (Last 10 Records)</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '0.75rem', color: '#F8FAFC', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#F8FAFC' }}
              />
              <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="table-header">Store</th>
                <th className="table-header">Date</th>
                <th className="table-header text-right">Net Sales</th>
                <th className="table-header text-right">Total After Tax</th>
                <th className="table-header text-right">Final Cash</th>
                <th className="table-header text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredSales.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">No sales records found for the selected period.</td></tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-cell font-medium">{sale.storeId}</td>
                    <td className="table-cell text-slate-500">{sale.date}</td>
                    <td className="table-cell text-right">{sale.netSales?.toFixed(2) || '0.00'}</td>
                    <td className="table-cell text-right font-medium text-slate-900">{sale.totalAfterTax?.toFixed(2) || '0.00'}</td>
                    <td className="table-cell text-right font-medium text-emerald-600">{sale.finalCashSales?.toFixed(2) || '0.00'}</td>
                    <td className="table-cell text-center">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => handlePrintSingleSale(sale)} className="text-indigo-500 hover:text-indigo-700 transition-colors" title="Print/Export PDF"><Printer className="w-4 h-4" /></button>
                        <button onClick={() => handleEdit(sale)} className="text-brand-600 hover:text-brand-900 transition-colors" title="Edit"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(sale.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 transform transition-all">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900 font-display">{editingId ? 'Edit Sales Record' : 'Add New Sales Record'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-8 max-h-[75vh] overflow-y-auto">
              {/* Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label-text">Store <span className="text-red-500">*</span></label>
                  <select 
                    required
                    disabled={user?.role === 'store'}
                    className="input-field"
                    value={formData.storeId}
                    onChange={e => setFormData({...formData, storeId: e.target.value})}
                  >
                    <option value="">Choose Store...</option>
                    {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    {user?.role === 'store' && !stores.find(s => s.name === user.username) && (
                      <option value={user.username}>{user.username}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="label-text">Sale Date <span className="text-red-500">*</span></label>
                  <input 
                    type="date" required
                    className="input-field"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              </div>

              {/* Sales Section */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Sales</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="label-text">Net Sales</label>
                    <input type="number" step="0.01" className="input-field" value={formData.netSales} onChange={e => setFormData({...formData, netSales: e.target.value})} />
                  </div>
                  <div>
                    <label className="label-text">Tax (15%)</label>
                    <input type="text" readOnly className="input-field bg-slate-100 text-slate-500 border-transparent font-medium" value={tax.toFixed(2)} />
                  </div>
                  <div>
                    <label className="label-text">Total After Tax</label>
                    <input type="text" readOnly className="input-field bg-brand-50 text-brand-700 border-brand-100 font-bold" value={totalAfterTax.toFixed(2)} />
                  </div>
                </div>
              </div>

              {/* ATMs Section */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">ATMs</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <div>
                    <label className="label-text">Mastercard</label>
                    <input type="number" step="0.01" className="input-field" value={formData.mastercard} onChange={e => setFormData({...formData, mastercard: e.target.value})} />
                  </div>
                  <div>
                    <label className="label-text">Span</label>
                    <input type="number" step="0.01" className="input-field" value={formData.span} onChange={e => setFormData({...formData, span: e.target.value})} />
                  </div>
                  <div>
                    <label className="label-text">Visa</label>
                    <input type="number" step="0.01" className="input-field" value={formData.visa} onChange={e => setFormData({...formData, visa: e.target.value})} />
                  </div>
                  <div>
                    <label className="label-text">Total ATMs</label>
                    <input type="text" readOnly className="input-field bg-slate-100 text-slate-500 border-transparent font-medium" value={totalAtms.toFixed(2)} />
                  </div>
                </div>
              </div>

              {/* Apps Section */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Apps</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                  <div>
                    <label className="label-text">Stc</label>
                    <input type="number" step="0.01" className="input-field" value={formData.stc} onChange={e => setFormData({...formData, stc: e.target.value})} />
                  </div>
                  <div>
                    <label className="label-text">Wasal</label>
                    <input type="number" step="0.01" className="input-field" value={formData.wasal} onChange={e => setFormData({...formData, wasal: e.target.value})} />
                  </div>
                  <div>
                    <label className="label-text">To You</label>
                    <input type="number" step="0.01" className="input-field" value={formData.toYou} onChange={e => setFormData({...formData, toYou: e.target.value})} />
                  </div>
                  <div>
                    <label className="label-text">Jahez</label>
                    <input type="number" step="0.01" className="input-field" value={formData.jahez} onChange={e => setFormData({...formData, jahez: e.target.value})} />
                  </div>
                  <div>
                    <label className="label-text">Hunger Station</label>
                    <input type="number" step="0.01" className="input-field" value={formData.hungerStation} onChange={e => setFormData({...formData, hungerStation: e.target.value})} />
                  </div>
                  <div>
                    <label className="label-text">Total Apps</label>
                    <input type="text" readOnly className="input-field bg-slate-100 text-slate-500 border-transparent font-medium" value={totalApps.toFixed(2)} />
                  </div>
                </div>
              </div>

              {/* Fees & Petty Cash Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Fees</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="label-text mb-0">Royalty Fee (8%)</label>
                      <span className="font-medium text-slate-700">{royaltyFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="label-text mb-0">Marketing (4.5%)</label>
                      <span className="font-medium text-slate-700">{marketingFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <label className="label-text mb-0 font-bold">Total Fees</label>
                      <span className="font-bold text-slate-900">{totalFees.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Petty Cash & Other</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label-text">Advance</label>
                      <input type="number" step="0.01" className="input-field" value={formData.advance} onChange={e => setFormData({...formData, advance: e.target.value})} />
                    </div>
                    <div>
                      <label className="label-text">Used</label>
                      <input type="number" step="0.01" className="input-field" value={formData.used} onChange={e => setFormData({...formData, used: e.target.value})} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label-text">Bank Receive</label>
                      <input type="number" step="0.01" className="input-field" value={formData.bankReceive} onChange={e => setFormData({...formData, bankReceive: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Cash Sales Section */}
              <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100">
                <h3 className="text-sm font-bold text-emerald-800 mb-4 uppercase tracking-wider">Final Calculation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label-text text-emerald-700">Cash Sales Of Day</label>
                    <input type="text" readOnly className="input-field bg-white/50 border-emerald-200 text-emerald-800 font-medium" value={cashSalesOfDay.toFixed(2)} />
                  </div>
                  <div>
                    <label className="label-text text-emerald-800 font-bold">Final Cash Sales</label>
                    <input type="text" readOnly className="input-field bg-emerald-600 text-white border-transparent font-bold text-lg" value={finalCashSales.toFixed(2)} />
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div>
                <label className="label-text">Notes</label>
                <textarea 
                  className="input-field" 
                  rows={3}
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  placeholder="Any additional notes or comments..."
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Date-to-Date Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 font-display">Monthly Sales Report</h2>
              <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-5">
              <p className="text-sm text-slate-500">Select a date range to generate a comprehensive PDF report for the selected store(s).</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Start Date</label>
                  <input type="date" className="input-field" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="label-text">End Date</label>
                  <input type="date" className="input-field" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button onClick={() => setIsReportModalOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button onClick={handleExportDateRangeReport} className="btn-primary flex-1 justify-center bg-indigo-600 hover:bg-indigo-700">
                  <Download className="w-4 h-4 mr-2" /> Export PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
