/**
 * Shared schedule matrix builder for PDF/Excel export.
 * Transforms app state into a printable grid structure.
 */

const POLISH_DAY_NAMES = ['Nd', 'Pn', 'Wt', 'Sr', 'Cz', 'Pt', 'So'];

function formatDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function getMonthName(date) {
  const raw = date.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function getCellSymbol(shift) {
  if (!shift) return '';
  if (shift.type === 'leave') return shift.symbol || shift.name || shift.id || '?';
  // For work shifts, show abbreviated times: "07-19" or "19-07"
  const start = shift.startTime || (shift.type === 'day' ? '07:00' : '19:00');
  const end = shift.endTime || (shift.type === 'day' ? '19:00' : '07:00');
  const startShort = start.replace(':00', '').replace(':','');
  const endShort = end.replace(':00', '').replace(':','');
  return `${startShort}-${endShort}`;
}

/**
 * Build a grid structure from schedule data for the given month.
 *
 * Returns {
 *   title: string,
 *   monthName: string,
 *   days: Array<{ dayNum, dayName, dateKey, isWeekend, isHoliday, holidayName }>,
 *   rows: Array<{ employeeName, cells: string[], totalHours, maxHours }>,
 * }
 */
export function buildScheduleMatrix({ employees, schedule, currentDate, bankHolidays }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = getMonthName(currentDate);

  const holidayMap = new Map();
  if (bankHolidays) {
    bankHolidays.forEach(h => { if (h.date) holidayMap.set(h.date, h.name); });
  }

  // Build days metadata
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    const dk = formatDateKey(year, month, i);
    const dow = date.getDay();
    days.push({
      dayNum: i,
      dayName: POLISH_DAY_NAMES[dow],
      dateKey: dk,
      isWeekend: dow === 0 || dow === 6,
      isSunday: dow === 0,
      isHoliday: holidayMap.has(dk),
      holidayName: holidayMap.get(dk) || '',
    });
  }

  // Quarter range for quarterly hours
  const quarterStartMonth = Math.floor(month / 3) * 3;
  const qStart = new Date(year, quarterStartMonth, 1);
  const qEnd = new Date(year, quarterStartMonth + 3, 0);
  const quarterDateKeys = [];
  const qCursor = new Date(qStart);
  while (qCursor <= qEnd) {
    quarterDateKeys.push(formatDateKey(qCursor.getFullYear(), qCursor.getMonth(), qCursor.getDate()));
    qCursor.setDate(qCursor.getDate() + 1);
  }

  // Build rows sorted by name
  const sorted = [...employees].sort((a, b) => a.name.localeCompare(b.name));
  const rows = sorted.map(emp => {
    let monthlyHours = 0;
    const cells = days.map(day => {
      const shift = schedule?.[day.dateKey]?.[emp.id] || null;
      if (shift && shift.type !== 'leave') {
        monthlyHours += Number(shift.hours || 0);
      }
      return getCellSymbol(shift);
    });

    let quarterlyHours = 0;
    quarterDateKeys.forEach(dk => {
      const shift = schedule?.[dk]?.[emp.id];
      if (shift && shift.type !== 'leave') {
        quarterlyHours += Number(shift.hours || 0);
      }
    });

    return {
      employeeName: emp.name,
      cells,
      monthlyHours,
      maxHours: emp.maxHours || 168,
      quarterlyHours,
      maxHoursQuarter: emp.maxHoursQuarter || 504,
    };
  });

  return { title: `Grafik zmian - ${monthName}`, monthName, days, rows };
}
