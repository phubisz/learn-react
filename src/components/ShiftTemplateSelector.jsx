import { useState, useMemo } from 'react';

// TimeSelect component - defined outside to avoid re-creation on each render
const TimeSelect = ({ label, value, onChange }) => {
    const parts = value && typeof value === 'string' ? value.split(':') : ['07', '00'];
    const [hours = '07', minutes = '00'] = parts;

    const handleHourChange = (e) => {
        if (onChange) {
            onChange(`${e?.target?.value || '07'}:${minutes}`);
        }
    };

    const handleMinuteChange = (e) => {
        if (onChange) {
            onChange(`${hours}:${e?.target?.value || '00'}`);
        }
    };

    return (
        <div className="input-group">
            <label>{label}</label>
            <div className="time-select-container">
                <select value={hours} onChange={handleHourChange} className="time-select">
                    {Array.from({ length: 24 }, (_, i) => {
                        const h = i.toString().padStart(2, '0');
                        return <option key={h} value={h}>{h}</option>;
                    })}
                </select>
                <span className="time-separator">:</span>
                <select value={minutes} onChange={handleMinuteChange} className="time-select">
                    {['00', '15', '30', '45'].map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

const ShiftTemplateSelector = ({ templates, leaveTypes, selectedTemplate, onSelectTemplate, onAddTemplate, onUpdateTemplate, onDeleteTemplate }) => {
    // Default 12h day shift
    const [templateForm, setTemplateForm] = useState({ name: '', type: 'day', startTime: '07:00', endTime: '19:00' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const calculateDuration = (start, end) => {
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);

        let diff = (endH * 60 + endM) - (startH * 60 + startM);
        if (diff < 0) diff += 24 * 60; // Overnight

        return Number((diff / 60).toFixed(2)); // Return hours
    };

    const handleOpenAdd = () => {
        setTemplateForm({ name: '', type: 'day', startTime: '07:00', endTime: '19:00' });
        setEditingId(null);
        setIsModalOpen(true);
    };

    const handleDoubleClick = (template) => {
        if (!template) return;

        // If template doesn't have start/end (migrating old ones), default them
        setTemplateForm({
            name: template?.name || '',
            type: template?.type || 'day',
            startTime: template?.startTime || '07:00',
            endTime: template?.endTime || '19:00',
            id: template?.id
        });
        setEditingId(template?.id || null);
        setIsModalOpen(true);
    };

    const handleSubmit = (e) => {
        e?.preventDefault();
        if (templateForm?.name?.trim()) {
            const duration = calculateDuration(
                templateForm?.startTime || '07:00',
                templateForm?.endTime || '19:00'
            );
            const templateData = { ...templateForm, hours: duration };

            if (editingId) {
                onUpdateTemplate?.({ ...templateData, id: editingId });
            } else {
                onAddTemplate?.(templateData);
            }
            setIsModalOpen(false);
        }
    };

    const handleDelete = () => {
        if (editingId) {
            onDeleteTemplate(editingId);
            setIsModalOpen(false);
        }
    };

    // Memoize templates with calculated hours - only recalculate when templates array changes
    const templatesWithHours = useMemo(() => {
        if (!templates || !Array.isArray(templates)) return [];

        return templates.map(template => {
            if (!template) return null;

            const start = template?.startTime || '07:00';
            const end = template?.endTime || '19:00';
            const hours = template?.hours || calculateDuration(start, end);
            return { ...template, start, end, hours };
        }).filter(Boolean); // Remove any null entries
    }, [templates]);

    return (
        <div className="template-selector">
            <h3>Szablony zmian</h3>

            <div className="templates-row">
                {/* Existing Templates */}
                {templatesWithHours.map(template => {
                    if (!template || !template.id) return null;

                    return (
                        <button
                            key={template.id}
                            className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                            onClick={() => onSelectTemplate?.(template)}
                            onDoubleClick={() => handleDoubleClick(template)}
                            title="Double-click to edit"
                        >
                            <div className={`card-top ${template?.type || 'day'}`}>
                                <div className="card-time">
                                    <span>{template?.start || '??:??'}</span>
                                    <span>{template?.end || '??:??'}</span>
                                </div>
                            </div>
                            <div className="card-bottom">
                                <span>{template?.hours || 0}</span>
                            </div>
                        </button>
                    );
                })}

                {/* Single Placeholder / Add Button */}
                <button
                    className="template-card placeholder"
                    onClick={handleOpenAdd}
                    title="Add New Template"
                >
                    +
                </button>
            </div>

            <h3>Rodzaje dni wolnych</h3>
            <div className="templates-row">
                {(leaveTypes || []).map(leave => {
                    if (!leave || !leave.id) return null;

                    return (
                        <button
                            key={leave.id}
                            className={`template-card leave-card ${selectedTemplate?.id === leave.id ? 'selected' : ''}`}
                            onClick={() => onSelectTemplate?.({ ...leave, name: leave?.symbol || leave?.id, hours: 0 })}
                            title={leave?.title || leave?.symbol || 'Leave'}
                        >
                            <div className="card-top leave">
                                <span className="leave-symbol">{leave?.symbol || '?'}</span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h4>{editingId ? 'Edit Shift Template' : 'Add New Shift Template'}</h4>
                        <form onSubmit={handleSubmit} className="add-template-form">
                            <input
                                type="text"
                                placeholder="Template Name (e.g. Dzień)"
                                value={templateForm.name}
                                onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })}
                                required
                                autoFocus
                            />
                            <div className="row">
                                <div className="input-group">
                                    <label>Typ:</label>
                                    <select
                                        value={templateForm.type}
                                        onChange={e => setTemplateForm({ ...templateForm, type: e.target.value })}
                                    >
                                        <option value="day">Dzień ☀️</option>
                                        <option value="night">Noc 🌙</option>
                                    </select>
                                </div>
                            </div>
                            <div className="row">
                                <TimeSelect
                                    label="Start Time:"
                                    value={templateForm.startTime}
                                    onChange={(val) => setTemplateForm({ ...templateForm, startTime: val })}
                                />
                                <TimeSelect
                                    label="End Time:"
                                    value={templateForm.endTime}
                                    onChange={(val) => setTemplateForm({ ...templateForm, endTime: val })}
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="submit" className="save-btn">Save Template</button>
                                {editingId && (
                                    <button type="button" className="delete-btn" onClick={handleDelete}>Delete</button>
                                )}
                                <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ShiftTemplateSelector;
