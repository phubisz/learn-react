import React, { useRef, memo } from 'react';

const DataControls = memo(({ onExport, onImport, onVerifySchedule, onClearSchedule }) => {
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.name.endsWith('.json')) {
            alert('Błąd: Wybierz plik JSON (.json)');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Błąd: Plik jest za duży (maksymalnie 10MB)');
            return;
        }

        const reader = new FileReader();

        reader.onerror = () => {
            alert('Błąd podczas wczytywania pliku. Spróbuj ponownie.');
            console.error('FileReader error:', reader.error);
        };

        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                onImport(data);
                alert('Dane zostały pomyślnie zaimportowane!');
            } catch (error) {
                alert('Błąd: Nieprawidłowy format pliku JSON. Sprawdź czy plik nie jest uszkodzony.');
                console.error('JSON parse error:', error);
            }
        };

        reader.readAsText(file);

        // Reset input so the same file can be selected again
        e.target.value = '';
    };

    return (
        <div className="data-controls">
            <div className="left-controls">
                <button onClick={onClearSchedule} className="clear-btn">🗑️ Clear</button>
                <button onClick={onVerifySchedule} className="verify-btn">✅ Zweryfikuj</button>
            </div>
            <div className="file-actions">
                <button onClick={onExport} className="export-btn">💾 Save to File</button>
                <button onClick={() => fileInputRef.current.click()} className="import-btn">📂 Load from File</button>
            </div>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".json"
                onChange={handleFileChange}
            />

        </div>
    );
});

export default DataControls;
