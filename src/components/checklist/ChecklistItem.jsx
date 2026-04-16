import React, { useState } from 'react';
import { Plus, CheckCircle, AlertTriangle, XCircle, Trash2, MapPin, FileText } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { ITEM_STATUSES, STATUS_LABELS } from '../../data/constants';
import './ChecklistItem.css';

export function ChecklistItem({ item, onUpdate, onDelete }) {
    const [showNotes, setShowNotes] = useState(false);

    // Handlers
    const handleIncrement = () => onUpdate({ ...item, count: (item.count || 0) + 1 });
    const handleDecrement = () => {
        const newCount = Math.max(0, (item.count || 0) - 1);
        const updates = { ...item, count: newCount };
        if (Array.isArray(item.photos)) {
            updates.photos = item.photos.slice(0, newCount);
        }
        onUpdate(updates);
    };
    const handleStatusChange = (status) => onUpdate({ ...item, status });
    const handleLocationChange = (e) => onUpdate({ ...item, location: e.target.value });
    const handleNotesChange = (e) => onUpdate({ ...item, notes: e.target.value });

    return (
        <Card className="checklist-item-card">
            <div className="checklist-item-header">
                <h4 className="checklist-item-title">{item.name}</h4>
                <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)} className="delete-btn">
                    <Trash2 size={16} />
                </Button>
            </div>

            <div className="checklist-row">
                {/* Location Input */}
                <div className="checklist-field location-field">
                    <label className="field-label">
                        <MapPin size={12} /> Ubicación
                    </label>
                    <Input
                        value={item.location || ''}
                        onChange={handleLocationChange}
                        placeholder="Ej: Lobby, Cocina..."
                        className="mini-input"
                    />
                </div>

                {/* Counter */}
                <div className="checklist-field counter-field">
                    <label className="field-label">Cantidad</label>
                    <div className="counter-wrapper">
                        <Button variant="secondary" size="sm" onClick={handleDecrement} disabled={item.count <= 1}>-</Button>
                        <span className="counter-value">{item.count || 0}</span>
                        <Button variant="secondary" size="sm" onClick={handleIncrement}>+</Button>
                    </div>
                </div>
            </div>

            <div className="checklist-controls">
                {/* Status */}
                <div className="control-group status-group">
                    <span className="control-label">Estado</span>
                    <div className="status-wrapper">
                        {Object.values(ITEM_STATUSES).map((status) => {
                            const config = STATUS_LABELS[status];
                            const isActive = item.status === status;

                            return (
                                <button
                                    key={status}
                                    className={`status-btn ${isActive ? 'active' : ''} ${status}`}
                                    onClick={() => handleStatusChange(status)}
                                    title={config.label}
                                >
                                    {status === 'good' && <CheckCircle size={16} />}
                                    {status === 'regular' && <AlertTriangle size={16} />}
                                    {status === 'bad' && <XCircle size={16} />}
                                    <span className="status-text">{config.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Notes Toggle & Field */}
            <div className="checklist-footer">
                <button
                    className={`notes-toggle ${item.notes ? 'has-notes' : ''}`}
                    onClick={() => setShowNotes(!showNotes)}
                >
                    <FileText size={14} />
                    {item.notes ? 'Editar Notas' : 'Agregar Notas'}
                </button>

                {(showNotes || item.notes) && (
                    <textarea
                        className="notes-area animate-fade-in"
                        placeholder="Observaciones adicionales..."
                        value={item.notes || ''}
                        onChange={handleNotesChange}
                        rows={2}
                    />
                )}
            </div>
        </Card>
    );
}
