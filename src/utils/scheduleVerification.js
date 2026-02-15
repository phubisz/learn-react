// Schedule Verification Utility
// All verification rules for Polish labor law compliance

// ─── Helpers ────────────────────────────────────────────────

function formatDateDMY(dateKey) {
  if (!dateKey || typeof dateKey !== 'string') return '??-??-????';
  const parts = dateKey.split('-');
  if (parts.length !== 3) return dateKey;
  const [y, m, d] = parts;
  return `${d}-${m}-${y}`;
}

function toDateKey(date) {
  return date.toISOString().split('T')[0];
}

function getQuarterRange(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3; // 0, 3, 6, 9
  const start = new Date(year, quarterStartMonth, 1);
  const end = new Date(year, quarterStartMonth + 3, 0); // last day of quarter
  return { start, end };
}

function isLastMonthOfQuarter(date) {
  const month = date.getMonth();
  return month % 3 === 2; // months 2, 5, 8, 11
}

function generateDays(startDate, endDate) {
  const days = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push({
      dateKey: toDateKey(current),
      date: new Date(current),
      isSunday: current.getDay() === 0,
      isSaturday: current.getDay() === 6,
    });
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function generateMonthDays(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    return {
      dateKey: toDateKey(d),
      date: d,
      dayNum: i + 1,
      isSunday: d.getDay() === 0,
      isSaturday: d.getDay() === 6,
    };
  });
}

function getShiftStartEnd(shift, dateKey) {
  if (!shift || shift.type === 'leave') return null;

  const startT = shift.startTime || (shift.type === 'day' ? '07:00' : '19:00');
  const endT = shift.endTime || (shift.type === 'day' ? '19:00' : '07:00');

  const shiftStart = new Date(`${dateKey}T${startT}`);
  let shiftEnd = new Date(`${dateKey}T${endT}`);

  if (isNaN(shiftStart.getTime()) || isNaN(shiftEnd.getTime())) return null;

  // Overnight shift: end time is before start time
  if (endT <= startT) {
    shiftEnd.setDate(shiftEnd.getDate() + 1);
  }

  return { start: shiftStart, end: shiftEnd };
}

// ─── Rule 3: Rest between shifts ────────────────────────────

function checkRestBetweenShifts(schedule, employee, days, schedulingRules) {
  const issues = [];
  let previousShiftEnd = null;
  let previousShiftType = null;
  let previousDateKey = null;

  days.forEach((day, index) => {
    const shift = schedule?.[day.dateKey]?.[employee.id];

    if (shift && shift.type !== 'leave') {
      const times = getShiftStartEnd(shift, day.dateKey);
      if (!times) return;

      if (previousShiftEnd) {
        const diffHours = (times.start - previousShiftEnd) / (1000 * 60 * 60);

        let requiredBreak = 11;
        if (previousShiftType === 'night') {
          requiredBreak = Number(schedulingRules?.hoursAfterNight) || 11;
        } else if (previousShiftType === 'day') {
          requiredBreak = Number(schedulingRules?.hoursAfterDay) || 11;
        }

        if (diffHours < requiredBreak && index > 0) {
          issues.push({
            type: 'error',
            issue: 'insufficient_rest',
            employeeId: employee.id,
            dateKeys: [previousDateKey, day.dateKey],
            message: `Brak wymaganego odpoczynku (${requiredBreak}h) dla pracownika ${employee.name}. Odpoczynek wynosił tylko ${diffHours.toFixed(1)}h między ${formatDateDMY(previousDateKey)} a ${formatDateDMY(day.dateKey)}.`,
          });
        }
      }

      previousShiftEnd = times.end;
      previousShiftType = shift.type;
      previousDateKey = day.dateKey;
    } else {
      // No work shift (free or leave) - reset tracker
      previousShiftEnd = null;
      previousShiftType = null;
      previousDateKey = null;
    }
  });

  return issues;
}

// ─── Rule 4: Weekly rest 35h ─────────────────────────────────

