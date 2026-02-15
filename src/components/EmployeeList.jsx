import { useState, memo } from 'react';

const EmployeeList = memo(({ employees, onAddEmployee, onRemoveEmployee, onUpdateEmployee }) => {
    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [maxHours, setMaxHours] = useState(168);

    const handleAddClick = () => {
        if (!newEmployeeName || newEmployeeName.trim() === '') return;
        if (onAddEmployee) {
            onAddEmployee(newEmployeeName.trim(), maxHours);
        }
        setNewEmployeeName('');
        setMaxHours(168);
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
                    <label>Max godz:</label>
                    <input
                        type="number"
                        value={maxHours}
                        onChange={(e) => setMaxHours(Number(e.target.value))}
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
                            <div className="emp-limit-edit" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <label style={{ fontSize: '0.9em' }}>Max:</label>
                                <input
                                    type="number"
                                    value={emp?.maxHours || 168}
                                    onChange={(e) => onUpdateEmployee?.(emp.id, 'maxHours', Number(e?.target?.value || 168))}
                                    style={{ width: '60px', padding: '2px' }}
                                    min="0"
                                    max="744"
                                />
                                <span>h</span>
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
