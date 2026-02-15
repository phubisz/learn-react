import React, { memo, useState } from 'react';

const SchedulingRules = memo(({ rules, onUpdateRules, bankHolidays, onUpdateHolidays }) => {
    const [newHolidayDate, setNewHolidayDate] = useState('');
    const [newHolidayName, setNewHolidayName] = useState('');

    const handleChange = (field, value) => {
        if (!field || !onUpdateRules) return;

        // value needs to be a number, default to 0 if empty
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue >= 0) {
            onUpdateRules({ ...rules, [field]: numValue });
        }
        // Silently ignore invalid values during typing
    };

    const handleAddHoliday = () => {
        if (!newHolidayDate || !newHolidayName.trim()) return;
        const exists = bankHolidays?.some(h => h.date === newHolidayDate);
        if (exists) return;
        const updated = [...(bankHolidays || []), { date: newHolidayDate, name: newHolidayName.trim() }];
        updated.sort((a, b) => a.date.localeCompare(b.date));
        onUpdateHolidays(updated);
        setNewHolidayDate('');
        setNewHolidayName('');
    };

    const handleRemoveHoliday = (date) => {
        onUpdateHolidays((bankHolidays || []).filter(h => h.date !== date));
    };

    const formatDateDMY = (dateStr) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}.${m}.${y}`;
    };

    return (
        <div className="rules-container">
            <h3>Zasady Grafikowania</h3>
            <p className="description">
                Określ minimalne wymagane przerwy po różnych typach zmian.
                Automat spróbuje uwzględnić te reguły przy generowaniu grafiku.
            </p>

            <div className="rule-item">
                <label>Minimalna przerwa po zmianie DZIENNEJ (godziny):</label>
                <input
                    type="number"
                    value={rules?.hoursAfterDay ?? 24}
                    onChange={(e) => handleChange('hoursAfterDay', e?.target?.value)}
                    min="0"
                    max="168"
                />
            </div>

            <div className="rule-item">
                <label>Minimalna przerwa po zmianie NOCNEJ (godziny):</label>
                <input
                    type="number"
                    value={rules?.hoursAfterNight ?? 48}
                    onChange={(e) => handleChange('hoursAfterNight', e?.target?.value)}
                    min="0"
                    max="168"
                />
            </div>

            <hr className="rule-divider" />

            <div className="rule-item checkbox-item">
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={rules?.sundayRuleEnabled ?? true}
                        onChange={(e) => onUpdateRules?.({ ...rules, sundayRuleEnabled: e?.target?.checked ?? true })}
                    />
                    Zasada wolnej niedzieli (wymagany dzień wolny)
                </label>
            </div>

            {(rules?.sundayRuleEnabled ?? true) && (
                <div className="rule-item nested">
                    <label>Wymagany dzień wolny (WN) w ciągu +/- dni:</label>
                    <input
                        type="number"
                        value={rules?.sundayRuleDays ?? 6}
                        onChange={(e) => handleChange('sundayRuleDays', e?.target?.value)}
                        min="1"
                        max="31"
                    />
                </div>
            )}

            <hr className="rule-divider" />

            <div className="rule-item">
                <label>Minimalny tygodniowy odpoczynek ciągły (godziny):</label>
                <input
                    type="number"
                    value={rules?.weeklyRestHours ?? 35}
                    onChange={(e) => handleChange('weeklyRestHours', e?.target?.value)}
                    min="24"
                    max="168"
                />
                <span className="rule-hint">Tydzień liczony od początku kwartału (1.01, 1.04, 1.07, 1.10)</span>
            </div>

            <hr className="rule-divider" />

            <div className="rule-item checkbox-item">
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={rules?.saturdayCompensation ?? true}
                        onChange={(e) => onUpdateRules?.({ ...rules, saturdayCompensation: e?.target?.checked ?? true })}
                    />
                    Rekompensata za pracę w sobotę (W5)
                </label>
            </div>

            <div className="rule-item checkbox-item">
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={rules?.sundayCompensationStrict ?? true}
                        onChange={(e) => onUpdateRules?.({ ...rules, sundayCompensationStrict: e?.target?.checked ?? true })}
                    />
                    Ścisła rekompensata za niedzielę (wymaga oznaczenia WN)
                </label>
            </div>

            <div className="rule-item checkbox-item">
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={rules?.fourthSundayRule ?? true}
                        onChange={(e) => onUpdateRules?.({ ...rules, fourthSundayRule: e?.target?.checked ?? true })}
                    />
                    Co 4. niedziela wolna
                </label>
            </div>

            <div className="rule-item checkbox-item">
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={rules?.checkUnmarkedDays ?? true}
                        onChange={(e) => onUpdateRules?.({ ...rules, checkUnmarkedDays: e?.target?.checked ?? true })}
                    />
                    Sprawdzaj nieoznaczone dni (każdy dzień musi mieć przypisaną zmianę lub wolne)
                </label>
            </div>

            <hr className="rule-divider" />

            <h3>Dni ustawowo wolne od pracy</h3>
            <p className="description">
                Zarządzaj listą świąt państwowych. Dni te będą oznaczone na grafiku.
            </p>

            <div className="holiday-add-form">
                <input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="holiday-date-input"
                />
                <input
                    type="text"
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    placeholder="Nazwa święta"
                    className="holiday-name-input"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddHoliday()}
                />
                <button onClick={handleAddHoliday} className="add-btn">Dodaj</button>
            </div>

            <ul className="holidays-list">
                {(bankHolidays || []).map(h => (
                    <li key={h.date} className="holiday-item">
                        <span className="holiday-date">{formatDateDMY(h.date)}</span>
                        <span className="holiday-name">{h.name}</span>
                        <button
                            className="remove-btn"
                            onClick={() => handleRemoveHoliday(h.date)}
                        >
                            Usuń
                        </button>
                    </li>
                ))}
                {(!bankHolidays || bankHolidays.length === 0) && (
                    <li className="holiday-item empty">Brak zdefiniowanych świąt.</li>
                )}
            </ul>

        </div>
    );
});

export default SchedulingRules;
