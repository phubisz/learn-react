import React, { useRef } from 'react';

const DataControls = ({ onExport, onImport, onVerifySchedule, onClearSchedule }) => {
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    onImport(data);
                } catch (error) {
                    alert('Error parsing JSON file');
                    console.error(error);
                }
            };
            reader.readAsText(file);
        }
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
};

export default DataControls;
