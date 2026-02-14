import React from 'react';

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

    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i);
        days.push({
            dateKey: formatDate(date),
            dayNum: i,
            dayName: getPolishDayName(date),
            isWeekend: date.getDay() === 0 || date.getDay() === 6
        });
    }

    // Capitalize first letter of month in Polish (e.g., "listopad 2023" -> "Listopad 2023")
    const monthNameRaw = currentDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
    const monthName = monthNameRaw.charAt(0).toUpperCase() + monthNameRaw.slice(1);

    const getShiftStyle = (shift) => {
        if (!shift) return {};
        if (shift.type === 'day') return { backgroundColor: '#fffacd', borderColor: '#ffd700', color: '#d4a017' };
        if (shift.type === 'night') return { backgroundColor: '#e6e6fa', borderColor: '#9370db', color: '#483d8b' };
        if (shift.type === 'leave') return { backgroundColor: '#e0e0e0', borderColor: '#bdbdbd', color: '#555' };
        return {};
    };

    const sortedEmployees = [...employees].sort((a, b) => a.name.localeCompare(b.name));
    const issueKeySet = new Set();
    const issueMessageMap = new Map();

    if (issues && issues.length > 0) {
        issues.forEach((issue) => {
            if (!issue || issue.type !== 'error') return;
            if (!issue.employeeId || !issue.dateKeys) return;
            issue.dateKeys.forEach((dateKey) => {
                const key = `${dateKey}-${issue.employeeId}`;
                issueKeySet.add(key);
                if (!issueMessageMap.has(key)) {
                    issueMessageMap.set(key, []);
                }
                issueMessageMap.get(key).push(issue.message);
            });
        });
    }

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
                    // Calculate total hours for this employee in the current month
                    let totalHours = 0;
                    days.forEach(day => {
                        const dateKey = day.dateKey;
                        const shift = schedule[dateKey]?.[employee.id];
                        if (shift) {
                            totalHours += Number(shift.hours || 0);
                        }
                    });

                    const max = employee.maxHours || 168;
                    const isOverLimit = totalHours > max;

                    return (
                        <React.Fragment key={employee.id}>
                            <div className="employee-cell">
                                <div className="emp-name">{employee.name}</div>
                                <div className={`emp-stats ${isOverLimit ? 'over-limit' : ''}`}>
                                    {totalHours} / {max}h
                                </div>

                            </div>
                            {days.map(day => {
                                const dateKey = day.dateKey;
                                const shift = schedule[dateKey] ? schedule[dateKey][employee.id] : null;

                                const issueKey = `${dateKey}-${employee.id}`;
                                const isIssue = issueKeySet.has(issueKey);
                                const issueMessage = isIssue ? issueMessageMap.get(issueKey)?.join('\n') : '';

                                return (
                                    <div key={`${dateKey}-${employee.id}`} className={`shift-cell ${day.isWeekend ? 'weekend-cell' : ''}`}>
                                        <button
                                            className={`shift-button ${shift ? shift.type : ''} ${isIssue ? 'issue' : ''}`}
                                            onClick={() => onApplyShift(dateKey, employee.id)}
                                            title={shift ? (shift.type === 'leave' ? shift.title : `${shift.name} (${shift.startTime}-${shift.endTime})`) : 'Assign Shift'}
                                        >
                                            {shift ? (
                                                shift.type === 'leave' ? (
                                                    <div className="shift-symbol">{shift.name}</div>
                                                ) : (
                                                    <>
                                                        <div className="shift-times">
                                                            <span>{shift.startTime || (shift.type === 'day' ? '07:00' : '19:00')}</span>
                                                            <span>{shift.endTime || (shift.type === 'day' ? '19:00' : '07:00')}</span>
                                                        </div>
                                                        <div className="shift-hours-sm">{shift.hours}</div>
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
