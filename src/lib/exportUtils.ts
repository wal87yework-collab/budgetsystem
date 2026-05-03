import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const exportToPDF = (title: string, columns: string[], data: any[][], orientation: 'portrait' | 'landscape' = 'portrait', subtitle: string = '') => {
  const doc = new jsPDF({ orientation });
  
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  let yPos = 30;
  if (subtitle) {
    doc.text(subtitle, 14, yPos);
    yPos += 6;
  }
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, yPos);

  autoTable(doc, {
    head: [columns],
    body: data,
    startY: yPos + 5,
    styles: { 
      fontSize: orientation === 'landscape' ? 7 : 9, 
      cellPadding: orientation === 'landscape' ? 1.5 : 3,
      overflow: 'linebreak'
    },
    headStyles: { fillColor: [59, 130, 246] }, // brand-500
    alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
};

export const exportToExcel = (title: string, data: any[]) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${title.toLowerCase().replace(/\s+/g, '_')}.xlsx`);
};
