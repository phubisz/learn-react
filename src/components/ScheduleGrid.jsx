import React, { useMemo } from 'react';

const ScheduleGrid = ({ employees, schedule, onApplyShift, currentDate, onPrevMonth, onNextMonth, issues }) => {
    // Helper to format date as YYYY-MM-DD
    const formatDate = (date) => {
        return date.toISOString().split('T')[0];
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
    const { issueKeySet, issueMessageMap } = useMemo(() => {
        const keySet = new Set();
        const messageMap = new Map();

        if (issues && issues.length > 0) {
            issues.forEach((issue) => {
                if (!issue || issue.type !== 'error') return;
                if (!issue.employeeId || !issue.dateKeys) return;
                issue.dateKeys.forEach((dateKey) => {
                    const key = `${dateKey}-${issue.employeeId}`;
                    keySet.add(key);
                    if (!messageMap.has(key)) {
                        messageMap.set(key, []);
                    }
                    messageMap.get(key).push(issue.message);
                });
            });
        }

        return { issueKeySet: keySet, issueMessageMap: messageMap };
    }, [issues]);

    // Memoize total hours calculation for all employees - only recalculate when schedule or days change
    const employeeHoursMap = useMemo(() => {
        const hoursMap = new Map();

        sortedEmployees.forEach(employee => {
            let totalHours = 0;
            days.forEach(day => {
                const shift = schedule[day.dateKey]?.[employee.id];
                if (shift && shift.type !== 'leave') {
                    totalHours += Number(shift.hours || 0);
                }
            });
            hoursMap.set(employee.id, totalHours);
        });

        return hoursMap;
    }, [schedule, days, sortedEmployees]);

    return (
        <div className="schedule-grid">
            <div className="month-header">
                <button onClick={onPrevMonth}>&lt;</button>
                <h2>{monthName}</h2>
                <button onClick={onNextMonth}>&gt;</button>
            </div>

            <div className="grid-container" style={{ gridTemplateColumns: `150px repeat(${daysInMonth}, 1fr)` }}>
                {/* Header Row */}
                <div className="header-cell">Employee</div>
                {days.map(day => (
                    <div key={day.dateKey} className={`header-cell ${day.isWeekend ? 'weekend' : ''}`}>
                        <div>{day.dayNum}</div>
                        <div className="day-name">{day.dayName}</div>
                    </div>
                ))}

                {sortedEmployees.map(employee => {
                    // Get pre-calculated total hours from memoized map
                    const totalHours = employeeHoursMap.get(employee.id) || 0;
                    const max = employee.maxHours || 168;
                    const isOverLimit = totalHours > max;

                    return (
                        <React.Fragment key={employee.id}>
                            <div className="employee-cell">
                                <div className="emp-name">{employee?.name || 'Unknown'}</div>
                                <div className={`emp-stats ${isOverLimit ? 'over-limit' : ''}`}>
                                    {totalHours} / {max}h
                                </div>

                            </div>
                            {days.map(day => {
                                const dateKey = day?.dateKey;
                                if (!dateKey) return null;

                                const shift = schedule?.[dateKey]?.[employee.id] || null;

                                const issueKey = `${dateKey}-${employee.id}`;
                                const isIssue = issueKeySet.has(issueKey);
                                const issueMessage = isIssue ? issueMessageMap.get(issueKey)?.join('\n') : '';

                                // Safe shift property access with fallbacks
                                const shiftTitle = shift?.type === 'leave'
                                    ? (shift?.title || shift?.name || 'Leave')
                                    : `${shift?.name || 'Shift'} (${shift?.startTime || '??:??'}-${shift?.endTime || '??:??'})`;

                                return (
                                    <div key={`${dateKey}-${employee.id}`} className={`shift-cell ${day?.isWeekend ? 'weekend-cell' : ''}`}>
                                        <button
                                            className={`shift-button ${shift?.type || ''} ${isIssue ? 'issue' : ''}`}
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
                                        {isIssue && (
                                            <span className="issue-badge" data-issue={issueMessage} aria-label={issueMessage} role="note">
                                                i
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
