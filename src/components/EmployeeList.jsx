import { useState, memo } from 'react';

const EmployeeList = memo(({ employees, onAddEmployee, onRemoveEmployee, onUpdateEmployee }) => {
    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [maxHours, setMaxHours] = useState(168);
    const [maxHoursQuarter, setMaxHoursQuarter] = useState(504);

    const handleAddClick = () => {
        if (!newEmployeeName || newEmployeeName.trim() === '') return;
        if (onAddEmployee) {
            onAddEmployee(newEmployeeName.trim(), maxHours, maxHoursQuarter);
        }
        setNewEmployeeName('');
        setMaxHours(168);
        setMaxHoursQuarter(504);
    };

    return (
        <div className="employee-list">
            <h2>Pracownicy</h2>
            <div className="add-employee-form">
                <input
                    type="text"
                    placeholder="Imię i Nazwisko"
                    value={newEmployeeName}
                    onChange={(e) => setNewEmployeeName(e.target.value)}
                    className="name-input"
                />
                <div className="hours-input-group">
                    <label>Max mies.:</label>
                    <input
                        type="number"
                        value={maxHours}
                        onChange={(e) => setMaxHours(Number(e.target.value))}
                        className="hours-input"
                    />
                </div>
                <div className="hours-input-group">
                    <label>Max kwart.:</label>
                    <input
                        type="number"
                        value={maxHoursQuarter}
                        onChange={(e) => setMaxHoursQuarter(Number(e.target.value))}
                        className="hours-input"
                    />
                </div>
                <button onClick={handleAddClick} className="add-btn">Dodaj</button>
            </div>

            <ul className="employees-ul">
                {(employees || []).map(emp => {
                    if (!emp || !emp.id) return null;

                    return (
                        <li key={emp.id} className="employee-li">
                            <span className="emp-name">{emp?.name || 'Unknown'}</span>
                            <div className="emp-limit-edit" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <label style={{ fontSize: '0.85em', color: '#666' }}>Mies.:</label>
                                    <input
                                        type="number"
                                        value={emp?.maxHours || 168}
                                        onChange={(e) => onUpdateEmployee?.(emp.id, 'maxHours', Number(e?.target?.value || 168))}
                                        style={{ width: '55px', padding: '2px' }}
                                        min="0"
                                        max="744"
                                    />
                                    <span style={{ fontSize: '0.85em' }}>h</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <label style={{ fontSize: '0.85em', color: '#666' }}>Kwart.:</label>
                                    <input
                                        type="number"
                                        value={emp?.maxHoursQuarter || 504}
                                        onChange={(e) => onUpdateEmployee?.(emp.id, 'maxHoursQuarter', Number(e?.target?.value || 504))}
                                        style={{ width: '55px', padding: '2px' }}
                                        min="0"
                                        max="2232"
                                    />
                                    <span style={{ fontSize: '0.85em' }}>h</span>
                                </div>
                            </div>
                            <button onClick={() => onRemoveEmployee?.(emp.id)} className="remove-btn">Usuń</button>
                        </li>
                    );
                })}
            </ul>

        </div>
    );
});

export default EmployeeList;
