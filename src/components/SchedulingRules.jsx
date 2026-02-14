import React from 'react';

const SchedulingRules = ({ rules, onUpdateRules }) => {
    const handleChange = (field, value) => {
        // value needs to be a number, default to 0 if empty
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue >= 0) {
            onUpdateRules({ ...rules, [field]: numValue });
        } else if (value === '') {
            // allow empty string during typing, but handled by state typically staying valid or validating on blur
            // simple approach: just don't update if invalid, or default 0
            // Let's stick to valid positive numbers
        }
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
                    value={rules.hoursAfterDay}
                    onChange={(e) => handleChange('hoursAfterDay', e.target.value)}
                    min="0"
                />
            </div>

            <div className="rule-item">
                <label>Minimalna przerwa po zmianie NOCNEJ (godziny):</label>
                <input
                    type="number"
                    value={rules.hoursAfterNight}
                    onChange={(e) => handleChange('hoursAfterNight', e.target.value)}
                    min="0"
                />
            </div>

            <hr className="rule-divider" />

            <div className="rule-item checkbox-item">
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={rules.sundayRuleEnabled ?? true}
                        onChange={(e) => onUpdateRules({ ...rules, sundayRuleEnabled: e.target.checked })}
                    />
                    Zasada wolnej niedzieli (wymagany dzień wolny)
                </label>
            </div>

            {(rules.sundayRuleEnabled ?? true) && (
                <div className="rule-item nested">
                    <label>Wymagany dzień wolny w ciągu +/- dni:</label>
                    <input
                        type="number"
                        value={rules.sundayRuleDays ?? 6}
                        onChange={(e) => handleChange('sundayRuleDays', e.target.value)}
                        min="1"
                    />
                </div>
            )}

        </div>
    );
};

export default SchedulingRules;
