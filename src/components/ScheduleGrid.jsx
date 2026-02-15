import React, { useMemo } from 'react';

const ScheduleGrid = ({ employees, schedule, onApplyShift, currentDate, onPrevMonth, onNextMonth, issues, bankHolidays }) => {
    // Helper to format date as YYYY-MM-DD
    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    // Generate days for the current month
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Helper for Polish day names
    const getPolishDayName = (date) => {
        const days = ['Nie', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'So'];
        return days[date.getDay()];
    };

    // Memoize days array - only recalculate when month changes
    const days = useMemo(() => {
        const result = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            result.push({
                dateKey: formatDate(date),
                dayNum: i,
                dayName: getPolishDayName(date),
                isWeekend: date.getDay() === 0 || date.getDay() === 6
            });
        }
        return result;
    }, [year, month, daysInMonth]);

    // Memoize holiday lookup - set of dateKeys that are bank holidays
    const holidayMap = useMemo(() => {
        const map = new Map();
        if (bankHolidays && bankHolidays.length > 0) {
            bankHolidays.forEach(h => {
                if (h.date) map.set(h.date, h.name);
            });
        }
        return map;
    }, [bankHolidays]);

    // Memoize month name - only recalculate when currentDate changes
    const monthName = useMemo(() => {
        const monthNameRaw = currentDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
        return monthNameRaw.charAt(0).toUpperCase() + monthNameRaw.slice(1);
    }, [currentDate]);

    // Memoize sorted employees - only resort when employees array changes
    const sortedEmployees = useMemo(() => {
        return [...employees].sort((a, b) => a.name.localeCompare(b.name));
    }, [employees]);

    // Memoize issue maps - only recalculate when issues change
    const { errorKeySet, warningKeySet, issueMessageMap } = useMemo(() => {
        const errorSet = new Set();
        const warningSet = new Set();
        const messageMap = new Map();

        if (issues && issues.length > 0) {
            issues.forEach((issue) => {
                if (!issue || !issue.employeeId || !issue.dateKeys) return;
                if (issue.type !== 'error' && issue.type !== 'warning') return;
                issue.dateKeys.forEach((dateKey) => {
                    const key = `${dateKey}-${issue.employeeId}`;
                    if (issue.type === 'error') {
                        errorSet.add(key);
                    } else {
                        warningSet.add(key);
                    }
                    if (!messageMap.has(key)) {
                        messageMap.set(key, []);
                    }
                    messageMap.get(key).push(issue.message);
                });
            });
        }

        return { errorKeySet: errorSet, warningKeySet: warningSet, issueMessageMap: messageMap };
    }, [issues]);

    // Quarter date range for quarterly hours calculation
    const quarterDays = useMemo(() => {
        const quarterStartMonth = Math.floor(month / 3) * 3;
        const qStart = new Date(year, quarterStartMonth, 1);
        const qEnd = new Date(year, quarterStartMonth + 3, 0);
        const result = [];
        const cursor = new Date(qStart);
        while (cursor <= qEnd) {
            const y2 = cursor.getFullYear();
            const m2 = String(cursor.getMonth() + 1).padStart(2, '0');
            const d2 = String(cursor.getDate()).padStart(2, '0');
            result.push(`${y2}-${m2}-${d2}`);
            cursor.setDate(cursor.getDate() + 1);
        }
        return result;
    }, [year, month]);

    // Memoize total hours calculation for all employees (monthly + quarterly)
    const employeeHoursMap = useMemo(() => {
        const hoursMap = new Map();

        sortedEmployees.forEach(employee => {
            let monthlyHours = 0;
            days.forEach(day => {
                const shift = schedule[day.dateKey]?.[employee.id];
                if (shift && shift.type !== 'leave') {
                    monthlyHours += Number(shift.hours || 0);
                }
            });

            let quarterlyHours = 0;
            quarterDays.forEach(dk => {
                const shift = schedule[dk]?.[employee.id];
                if (shift && shift.type !== 'leave') {
                    quarterlyHours += Number(shift.hours || 0);
                }
            });

            hoursMap.set(employee.id, { monthlyHours, quarterlyHours });
        });

        return hoursMap;
    }, [schedule, days, quarterDays, sortedEmployees]);

    return (
        <div className="schedule-grid">
            <div className="month-header">
                <button onClick={onPrevMonth}>&lt;</button>
                <h2>{monthName}</h2>
                <button onClick={onNextMonth}>&gt;</button>
            </div>

            <div className="grid-container" style={{ gridTemplateColumns: `150px repeat(${daysInMonth}, 1fr)` }}>
                {/* Header Row */}
                <div className="header-cell">Pracownik</div>
                {days.map(day => {
                    const isHoliday = holidayMap.has(day.dateKey);
                    const holidayName = isHoliday ? holidayMap.get(day.dateKey) : '';
                    return (
                        <div
                            key={day.dateKey}
                            className={`header-cell ${day.isWeekend ? 'weekend' : ''} ${isHoliday ? 'holiday' : ''}`}
                            title={holidayName}
                        >
                            <div>{day.dayNum}</div>
                            <div className="day-name">{day.dayName}</div>
                        </div>
                    );
                })}

                {sortedEmployees.map(employee => {
                    // Get pre-calculated total hours from memoized map
                    const hours = employeeHoursMap.get(employee.id) || { monthlyHours: 0, quarterlyHours: 0 };
                    const maxMonth = employee.maxHours || 168;
                    const maxQuarter = employee.maxHoursQuarter || 504;
                    const isOverMonth = hours.monthlyHours > maxMonth;
                    const isOverQuarter = hours.quarterlyHours > maxQuarter;

                    return (
                        <React.Fragment key={employee.id}>
                            <div className="employee-cell">
                                <div className="emp-name">{employee?.name || 'Unknown'}</div>
                                <div className={`emp-stats ${isOverMonth ? 'over-limit' : ''}`} title="Godziny w miesiącu">
                                    M: {hours.monthlyHours}/{maxMonth}h
                                </div>
                                <div className={`emp-stats quarter-stats ${isOverQuarter ? 'over-limit' : ''}`} title="Godziny w kwartale">
                                    K: {hours.quarterlyHours}/{maxQuarter}h
                                </div>
                            </div>
                            {days.map(day => {
                                const dateKey = day?.dateKey;
                                if (!dateKey) return null;

                                const shift = schedule?.[dateKey]?.[employee.id] || null;

                                const issueKey = `${dateKey}-${employee.id}`;
                                const isError = errorKeySet.has(issueKey);
                                const isWarning = warningKeySet.has(issueKey);
                                const hasIssue = isError || isWarning;
                                const issueMessage = hasIssue ? issueMessageMap.get(issueKey)?.join('\n') : '';

                                // Safe shift property access with fallbacks
                                const shiftTitle = shift?.type === 'leave'
                                    ? (shift?.title || shift?.name || 'Leave')
                                    : `${shift?.name || 'Shift'} (${shift?.startTime || '??:??'}-${shift?.endTime || '??:??'})`;

                                const isCellHoliday = holidayMap.has(dateKey);

                                return (
                                    <div key={`${dateKey}-${employee.id}`} className={`shift-cell ${day?.isWeekend ? 'weekend-cell' : ''} ${isCellHoliday ? 'holiday-cell' : ''}`}>
                                        <button
                                            className={`shift-button ${shift?.type || ''} ${isError ? 'issue' : ''} ${isWarning ? 'warning' : ''}`}
                                            onClick={() => onApplyShift(dateKey, employee.id)}
                                            title={shift ? shiftTitle : 'Assign Shift'}
                                        >
                                            {shift ? (
                                                shift.type === 'leave' ? (
                                                    <div className="shift-symbol">{shift?.name || shift?.symbol || '?'}</div>
                                                ) : (
                                                    <>
                                                        <div className="shift-times">
                                                            <span>{shift?.startTime || (shift?.type === 'day' ? '07:00' : '19:00')}</span>
                                                            <span>{shift?.endTime || (shift?.type === 'day' ? '19:00' : '07:00')}</span>
                                                        </div>
                                                        <div className="shift-hours-sm">{shift?.hours || 0}</div>
                                                    </>
                                                )
                                            ) : ''}
                                        </button>
                                        {hasIssue && (
                                            <span className={`issue-badge ${isWarning && !isError ? 'warning-badge' : ''}`} data-issue={issueMessage} aria-label={issueMessage} role="note">
                                                {isError ? '!' : '?'}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    );
                })}
            </div>

        </div >
    );
};

export default ScheduleGrid;
