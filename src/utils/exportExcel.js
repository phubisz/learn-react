import * as XLSX from 'xlsx';
import { buildScheduleMatrix } from './scheduleMatrix';

/**
 * Export the current month's schedule as an Excel (.xlsx) file.
 */
export function exportToExcel({ employees, schedule, currentDate, bankHolidays }) {
  const { title, days, rows } = buildScheduleMatrix({ employees, schedule, currentDate, bankHolidays });

  // Build worksheet data as array of arrays
  const wsData = [];

  // Row 1: Title
  wsData.push([title]);

  // Row 2: empty
  wsData.push([]);

  // Row 3: Header - day numbers
  const headerNums = ['Pracownik', ...days.map(d => d.dayNum), 'Mies.', 'Kwart.'];
  wsData.push(headerNums);

  // Row 4: Header - day names
  const headerNames = ['', ...days.map(d => d.dayName), '', ''];
  wsData.push(headerNames);

  // Data rows
  rows.forEach(row => {
    wsData.push([
      row.employeeName,
      ...row.cells,
      `${row.monthlyHours}/${row.maxHours}`,
      `${row.quarterlyHours}/${row.maxHoursQuarter}`,
    ]);
  });

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  const colWidths = [{ wch: 20 }]; // Employee name column
  days.forEach(() => colWidths.push({ wch: 4 }));
  colWidths.push({ wch: 10 }); // Monthly hours column
  colWidths.push({ wch: 10 }); // Quarterly hours column
  ws['!cols'] = colWidths;

  // Merge title across all columns
  const totalCols = days.length + 3; // name + days + monthly + quarterly
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
  ];

  // Apply cell styling (background colors for weekends/holidays)
  const headerNumRow = 2; // 0-indexed row for day numbers
  const headerNameRow = 3;
  const dataStartRow = 4;

  // Style helper - xlsx community edition uses cell.s for styles
  function applyBg(cellRef, bgColor) {
    if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' };
    ws[cellRef].s = {
      fill: { fgColor: { rgb: bgColor } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'CCCCCC' } },
        bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
        left: { style: 'thin', color: { rgb: 'CCCCCC' } },
        right: { style: 'thin', color: { rgb: 'CCCCCC' } },
      },
    };
  }

  function applyCenterAlign(cellRef) {
    if (!ws[cellRef]) return;
    if (!ws[cellRef].s) ws[cellRef].s = {};
    ws[cellRef].s.alignment = { horizontal: 'center', vertical: 'center' };
  }

  // Style header and data cells
  days.forEach((day, colIdx) => {
    const col = colIdx + 1; // offset by employee name column

    // Determine background color
    let bgColor = null;
    if (day.isHoliday) bgColor = 'FFF0F0';
    else if (day.isWeekend) bgColor = 'F5F5F5';

    // Header cells
    const numRef = XLSX.utils.encode_cell({ r: headerNumRow, c: col });
    const nameRef = XLSX.utils.encode_cell({ r: headerNameRow, c: col });
    applyCenterAlign(numRef);
    applyCenterAlign(nameRef);
    if (bgColor) {
      applyBg(numRef, bgColor);
      applyBg(nameRef, bgColor);
    }

    // Data cells
    rows.forEach((_, rowIdx) => {
      const cellRef = XLSX.utils.encode_cell({ r: dataStartRow + rowIdx, c: col });
      applyCenterAlign(cellRef);
      if (bgColor) {
        applyBg(cellRef, bgColor);
      }
    });
  });

  // Title style
  const titleRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (ws[titleRef]) {
    ws[titleRef].s = {
      font: { bold: true, sz: 14 },
      alignment: { horizontal: 'center' },
    };
  }

  // Create workbook and download
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Grafik');

  const filename = `grafik-${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}.xlsx`;
  XLSX.writeFile(wb, filename);
}