function checkWeeklyRest(schedule, employee, quarterRange, schedulingRules) {
  const issues = [];
  const requiredRest = Number(schedulingRules?.weeklyRestHours) || 35;

  const { start: qStart, end: qEnd } = quarterRange;

  // Divide quarter into 7-day periods
  const weekStart = new Date(qStart);
  while (weekStart <= qEnd) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const actualWeekEnd = weekEnd > qEnd ? qEnd : weekEnd;

    // Build sorted list of shift intervals for this employee in this week
    const shifts = [];
    const cursor = new Date(weekStart);
    while (cursor <= actualWeekEnd) {
      const dateKey = toDateKey(cursor);
      const shift = schedule?.[dateKey]?.[employee.id];
      if (shift && shift.type !== 'leave') {
        const times = getShiftStartEnd(shift, dateKey);
        if (times) {
          shifts.push(times);
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    if (shifts.length === 0) {
      // No shifts this week = full rest, skip
      weekStart.setDate(weekStart.getDate() + 7);
      continue;
    }

    // Sort by start time
    shifts.sort((a, b) => a.start - b.start);

    // Calculate maximum continuous rest gap
    const periodStart = new Date(weekStart);
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(actualWeekEnd);
    periodEnd.setHours(23, 59, 59, 999);

    let maxRestHours = 0;

    // Gap before first shift
    const gapBefore = (shifts[0].start - periodStart) / (1000 * 60 * 60);
    if (gapBefore > maxRestHours) maxRestHours = gapBefore;

    // Gaps between shifts
    for (let i = 0; i < shifts.length - 1; i++) {
      const gap = (shifts[i + 1].start - shifts[i].end) / (1000 * 60 * 60);
      if (gap > maxRestHours) maxRestHours = gap;
    }

    // Gap after last shift
    const gapAfter = (periodEnd - shifts[shifts.length - 1].end) / (1000 * 60 * 60);
    if (gapAfter > maxRestHours) maxRestHours = gapAfter;

    if (maxRestHours < requiredRest) {
      const wsKey = toDateKey(weekStart);
      const weKey = toDateKey(actualWeekEnd);
      issues.push({
        type: 'error',
        issue: 'weekly_rest',
        blocking: true,
        employeeId: employee.id,
        dateKeys: [wsKey, weKey],
        message: `Brak wymaganego tygodniowego odpoczynku (${requiredRest}h) dla pracownika ${employee.name} w tygodniu ${formatDateDMY(wsKey)} - ${formatDateDMY(weKey)}. Najdłuższy odpoczynek: ${maxRestHours.toFixed(1)}h.`,
      });
    }

    weekStart.setDate(weekStart.getDate() + 7);
  }

  return issues;
}

// ─── Rule 5: Saturday W5 compensation ────────────────────────

function checkSaturdayCompensation(schedule, employee, quarterRange, currentDate) {
  const issues = [];
  const days = generateDays(quarterRange.start, quarterRange.end);

  let saturdayWorkCount = 0;
  let w5Count = 0;
  const workedSaturdays = [];

  days.forEach((day) => {
    const shift = schedule?.[day.dateKey]?.[employee.id];
    if (!shift) return;

    if (day.isSaturday && shift.type !== 'leave') {
      saturdayWorkCount++;
      workedSaturdays.push(day.dateKey);
    }

    if (shift.id === 'W5') {
      w5Count++;
    }
  });

  if (saturdayWorkCount > w5Count) {
    const missing = saturdayWorkCount - w5Count;
    const lastMonth = isLastMonthOfQuarter(currentDate);
    issues.push({
      type: lastMonth ? 'error' : 'warning',
      issue: 'saturday_compensation',
      blocking: lastMonth,
      employeeId: employee.id,
      dateKeys: workedSaturdays,
      message: `Pracownik ${employee.name} pracował w ${saturdayWorkCount} sobotę/y w kwartale, ale ma tylko ${w5Count} dni W5. Brakuje ${missing} rekompensaty.${lastMonth ? ' (ostatni miesiąc kwartału!)' : ''}`,
    });
  }

  return issues;
}

// ─── Rule 6: Sunday WN compensation ─────────────────────────

function checkSundayCompensation(schedule, employee, monthDays, quarterRange, schedulingRules, currentDate) {
  const issues = [];
  if (!schedulingRules?.sundayRuleEnabled) return issues;

  const range = Number(schedulingRules?.sundayRuleDays) || 6;
  const quarterDays = generateDays(quarterRange.start, quarterRange.end);

  // Find all WN days in the quarter for this employee
  const wnDates = new Set();
  quarterDays.forEach((day) => {
    const shift = schedule?.[day.dateKey]?.[employee.id];
    if (shift && shift.id === 'WN') {
      wnDates.add(day.dateKey);
    }
  });

  // Check each Sunday in the current month
  monthDays.forEach((day) => {
    if (!day.isSunday) return;

    const shift = schedule?.[day.dateKey]?.[employee.id];
    if (!shift || shift.type === 'leave') return; // Not working this Sunday

    // Look for WN within +/- range days
    let wnFoundInRange = false;
    const sundayDate = new Date(day.date);
    for (let offset = -range; offset <= range; offset++) {
      if (offset === 0) continue;
      const checkDate = new Date(sundayDate);
      checkDate.setDate(checkDate.getDate() + offset);
      const checkKey = toDateKey(checkDate);
      if (wnDates.has(checkKey)) {
        wnFoundInRange = true;
        break;
      }
    }

    if (wnFoundInRange) return; // All good

    // Check if WN exists anywhere in the quarter
    const wnFoundInQuarter = wnDates.size > 0;
    const lastMonth = isLastMonthOfQuarter(currentDate);

    if (wnFoundInQuarter) {
      issues.push({
        type: 'warning',
        issue: 'sunday_compensation',
        employeeId: employee.id,
        dateKeys: [day.dateKey],
        message: `Pracownik ${employee.name} pracuje w niedzielę (${formatDateDMY(day.dateKey)}) - brak dnia WN w ciągu +/- ${range} dni. Znaleziono WN w kwartale poza zakresem.`,
      });
    } else {
      issues.push({
        type: lastMonth ? 'error' : 'warning',
        issue: 'sunday_compensation',
        blocking: lastMonth,
        employeeId: employee.id,
        dateKeys: [day.dateKey],
        message: `Pracownik ${employee.name} pracuje w niedzielę (${formatDateDMY(day.dateKey)}) - brak dnia WN w kwartale.${lastMonth ? ' (ostatni miesiąc kwartału!)' : ''}`,
      });
    }
  });

  return issues;
}

// ─── Rule 7: Every 4th Sunday free ──────────────────────────

function checkEveryFourthSundayFree(schedule, employee, currentDate) {
  const issues = [];

  // Gather Sundays from ~4 weeks before current month through end of current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  // Look back 28 days to capture previous Sundays for sliding window
  const lookbackStart = new Date(monthStart);
  lookbackStart.setDate(lookbackStart.getDate() - 28);

  const allDays = generateDays(lookbackStart, monthEnd);
  const sundays = allDays.filter((d) => d.isSunday);

  // For each Sunday, determine if employee is working
  const sundayWork = sundays.map((day) => {
    const shift = schedule?.[day.dateKey]?.[employee.id];
    const isWorking = shift && shift.type !== 'leave';
    return { ...day, isWorking };
  });

  // Sliding window of 4 consecutive Sundays
  for (let i = 0; i <= sundayWork.length - 4; i++) {
    const window = sundayWork.slice(i, i + 4);
    const allWorking = window.every((s) => s.isWorking);

    if (allWorking) {
      // Only flag if the 4th Sunday is in the current month
      const fourthSunday = window[3];
      if (fourthSunday.date >= monthStart && fourthSunday.date <= monthEnd) {
        issues.push({
          type: 'error',
          issue: 'fourth_sunday',
          employeeId: employee.id,
          dateKeys: [fourthSunday.dateKey],
          message: `Pracownik ${employee.name} pracuje 4 kolejne niedziele z rzędu (${formatDateDMY(window[0].dateKey)} - ${formatDateDMY(fourthSunday.dateKey)}). Co najmniej co 4. niedziela musi być wolna.`,
        });
      }
    }
  }

  return issues;
}

// ─── Rule 8: All days must be marked ─────────────────────────

function checkAllDaysMarked(schedule, employee, quarterRange) {
  const issues = [];
  const days = generateDays(quarterRange.start, quarterRange.end);

  const unmarkedDates = [];

  days.forEach((day) => {
    const shift = schedule?.[day.dateKey]?.[employee.id];
    if (!shift) {
      unmarkedDates.push(day.dateKey);
    }
  });

  if (unmarkedDates.length > 0) {
    // Group into ranges for cleaner messages
    if (unmarkedDates.length <= 5) {
      issues.push({
        type: 'warning',
        issue: 'unmarked_day',
        employeeId: employee.id,
        dateKeys: unmarkedDates,
        message: `Pracownik ${employee.name} ma nieprzypisane dni: ${unmarkedDates.map(formatDateDMY).join(', ')}.`,
      });
    } else {
      issues.push({
        type: 'warning',
        issue: 'unmarked_day',
        employeeId: employee.id,
        dateKeys: unmarkedDates,
        message: `Pracownik ${employee.name} ma ${unmarkedDates.length} nieprzypisanych dni w kwartale (np. ${unmarkedDates.slice(0, 3).map(formatDateDMY).join(', ')}...).`,
      });
    }
  }

  return issues;
}

// ─── Max hours check ─────────────────────────────────────────

function checkMaxHours(schedule, employee, days) {
  const issues = [];
  let totalHours = 0;

  days.forEach((day) => {
    const shift = schedule?.[day.dateKey]?.[employee.id];
    if (shift && shift.type !== 'leave') {
      totalHours += Number(shift.hours || 0);
    }
  });

  const max = employee.maxHours || 168;
  if (totalHours > max) {
    issues.push({
      type: 'error',
      issue: 'max_hours',
      employeeId: employee.id,
      dateKeys: [],
      message: `Przekroczony limit godzin dla pracownika ${employee.name}: ${totalHours}/${max}h.`,
    });
  }

  return issues;
}

// ─── Main verification function ──────────────────────────────

export function verifySchedule({ schedule, employees, currentDate, schedulingRules }) {
  const issues = [];

  if (!employees || !Array.isArray(employees)) {
    issues.push({ type: 'error', message: 'Brak listy pracowników do weryfikacji.' });
    return issues;
  }

  const monthDays = generateMonthDays(currentDate);
  const quarterRange = getQuarterRange(currentDate);

  employees.forEach((emp) => {
    if (!emp || !emp.id) return;

    // Rule 3: Rest between shifts (check current month)
    issues.push(...checkRestBetweenShifts(schedule, emp, monthDays, schedulingRules));

    // Max hours (current month)
    issues.push(...checkMaxHours(schedule, emp, monthDays));

    // Rule 4: Weekly rest 35h (quarter-wide)
    issues.push(...checkWeeklyRest(schedule, emp, quarterRange, schedulingRules));

    // Rule 5: Saturday W5 compensation (quarter-wide)
    if (schedulingRules?.saturdayCompensation !== false) {
      issues.push(...checkSaturdayCompensation(schedule, emp, quarterRange, currentDate));
    }

    // Rule 6: Sunday WN compensation (current month, checks quarter for WN)
    if (schedulingRules?.sundayCompensationStrict !== false) {
      issues.push(...checkSundayCompensation(schedule, emp, monthDays, quarterRange, schedulingRules, currentDate));
    }

    // Rule 7: Every 4th Sunday free
    if (schedulingRules?.fourthSundayRule !== false) {
      issues.push(...checkEveryFourthSundayFree(schedule, emp, currentDate));
    }

    // Rule 8: All days marked (quarter-wide)
    if (schedulingRules?.checkUnmarkedDays !== false) {
      issues.push(...checkAllDaysMarked(schedule, emp, quarterRange));
    }
  });

  if (issues.length === 0) {
    issues.push({ type: 'success', message: 'Weryfikacja zakończona pomyślnie. Brak błędów.' });
  }

  return issues;
}
