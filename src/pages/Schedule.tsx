import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { CalendarDays, Save, Download, FileSpreadsheet } from 'lucide-react';
import { exportToPDF, exportToExcel } from '../lib/exportUtils';

export default function Schedule() {
  const { user } = useAuth();
  const [month, setMonth] = useState('04');
  const [year, setYear] = useState('2026');
  
  const [staffList, setStaffList] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [filterStore, setFilterStore] = useState('All');
  
  // schedules state: { staffId: { day: { status: 'AM', hours: '2.5' } } }
  const [schedules, setSchedules] = useState<Record<string, Record<string, { status: string, hours?: string }>>>({});
  const [prevSchedules, setPrevSchedules] = useState<Record<string, Record<string, { status: string, hours?: string }>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch Stores
    const qStores = user?.role === 'store' 
      ? query(collection(db, 'stores'), where('name', '==', user.username))
      : collection(db, 'stores');
      
    const unsubStores = onSnapshot(qStores, (snapshot) => {
      const storesData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setStores(storesData);
      if (user?.role === 'store' && storesData.length > 0) {
        setFilterStore(storesData[0].name);
      }
    });

    return () => unsubStores();
  }, [user]);

  useEffect(() => {
    // Fetch Staff based on filterStore
    let qStaff: any = collection(db, 'staff');
    if (user?.role === 'store') {
      qStaff = query(collection(db, 'staff'), where('storeId', '==', user.username));
    } else if (filterStore !== 'All') {
      qStaff = query(collection(db, 'staff'), where('storeId', '==', filterStore));
    }

    const unsubStaff = onSnapshot(qStaff, (snapshot) => {
      setStaffList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubStaff();
  }, [user, filterStore]);

  useEffect(() => {
    // Fetch Schedules for the selected month/year and previous month
    const fetchSchedules = async () => {
      setLoading(true);
      const newSchedules: Record<string, Record<string, { status: string, hours?: string }>> = {};
      const newPrevSchedules: Record<string, Record<string, { status: string, hours?: string }>> = {};
      
      let prevMonthNum = parseInt(month) - 1;
      let prevYearNum = parseInt(year);
      if (prevMonthNum === 0) {
        prevMonthNum = 12;
        prevYearNum -= 1;
      }
      const prevMonthStr = prevMonthNum.toString().padStart(2, '0');
      const prevYearStr = prevYearNum.toString();

      for (const staff of staffList) {
        // Current month
        const docId = `schedule_${staff.id}_${year}_${month}`;
        const docSnap = await getDoc(doc(db, 'schedules', docId));
        if (docSnap.exists()) {
          newSchedules[staff.id] = docSnap.data().days || {};
        } else {
          newSchedules[staff.id] = {};
        }

        // Previous month
        const prevDocId = `schedule_${staff.id}_${prevYearStr}_${prevMonthStr}`;
        const prevDocSnap = await getDoc(doc(db, 'schedules', prevDocId));
        if (prevDocSnap.exists()) {
          newPrevSchedules[staff.id] = prevDocSnap.data().days || {};
        } else {
          newPrevSchedules[staff.id] = {};
        }
      }
      
      setSchedules(newSchedules);
      setPrevSchedules(newPrevSchedules);
      setLoading(false);
    };

    if (staffList.length > 0) {
      fetchSchedules();
    } else {
      setSchedules({});
      setPrevSchedules({});
      setLoading(false);
    }
  }, [staffList, month, year]);

  const handleCellChange = (staffId: string, day: number, field: 'status' | 'hours', value: string) => {
    setSchedules(prev => {
      const staffSchedule = prev[staffId] || {};
      const dayData = staffSchedule[day.toString()] || { status: '-' };
      
      return {
        ...prev,
        [staffId]: {
          ...staffSchedule,
          [day.toString()]: {
            ...dayData,
            [field]: value
          }
        }
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const staff of staffList) {
        const docId = `schedule_${staff.id}_${year}_${month}`;
        const staffSchedule = schedules[staff.id] || {};
        await setDoc(doc(db, 'schedules', docId), {
          staffId: staff.id,
          storeId: staff.storeId,
          month,
          year,
          days: staffSchedule,
          updatedAt: new Date().toISOString()
        });
      }
      alert('Schedule saved successfully!');
    } catch (error) {
      console.error("Error saving schedule:", error);
      alert('Failed to save schedule.');
    } finally {
      setSaving(false);
    }
  };

  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const calculateTotalOvertime = (staffId: string) => {
    const currentSchedule = schedules[staffId] || {};
    const prevSchedule = prevSchedules[staffId] || {};
    let total = 0;
    
    // Previous month: 25th to end of month
    Object.entries(prevSchedule).forEach(([dayStr, day]: [string, any]) => {
      const dayNum = parseInt(dayStr);
      if (dayNum >= 25 && day.status === 'OverTime' && day.hours) {
        total += parseFloat(day.hours) || 0;
      }
    });

    // Current month: 1st to 25th
    Object.entries(currentSchedule).forEach(([dayStr, day]: [string, any]) => {
      const dayNum = parseInt(dayStr);
      if (dayNum <= 25 && day.status === 'OverTime' && day.hours) {
        total += parseFloat(day.hours) || 0;
      }
    });

    return total;
  };

  const getReportDateRange = () => {
    let prevMonthNum = parseInt(month) - 1;
    let prevYearNum = parseInt(year);
    if (prevMonthNum === 0) {
      prevMonthNum = 12;
      prevYearNum -= 1;
    }
    const prevMonthStr = prevMonthNum.toString().padStart(2, '0');
    return {
      start: `25/${prevMonthStr}/${prevYearNum}`,
      end: `25/${month}/${year}`
    };
  };

  const handleExportPDF = () => {
    const { start, end } = getReportDateRange();
    const columns = ['Staff Name', 'Store', 'Total Overtime (Hours)'];
    const data = staffList.map(s => {
      const ot = calculateTotalOvertime(s.id);
      return [s.name, s.storeId, ot > 0 ? ot.toFixed(1) : '0'];
    });
    exportToPDF(`Overtime Summary ${start} To ${end}`, columns, data);
  };

  const handleExportExcel = () => {
    const { start, end } = getReportDateRange();
    const data = staffList.map(s => {
      const ot = calculateTotalOvertime(s.id);
      return {
        'Staff Name': s.name,
        'Store': s.storeId,
        'Total Overtime (Hours)': ot > 0 ? ot.toFixed(1) : '0'
      };
    });
    exportToExcel(`Overtime Summary ${start} To ${end}`, data);
  };

  const handleExportSchedulePDF = () => {
    const { start, end } = getReportDateRange();
    
    let prevMonthNum = parseInt(month) - 1;
    let prevYearNum = parseInt(year);
    if (prevMonthNum === 0) {
      prevMonthNum = 12;
      prevYearNum -= 1;
    }
    const daysInPrevMonth = new Date(prevYearNum, prevMonthNum, 0).getDate();
    
    const exportColumns = ['Staff Name', 'Store'];
    const exportDays: { day: number, isPrev: boolean }[] = [];
    
    for (let d = 25; d <= daysInPrevMonth; d++) {
      exportColumns.push(`${d}/${prevMonthNum}`);
      exportDays.push({ day: d, isPrev: true });
    }
    for (let d = 1; d <= 25; d++) {
      exportColumns.push(`${d}/${parseInt(month)}`);
      exportDays.push({ day: d, isPrev: false });
    }

    const data = staffList.map(s => {
      const row = [s.name, s.storeId];
      const currentSchedule = schedules[s.id] || {};
      const prevSchedule = prevSchedules[s.id] || {};
      
      exportDays.forEach(({ day, isPrev }) => {
        const cellData = isPrev ? prevSchedule[day.toString()] : currentSchedule[day.toString()];
        let cellText = cellData?.status || '-';
        if (cellData?.status === 'OverTime' && cellData?.hours) {
          cellText += ` (${cellData.hours}h)`;
        }
        row.push(cellText);
      });
      return row;
    });

    exportToPDF(`Staff Schedule ${start} To ${end}`, exportColumns, data, 'landscape');
  };

  const handleExportScheduleExcel = () => {
    const { start, end } = getReportDateRange();
    
    let prevMonthNum = parseInt(month) - 1;
    let prevYearNum = parseInt(year);
    if (prevMonthNum === 0) {
      prevMonthNum = 12;
      prevYearNum -= 1;
    }
    const daysInPrevMonth = new Date(prevYearNum, prevMonthNum, 0).getDate();
    
    const exportDays: { day: number, isPrev: boolean, label: string }[] = [];
    
    for (let d = 25; d <= daysInPrevMonth; d++) {
      exportDays.push({ day: d, isPrev: true, label: `${d}/${prevMonthNum}` });
    }
    for (let d = 1; d <= 25; d++) {
      exportDays.push({ day: d, isPrev: false, label: `${d}/${parseInt(month)}` });
    }

    const data = staffList.map(s => {
      const row: any = {
        'Staff Name': s.name,
        'Store': s.storeId
      };
      const currentSchedule = schedules[s.id] || {};
      const prevSchedule = prevSchedules[s.id] || {};
      
      exportDays.forEach(({ day, isPrev, label }) => {
        const cellData = isPrev ? prevSchedule[day.toString()] : currentSchedule[day.toString()];
        let cellText = cellData?.status || '-';
        if (cellData?.status === 'OverTime' && cellData?.hours) {
          cellText += ` (${cellData.hours}h)`;
        }
        row[label] = cellText;
      });
      return row;
    });

    exportToExcel(`Staff Schedule ${start} To ${end}`, data);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900 font-display">Staff Schedule</h1>
        </div>
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
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            <option value="01">01</option><option value="02">02</option><option value="03">03</option>
            <option value="04">04</option><option value="05">05</option><option value="06">06</option>
            <option value="07">07</option><option value="08">08</option><option value="09">09</option>
            <option value="10">10</option><option value="11">11</option><option value="12">12</option>
          </select>
          <select 
            className="input-field py-1.5 w-auto"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
          <button 
            onClick={handleSave}
            disabled={saving || loading}
            className="btn-primary"
          >
            <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Monthly Schedule */}
      <div className="card">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-sm font-medium text-slate-700">Monthly Schedule ({month}/{year})</h3>
          <div className="flex gap-2">
            <button onClick={handleExportSchedulePDF} className="btn-secondary py-1 px-2 text-xs" title="Export PDF">
              <Download className="w-3 h-3 text-red-500 mr-1" /> PDF
            </button>
            <button onClick={handleExportScheduleExcel} className="btn-secondary py-1 px-2 text-xs" title="Export Excel">
              <FileSpreadsheet className="w-3 h-3 text-emerald-500 mr-1" /> Excel
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500 font-medium">Loading schedule...</div>
          ) : staffList.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-medium">No staff found for the selected store.</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 border-b border-slate-200">
              <thead className="bg-white">
                <tr>
                  <th scope="col" className="table-header sticky left-0 bg-white z-10 border-r border-slate-200">Staff Name</th>
                  {days.map(day => {
                    const date = new Date(parseInt(year), parseInt(month) - 1, day);
                    const dayOfWeek = date.getDay();
                    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday/Saturday in some regions, adjust if needed
                    return (
                      <th key={day} scope="col" className={`px-2 py-3 text-center text-xs font-bold text-slate-900 min-w-[80px] ${isWeekend ? 'bg-slate-50' : ''}`}>
                        <div className="flex flex-col">
                          <span className="text-slate-500 font-medium">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]}</span>
                          <span className="text-sm">{day}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-200">
                      <div className="flex flex-col">
                        <span>{staff.name}</span>
                        <span className="text-xs text-slate-500 font-normal">{staff.storeId}</span>
                      </div>
                    </td>
                    {days.map(day => {
                      const date = new Date(parseInt(year), parseInt(month) - 1, day);
                      const isWeekend = date.getDay() === 5 || date.getDay() === 6;
                      const cellData = schedules[staff.id]?.[day.toString()] || { status: '-' };
                      
                      return (
                        <td key={day} className={`px-1 py-2 text-center align-top ${isWeekend ? 'bg-slate-50' : ''}`}>
                          <div className="flex flex-col gap-1">
                            <select 
                              className="text-xs border-slate-200 rounded p-1 w-full focus:ring-brand-500 focus:border-brand-500"
                              value={cellData.status}
                              onChange={(e) => handleCellChange(staff.id, day, 'status', e.target.value)}
                            >
                              <option value="-">-</option>
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                              <option value="DayOFF">DayOFF</option>
                              <option value="Cancel">Cancel</option>
                              <option value="OverTime">OverTime</option>
                            </select>
                            {cellData.status === 'OverTime' && (
                              <input 
                                type="number" 
                                step="0.5"
                                placeholder="Hrs"
                                className="text-xs border-slate-200 rounded p-1 w-full text-center focus:ring-brand-500 focus:border-brand-500" 
                                value={cellData.hours || ''}
                                onChange={(e) => handleCellChange(staff.id, day, 'hours', e.target.value)}
                              />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Overtime Summary */}
      {!loading && staffList.length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-sm font-medium text-slate-700">
              Overtime Summary ({getReportDateRange().start} To {getReportDateRange().end})
            </h3>
            <div className="flex gap-2">
              <button onClick={handleExportPDF} className="btn-secondary py-1 px-2 text-xs" title="Export PDF">
                <Download className="w-3 h-3 text-red-500 mr-1" /> PDF
              </button>
              <button onClick={handleExportExcel} className="btn-secondary py-1 px-2 text-xs" title="Export Excel">
                <FileSpreadsheet className="w-3 h-3 text-emerald-500 mr-1" /> Excel
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-white">
                <tr>
                  <th scope="col" className="table-header">Staff Name</th>
                  <th scope="col" className="table-header">Store</th>
                  <th scope="col" className="table-header text-right">Total Overtime (Hours)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {staffList.map((staff) => {
                  const totalOt = calculateTotalOvertime(staff.id);
                  if (totalOt === 0) return null;
                  return (
                    <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                      <td className="table-cell font-medium text-slate-900">{staff.name}</td>
                      <td className="table-cell text-slate-500">{staff.storeId}</td>
                      <td className="table-cell text-right font-medium text-brand-600">{totalOt.toFixed(1)}</td>
                    </tr>
                  );
                })}
                {staffList.every(staff => calculateTotalOvertime(staff.id) === 0) && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-sm text-slate-500 font-medium">No overtime recorded for this month.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
