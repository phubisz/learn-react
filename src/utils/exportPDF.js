import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { buildScheduleMatrix } from './scheduleMatrix';

// jsPDF default fonts don't support Polish diacritics - strip them for PDF
function stripDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0142/g, 'l').replace(/\u0141/g, 'L');
}

/**
 * Export the current month's schedule as a landscape PDF.
 */
export function exportToPDF({ employees, schedule, currentDate, bankHolidays }) {
  const { title, days, rows } = buildScheduleMatrix({ employees, schedule, currentDate, bankHolidays });

  // Landscape A4
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Title - strip diacritics for PDF font compatibility
  const pdfTitle = stripDiacritics(title);
  doc.setFontSize(14);
  doc.text(pdfTitle, doc.internal.pageSize.getWidth() / 2, 12, { align: 'center' });

  // Build table headers (2 header rows: day numbers + day names)
  const headerRow1 = ['Pracownik', ...days.map(d => String(d.dayNum)), 'Mies.', 'Kwart.'];
  const headerRow2 = ['', ...days.map(d => d.dayName), '', ''];

  // Build table body - strip diacritics from all text for PDF font compatibility
  const body = rows.map(row => [
    stripDiacritics(row.employeeName),
    ...row.cells.map(c => c ? stripDiacritics(c) : '-'),
    `${row.monthlyHours}/${row.maxHours}`,
    `${row.quarterlyHours}/${row.maxHoursQuarter}`,
  ]);

  // Color maps for columns
  const weekendCols = new Set();
  const holidayCols = new Set();
  days.forEach((day, idx) => {
    if (day.isHoliday) holidayCols.add(idx + 1); // +1 for employee name col
    else if (day.isWeekend) weekendCols.add(idx + 1);
  });

  // Cell style constants
  const WEEKEND_BG = [245, 245, 245];
  const HOLIDAY_BG = [255, 240, 240];
  const NIGHT_BG = [240, 240, 255];
  const LEAVE_BG = [240, 255, 240];
  const HEADER_BG = [66, 66, 66];
  const HEADER_TEXT = [255, 255, 255];

  autoTable(doc, {
    startY: 16,
    head: [headerRow1, headerRow2],
    body: body,
    theme: 'grid',
    styles: {
      fontSize: 5.5,
      cellPadding: 0.8,
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
    },
    headStyles: {
      fillColor: HEADER_BG,
      textColor: HEADER_TEXT,
      fontStyle: 'bold',
      fontSize: 6,
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 28, fontSize: 7 }, // Employee name
      [days.length + 1]: { cellWidth: 12, fontSize: 6 },  // Monthly hours
      [days.length + 2]: { cellWidth: 12, fontSize: 6 },  // Quarterly hours
    },
    didParseCell: (data) => {
      const colIdx = data.column.index;

      // Weekend/holiday column backgrounds
      if (holidayCols.has(colIdx)) {
        data.cell.styles.fillColor = HOLIDAY_BG;
      } else if (weekendCols.has(colIdx)) {
        data.cell.styles.fillColor = WEEKEND_BG;
      }

      // Header rows keep their style
      if (data.section === 'head') {
        if (holidayCols.has(colIdx)) {
          data.cell.styles.fillColor = [180, 50, 50];
        } else if (weekendCols.has(colIdx)) {
          data.cell.styles.fillColor = [80, 80, 80];
        }
        return;
      }

      // Body cell coloring based on content
      if (data.section === 'body' && colIdx > 0 && colIdx <= days.length) {
        const val = data.cell.raw;
        const isTimeRange = val && val.includes('-') && /\d/.test(val);
        const isNightShift = isTimeRange && parseInt(val.split('-')[0]) >= 18;

        if (isNightShift) {
          data.cell.styles.fillColor = holidayCols.has(colIdx) ? [230, 220, 240] : NIGHT_BG;
          data.cell.styles.fontStyle = 'bold';
        } else if (isTimeRange) {
          // Day shift
          data.cell.styles.fontStyle = 'bold';
        } else if (val && val !== '-') {
          // Leave types
          if (!holidayCols.has(colIdx) && !weekendCols.has(colIdx)) {
            data.cell.styles.fillColor = LEAVE_BG;
          }
          data.cell.styles.textColor = [100, 100, 100];
        }

        // Over-limit monthly hours styling
        if (colIdx === days.length + 1) {
          const row = rows[data.row.index];
          if (row && row.monthlyHours > row.maxHours) {
            data.cell.styles.textColor = [200, 0, 0];
            data.cell.styles.fontStyle = 'bold';
          }
        }

        // Over-limit quarterly hours styling
        if (colIdx === days.length + 2) {
          const row = rows[data.row.index];
          if (row && row.quarterlyHours > row.maxHoursQuarter) {
            data.cell.styles.textColor = [200, 0, 0];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
    margin: { top: 16, left: 5, right: 5 },
  });

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Wygenerowano: ${new Date().toLocaleDateString('en-GB')}`,
    doc.internal.pageSize.getWidth() / 2,
    pageHeight - 5,
    { align: 'center' }
  );

  const filename = `grafik-${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}.pdf`;
  doc.save(filename);
}
