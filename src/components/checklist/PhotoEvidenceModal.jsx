import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Upload, Check, Camera, Loader2, Clock, CloudOff, Trash2 } from 'lucide-react';
import { storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { savePendingUpload } from '../../lib/offlineStorage';
import heic2any from 'heic2any';
import { compressImage } from '../../lib/compressImage';

export function PhotoEvidenceModal({ isOpen, onClose, item, onUpdate }) {
    const [uploadingIndex, setUploadingIndex] = useState(null);
    const [isBulkUploading, setIsBulkUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isBulkUploading && uploadingIndex === null) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleBulkUpload(files);
        }
    };

    // item.photos is array of URLs.
    const currentPhotos = Array(item.count).fill(null).map((_, i) => (item.photos && item.photos[i]) || null);

    const handleFileUpload = async (index, file) => {
        if (!file) return;

        // Reuse logic for single file or bulk?
        // Let's extract the core upload logic to a helper function.
        // But for minimal diff, I'll keep handleFileUpload as is and duplicate/adapt for bulk.
        // Actually, let's process one file in a helper to avoid duplication.
        return processFile(index, file);
    };

    const processFile = async (index, rawFile) => {
        let file = rawFile;

        // Detect and convert HEIC/HEIF to JPEG before ANY upload logic
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith('.heic') || lowerName.endsWith('.heif')) {
            try {
                const convertedBlob = await heic2any({
                    blob: file,
                    toType: 'image/jpeg',
                    quality: 0.8
                });

                // If it returned multiple blobs (animations), take the first one
                const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

                // Reconstruct a File object
                const originalNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
                file = new File([finalBlob], `${originalNameWithoutExt}.jpeg`, { type: 'image/jpeg' });
            } catch (err) {
                console.error("HEIC Conversion Failed", err);
                alert("Advertencia: No se pudo convertir la imagen HEIC. Se subirá en formato original.");
            }
        }

        // Compress image before upload (resize + quality reduction)
        try {
            file = await compressImage(file);
        } catch (err) {
            console.warn('[PhotoEvidenceModal] Compression failed, using original', err);
        }

        // Offline Check
        if (!navigator.onLine) {
            try {
                await savePendingUpload(item.id, index, item.location, file);
                const localUrl = URL.createObjectURL(file);
                return `PENDING_OFFLINE|${localUrl}`;
            } catch (err) {
                console.error("Offline save failed", err);
                alert(`Error al guardar offline: ${err.name} - ${err.message}`);
                return null;
            }
        }

        // Online Upload
        try {
            const timestamp = Date.now();
            const storageRef = ref(storage, `evidence/${item.location}/${item.id}/${index}_${timestamp}_${file.name}`);
            const metadata = { contentType: file.type || 'image/jpeg' };
            const snapshot = await uploadBytes(storageRef, file, metadata);
            return await getDownloadURL(snapshot.ref);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Error al subir imagen. Intente de nuevo.");
            return null;
        }
    };

    // Wrapper for single file input
    const onSingleFileChange = async (index, file) => {
        if (!file) return;
        setUploadingIndex(index);
        const url = await processFile(index, file);
        setUploadingIndex(null);

        if (url) {
            const newPhotos = [...currentPhotos];
            newPhotos[index] = url;
            onUpdate({ ...item, photos: newPhotos });
        }
    };

    const handleRemoveUnit = (indexToRemove) => {
        if (!confirm(`¿Eliminar Unidad #${indexToRemove + 1}?`)) return;

        // 1. Remove photo at index
        const newPhotos = [...(item.photos || [])];
        newPhotos.splice(indexToRemove, 1);

        // 2. Decrement count
        const newCount = Math.max(0, item.count - 1);

        onUpdate({
            ...item,
            count: newCount,
            photos: newPhotos
        });
    };

    const handleBulkUpload = async (files) => {
        if (!files || files.length === 0) return;
        setIsBulkUploading(true);

        try {
            // 1. Identify empty slots in the current range
            const emptyIndices = currentPhotos
                .map((photo, index) => photo ? null : index)
                .filter(index => index !== null);

            const fileArray = Array.from(files);
            const uploads = [];

            // 2. Fill empty slots first
            let fileIndex = 0;
            for (const targetIndex of emptyIndices) {
                if (fileIndex >= fileArray.length) break;
                uploads.push({ targetIndex, file: fileArray[fileIndex] });
                fileIndex++;
            }

            // 3. Append remaining files to new slots
            let nextNewIndex = item.count;
            while (fileIndex < fileArray.length) {
                uploads.push({ targetIndex: nextNewIndex, file: fileArray[fileIndex] });
                nextNewIndex++;
                fileIndex++;
            }

            // Execute uploads
            const uploadPromises = uploads.map(({ targetIndex, file }) =>
                processFile(targetIndex, file).then(url => ({ targetIndex, url }))
            );

            const results = await Promise.all(uploadPromises);

            // Construct new state
            // Normalize photos array to handle sparse updates
            // Use item.photos as base, defaulting to empty array
            const nextPhotos = [...(item.photos || [])];

            results.forEach(({ targetIndex, url }) => {
                if (url) {
                    nextPhotos[targetIndex] = url;
                }
            });

            // Calculate new count
            // Count = Original Count + New Slots Added (slots beyond original count)
            const newSlotsAdded = uploads.filter(u => u.targetIndex >= item.count).length;
            const newCount = item.count + newSlotsAdded;

            onUpdate({
                ...item,
                count: newCount,
                photos: nextPhotos
            });

        } catch (error) {
            console.error("Bulk upload error", error);
            alert("Error en carga masiva.");
        } finally {
            setIsBulkUploading(false);
        }
    };

    const isPending = (url) => typeof url === 'string' && url.startsWith('PENDING_OFFLINE|');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Evidencia Fotográfica: ${item.name}`}
            className="max-w-xl"
            footer={
                <div className="flex justify-end pt-4">
                    <Button onClick={onClose}>Listo</Button>
                </div>
            }
        >
            <div 
                className="space-y-4 relative min-h-[200px]"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {isDragging && (
                    <div className="absolute inset-x-0 -inset-y-2 z-50 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-xl flex flex-col items-center justify-center backdrop-blur-[2px] animate-in fade-in zoom-in duration-200">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-blue-100 dark:border-blue-900/30 flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                                <Upload size={32} className="text-blue-500 animate-bounce" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold text-slate-900 dark:text-white">Suelta las fotos aquí</p>
                                <p className="text-sm text-slate-500">Se añadirán automáticamente al inventario</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <p className="text-sm text-slate-500">
                        {item.count} unidades requeridas.
                    </p>

                    <label className={`
                        flex items-center justify-center gap-2 px-4 py-2 rounded-lg 
                        bg-blue-50 text-blue-600 border border-blue-200 
                        hover:bg-blue-100 cursor-pointer font-medium transition-colors
                        ${isBulkUploading ? 'opacity-50 cursor-wait' : ''}
                    `}>
                        {isBulkUploading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Upload size={18} />
                        )}
                        <span>{isBulkUploading ? 'Procesando...' : 'Carga Masiva'}</span>
                        <input
                            type="file"
                            multiple
                            accept="image/*, .heic, .heif"
                            className="hidden"
                            onChange={(e) => handleBulkUpload(e.target.files)}
                            disabled={isBulkUploading || uploadingIndex !== null}
                        />
                    </label>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {currentPhotos.map((url, index) => {
                        const isOfflinePending = isPending(url);
                        const displayUrl = isOfflinePending ? url.split('|')[1] : url;

                        return (
                            <div key={index} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                    Unidad #{index + 1}
                                </span>

                                <div className="flex items-center gap-2">
                                    {displayUrl ? (
                                        <div className={`flex items-center px-3 py-1.5 rounded-lg border ${isOfflinePending ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                            {isOfflinePending ? <Clock size={16} className="mr-2" /> : <Check size={16} className="mr-2" />}
                                            <span className="text-sm font-semibold">{isOfflinePending ? 'Pendiente' : 'Guardado'}</span>

                                            <label className="ml-2 cursor-pointer p-1 hover:bg-black/5 rounded-md transition-colors" title="Cambiar foto">
                                                <Camera size={14} />
                                                <input
                                                    type="file"
                                                    accept="image/*, .heic, .heif"
                                                    className="hidden"
                                                    onChange={(e) => onSingleFileChange(index, e.target.files[0])}
                                                    disabled={uploadingIndex !== null || isBulkUploading}
                                                />
                                            </label>
                                        </div>
                                    ) : (
                                        <label className={`
                                            cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg 
                                            transition-all font-medium text-sm shadow-sm
                                            ${uploadingIndex === index
                                                ? 'bg-slate-100 text-slate-400 cursor-wait'
                                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600'}
                                        `}>
                                            {uploadingIndex === index ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" /> Subiendo...
                                                </>
                                            ) : (
                                                <>
                                                    <Camera size={16} /> Subir Foto
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*, .heic, .heif"
                                                className="hidden"
                                                onChange={(e) => onSingleFileChange(index, e.target.files[0])}
                                                disabled={uploadingIndex !== null || isBulkUploading}
                                            />
                                        </label>
                                    )}

                                    <button
                                        onClick={() => handleRemoveUnit(index)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Eliminar unidad"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Modal>
    );
}
