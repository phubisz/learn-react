import React, { useState, memo } from 'react';

const BatchApply = memo(({ employees, leaveTypes, shiftTemplates, onApplyBatch }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [employeeId, setEmployeeId] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [templateId, setTemplateId] = useState('');

    const allTemplates = [
        ...(shiftTemplates || []).map(t => ({ id: t.id, label: `${t.name} (${t.startTime}-${t.endTime})`, data: t })),
        ...(leaveTypes || []).map(l => ({ id: l.id, label: `${l.symbol} - ${l.title}`, data: l })),
    ];

    const handleApply = () => {
        if (!employeeId || !dateFrom || !dateTo || !templateId) return;

        const template = allTemplates.find(t => String(t.id) === String(templateId));
        if (!template) return;

        // Generate all dates in range
        const start = new Date(dateFrom);
        const end = new Date(dateTo);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return;

        const dateKeys = [];
        const cursor = new Date(start);
        while (cursor <= end) {
            dateKeys.push(cursor.toISOString().split('T')[0]);
            cursor.setDate(cursor.getDate() + 1);
        }

        onApplyBatch(dateKeys, Number(employeeId) || employeeId, template.data);

        // Reset form
        setDateFrom('');
        setDateTo('');
    };

    const sortedEmployees = [...(employees || [])].sort((a, b) => a.name.localeCompare(b.name));

    if (!isOpen) {
        return (
            <button className="batch-toggle-btn" onClick={() => setIsOpen(true)}>
                Zastosuj zbiorczo (urlopy, chorobowe...)
            </button>
        );
    }

    return (
        <div className="batch-apply-panel">
            <div className="batch-header">
                <h4>Zbiorcze przypisanie</h4>
                <button className="batch-close" onClick={() => setIsOpen(false)}>✕</button>
            </div>
            <div className="batch-form">
                <div className="batch-row">
                    <div className="batch-field">
                        <label>Pracownik</label>
                        <select
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                        >
                            <option value="">-- Wybierz --</option>
                            {sortedEmployees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="batch-field">
                        <label>Typ</label>
                        <select
                            value={templateId}
                            onChange={(e) => setTemplateId(e.target.value)}
                        >
                            <option value="">-- Wybierz --</option>
                            <optgroup label="Zmiany">
                                {(shiftTemplates || []).map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.name} ({t.startTime}-{t.endTime})
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="Dni wolne / Urlopy">
                                {(leaveTypes || []).map(l => (
                                    <option key={l.id} value={l.id}>
                                        {l.symbol} - {l.title}
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                    </div>
                </div>
                <div className="batch-row">
                    <div className="batch-field">
                        <label>Od</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </div>
                    <div className="batch-field">
                        <label>Do</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>
                    <button
                        className="batch-apply-btn"
                        onClick={handleApply}
                        disabled={!employeeId || !dateFrom || !dateTo || !templateId}
                    >
                        Zastosuj
                    </button>
                </div>
            </div>
        </div>
    );
});

export default BatchApply;
