import React, { useState } from 'react';
import { Trash2, FileText, Check, X, Camera } from 'lucide-react';
import { Button } from '../ui/Button';
import { PhotoEvidenceModal } from './PhotoEvidenceModal';
import { STATUS_LABELS, SPECIAL_ZONE_CHANGE } from '../../data/constants';
import './ChecklistRow.css';

export function ChecklistRow({ item, onUpdate, onDelete }) {
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
    const [notesDraft, setNotesDraft] = useState(item.notes || '');

    const statusConfig = STATUS_LABELS[item.status] || STATUS_LABELS['good'];

    const handleSaveNotes = () => {
        onUpdate({ ...item, notes: notesDraft.trim() || undefined });
        setIsEditingNotes(false);
    };

    const handleCancelNotes = () => {
        setNotesDraft(item.notes || '');
        setIsEditingNotes(false);
    };

    const handleDelete = () => {
        if (window.confirm("¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer.")) {
            onDelete(item.id);
        }
    };

    return (
        <div className={`checklist-row-wrapper status-border-${item.status}`}>
            <div className="checklist-row-item">
                {/* ... (rest of the structure remains similar, focusing on actions) ... */}
                {/* Info */}
                <div className={`status-dot ${item.status}`} title={statusConfig.label}></div>
                <div className="row-info">
                    <div className="row-main">
                        <span className="row-location">{item.name}</span>
                        {item.type && <span className="row-type-badge">{item.type}</span>}
                    </div>
                    <div className="row-meta">
                        <span className="meta-qty">Can: <strong>{item.count}</strong></span>
                        {item.location !== SPECIAL_ZONE_CHANGE && (
                            <>
                                <span className="meta-sep">•</span>
                                <span className={`meta-status status-text-${item.status}`}>{statusConfig.label}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Actions - OPTIMIZED FOR MOBILE */}
                <div className="row-actions gap-3 md:gap-2"> {/* Increased gap for mobile, reduced for desktop if needed */}
                    <div className="mini-counter">
                        <button className="mini-btn p-2 md:p-1" onClick={() => {
                            const newCount = Math.max(0, item.count - 1);
                            const updates = { ...item, count: newCount };
                            if (Array.isArray(item.photos)) {
                                updates.photos = item.photos.slice(0, newCount);
                            }
                            onUpdate(updates);
                        }}>-</button>
                        <span className="mini-val text-lg">{item.count}</span>
                        <button className="mini-btn p-2 md:p-1" onClick={() => onUpdate({ ...item, count: item.count + 1 })}>+</button>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        className={`row-action-btn p-3 h-10 w-10 md:h-8 md:w-8 md:p-1.5 ${isEditingNotes || item.notes ? 'active-note' : ''}`} // Increased touch target
                        onClick={() => setIsEditingNotes(!isEditingNotes)}
                        title={item.notes ? "Editar observación" : "Agregar observación"}
                    >
                        <FileText size={18} /> {/* Slightly larger icon */}
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className={`row-action-btn p-3 h-10 w-10 md:h-8 md:w-8 md:p-1.5 ${item.photos && item.photos.some(Boolean) ? 'text-emerald-600 bg-emerald-50' : ''}`}
                        onClick={() => setIsPhotoModalOpen(true)}
                        title="Evidencia Fotográfica"
                    >
                        <Camera size={18} />
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="row-action-btn delete p-3 h-10 w-10 md:h-8 md:w-8 md:p-1.5"
                        onClick={handleDelete} // Using new handler
                    >
                        <Trash2 size={18} />
                    </Button>
                </div>
            </div>

            {/* Inline Notes Editor */}
            {isEditingNotes && (
                <div className="row-notes-editor animate-fade-in">
                    <div className="notes-input-wrapper">
                        <textarea
                            className="row-notes-input"
                            placeholder="Escribe una observación para esta ubicación..."
                            value={notesDraft}
                            onChange={(e) => setNotesDraft(e.target.value)}
                            rows={2}
                            autoFocus
                        />
                        <div className="notes-tools">
                            <Button size="sm" variant="ghost" onClick={handleCancelNotes} className="notes-tool-btn cancel">
                                <X size={14} />
                            </Button>
                            <Button size="sm" onClick={handleSaveNotes} className="notes-tool-btn save">
                                <Check size={14} /> Guardar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Read-only Notes View */}
            {item.notes && !isEditingNotes && (
                <div className="row-notes-preview" onClick={() => setIsEditingNotes(true)}>
                    <span className="notes-icon">📝</span>
                    <span className="notes-text">{item.notes}</span>
                </div>
            )}

            <PhotoEvidenceModal
                isOpen={isPhotoModalOpen}
                onClose={() => setIsPhotoModalOpen(false)}
                item={item}
                onUpdate={onUpdate}
            />
        </div>
    );
}
