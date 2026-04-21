import React, { useState } from 'react';
import { PREDEFINED_ZONES, CATALOG_ITEMS, ITEM_STATUSES, DEFAULT_CATEGORIES, SPECIAL_ZONE_CHANGE } from '../../data/constants';
import { exportToCSV } from '../../lib/exportUtils';
import { ChecklistRow } from './ChecklistRow';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ArrowLeft, Plus, Check, Trash2, Search, Filter, Grid, Download, FileText, Loader2, Users, DollarSign, Router, CreditCard, Monitor, Map, Warehouse, Cloud, FileSpreadsheet, CheckCircle2, Share2, PenTool } from 'lucide-react';
import { generateClientSidePDF, uploadPDFToStorage } from '../../lib/pdfGenerator';
import { cn } from '../../lib/utils';
import { getPendingUploads, removePendingUpload } from '../../lib/offlineStorage';
import { storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL, getMetadata } from 'firebase/storage';
import Swal from 'sweetalert2';
// import './ChecklistView.css'; // Logic moved to Tailwind

// Map Zones to Icons and Colors
const ZONE_CONFIG = {
    'SALA DE ESPERA': { icon: Users, color: 'purple', label: 'Sala de Atención' },
    'CAJAS': { icon: DollarSign, color: 'amber', label: 'Cajas' },
    'SITE': { icon: Router, color: 'blue', label: 'SITE' },
    'ATM': { icon: CreditCard, color: 'emerald', label: 'Cajeros' },
    'CUBÍCULOS': { icon: Monitor, color: 'indigo', label: 'Cubículos' },
    'PASILLOS': { icon: Map, color: 'rose', label: 'Pasillos Internos' },
    'ALMACÉN': { icon: Warehouse, color: 'cyan', label: 'Almacén' },
    // Fallback
    'DEFAULT': { icon: Grid, color: 'slate', label: 'Zona General' }
};

const getZoneConfig = (zoneName) => {
    // Simple normalization to match keys
    const key = Object.keys(ZONE_CONFIG).find(k => zoneName.toUpperCase().includes(k)) || 'DEFAULT';
    return ZONE_CONFIG[key];
};

const ZoneSizeIndicator = ({ urls }) => {
    const [size, setSize] = useState(null);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        let isMounted = true;
        const fetchSizes = async () => {
            if (!urls || urls.length === 0) {
                if (isMounted) { setSize(0); setLoading(false); }
                return;
            }
            try {
                let totalBytes = 0;
                const promises = urls.map(async (url) => {
                    try {
                        const fileRef = ref(storage, url);
                        const meta = await getMetadata(fileRef);
                        return meta.size || 0;
                    } catch (e) {
                        return 0; // Skip silently if file doesn't exist or is unreachable
                    }
                });
                const sizes = await Promise.all(promises);
                totalBytes = sizes.reduce((acc, curr) => acc + curr, 0);

                if (isMounted) {
                    setSize(totalBytes);
                    setLoading(false);
                }
            } catch (error) {
                if (isMounted) { setLoading(false); }
            }
        };

        fetchSizes();

        return () => { isMounted = false; };
    }, [urls]);

    if (loading) return <span className="text-[11px] text-slate-400 font-medium tracking-wide">TOTAL NUBE: CALCULANDO...</span>;
    if (size === 0) return <span className="text-[11px] text-slate-400 font-medium tracking-wide">TOTAL NUBE: 0 KB</span>;

    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    if (sizeMB < 0.1) {
        const sizeKB = (size / 1024).toFixed(0);
        return <span className="text-[11px] text-slate-400 font-medium tracking-wide">TOTAL NUBE: {sizeKB} KB</span>;
    }

    return <span className="text-[11px] text-slate-400 font-medium tracking-wide">TOTAL NUBE: {sizeMB} MB</span>;
};

export function ChecklistView({ company, onUpdateCompany, onViewReport, onViewSummary, onViewGroupedSummary, onViewSketch }) {
    const [selectedZone, setSelectedZone] = useState(null);
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [searchZone, setSearchZone] = useState('');

    // Offline Sync State
    const [pendingUploadsCount, setPendingUploadsCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    // Add Item State
    const [newItemCategory, setNewItemCategory] = useState(null);
    const [selectedCatalogItems, setSelectedCatalogItems] = useState([]);
    const [newItemStatus, setNewItemStatus] = useState(ITEM_STATUSES.GOOD);

    // PDF Generation State
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [pdfProgress, setPdfProgress] = useState("");
    const [regenerationSuccess, setRegenerationSuccess] = useState(false);
    const [newItemType, setNewItemType] = useState('');
    const [pdfQuality, setPdfQuality] = useState('medium'); // 'low', 'medium', 'high'

    const checklistItems = company.checklists || [];

    // Calculate Estimated PDF Size
    const totalPhotos = checklistItems.reduce((acc, item) => acc + (item.photos?.length || 0), 0);
    const ESTIMATED_SIZES = {
        low: 0.1,    // 100KB
        medium: 0.25, // 250KB
        high: 0.75   // 750KB
    };
    const estimatedSizeMB = (totalPhotos * ESTIMATED_SIZES[pdfQuality]).toFixed(1);

    // Check for pending uploads every few seconds or on mount
    React.useEffect(() => {
        const checkPending = async () => {
            const pending = await getPendingUploads();
            setPendingUploadsCount(pending.length);
        };
        checkPending();
        const interval = setInterval(checkPending, 5000); // Check periodically
        return () => clearInterval(interval);
    }, []);

    const handleSync = async () => {
        if (!navigator.onLine) {
            alert("No tienes conexión a internet.");
            return;
        }

        setIsSyncing(true);
        const pending = await getPendingUploads();
        let successCount = 0;
        let updatedChecklists = [...checklistItems];

        for (const record of pending) {
            try {
                // Upload to Firebase
                const timestamp = Date.now();
                // Use record.fileName if available (new format), else record.file.name (old format fallback)
                const fileName = record.fileName || 'image.jpg';
                const storageRef = ref(storage, `evidence/${record.zoneName}/${record.itemId}/${record.photoIndex}_${timestamp}_${fileName}`);

                let blobToUpload;

                if (record.fileBase64) {
                    // Convert Base64 back to Blob
                    const res = await fetch(record.fileBase64);
                    blobToUpload = await res.blob();
                } else {
                    // Fallback for any old records using Blob/File directly (if any succeed)
                    blobToUpload = record.file;
                }

                const metadata = { contentType: blobToUpload.type || 'image/jpeg' };
                const snapshot = await uploadBytes(storageRef, blobToUpload, metadata);
                const downloadURL = await getDownloadURL(snapshot.ref);

                // Update Local Data (Find item and replace specific photo index)
                const itemIndex = updatedChecklists.findIndex(i => i.id === record.itemId);
                if (itemIndex !== -1) {
                    const item = updatedChecklists[itemIndex];
                    const newPhotos = [...(item.photos || [])];
                    // Ensure array size
                    while (newPhotos.length <= record.photoIndex) newPhotos.push(null);
                    newPhotos[record.photoIndex] = downloadURL;

                    updatedChecklists[itemIndex] = { ...item, photos: newPhotos };
                }

                // Remove from local DB
                await removePendingUpload(record.id);
                successCount++;

            } catch (err) {
                console.error("Sync failed for record", record.id, err);
            }
        }

        // Batch Update Firestore
        if (successCount > 0) {
            await onUpdateCompany({ ...company, checklists: updatedChecklists });
            alert(`Sincronización completada: ${successCount} fotos subidas.`);
            setPendingUploadsCount(pending.length - successCount);
        } else {
            if (pending.length > 0) alert("No se pudieron subir las fotos. Intenta de nuevo.");
        }
        setIsSyncing(false);
    };

    // Handlers
    const handleExport = () => {
        if (checklistItems.length === 0) return alert("No hay datos para exportar.");
        exportToCSV(company.name, checklistItems);
    };

    const handleOpenAddModal = () => {
        // SPECIAL ZONE: Auto-Add "CAMBIO X"
        if (selectedZone === SPECIAL_ZONE_CHANGE) {
            const currentItems = checklistItems.filter(i => i.location === selectedZone);
            const nextIndex = currentItems.length + 1;
            const newItemName = `CAMBIO ${nextIndex}`;

            const newItem = {
                id: crypto.randomUUID(),
                categoryId: 'signage', // Dummy category
                name: newItemName, // Auto Name
                location: selectedZone,
                type: null,
                count: 1,
                status: ITEM_STATUSES.BAD, // Default to "Action Needed"
                notes: ''
            };

            onUpdateCompany({ ...company, checklists: [...checklistItems, newItem] });
            return;
        }

        setNewItemCategory(null);
        setSelectedCatalogItems([]);
        setNewItemStatus(ITEM_STATUSES.GOOD);
        setNewItemType('');
        setIsAddItemModalOpen(true);
    };

    const toggleItemSelection = (item) => {
        const isSelected = selectedCatalogItems.find(i => i.name === item.name);
        if (isSelected) {
            setSelectedCatalogItems(selectedCatalogItems.filter(i => i.name !== item.name));
        } else {
            const newSelection = [...selectedCatalogItems, item];
            setSelectedCatalogItems(newSelection);
            if (item.requiresType && !newItemType) setNewItemType(item.options[0]);
        }
    };

    const handleBatchAddItems = () => {
        if (!selectedZone || selectedCatalogItems.length === 0) return;
        let updatedChecklists = [...checklistItems];

        selectedCatalogItems.forEach(catalogItem => {
            const itemTypeForId = catalogItem.requiresType ? newItemType : null;
            const existingItemIndex = updatedChecklists.findIndex(item =>
                item.location === selectedZone &&
                item.name === catalogItem.name &&
                item.status === newItemStatus &&
                item.type === itemTypeForId
            );

            if (existingItemIndex !== -1) {
                updatedChecklists[existingItemIndex] = {
                    ...updatedChecklists[existingItemIndex],
                    count: (updatedChecklists[existingItemIndex].count || 0) + 1
                };
            } else {
                updatedChecklists.push({
                    id: crypto.randomUUID(),
                    categoryId: newItemCategory,
                    name: catalogItem.name,
                    location: selectedZone,
                    type: itemTypeForId,
                    count: 1,
                    status: newItemStatus,
                    notes: ''
                });
            }
        });

        onUpdateCompany({ ...company, checklists: updatedChecklists });
        setIsAddItemModalOpen(false);
    };

    const handleUpdateRow = (updatedItem) => {
        if (updatedItem.count === 0 && window.confirm('¿Eliminar este registro?')) {
            handleDeleteRow(updatedItem.id);
            return;
        }
        const updatedChecklists = checklistItems.map(item => item.id === updatedItem.id ? updatedItem : item);
        onUpdateCompany({ ...company, checklists: updatedChecklists });
    };

    const handleDeleteRow = (itemId) => {
        const updatedChecklists = checklistItems.filter(item => item.id !== itemId);
        onUpdateCompany({ ...company, checklists: updatedChecklists });
    };

    const showTypeSelector = selectedCatalogItems.some(i => i.requiresType);
    const activeOptions = selectedCatalogItems.find(i => i.requiresType)?.options || [];

    // Finalized Zones Logic
    const finalizedZones = company.finalizedZones || [];
    const customZones = company.customZones || [];

    const toggleZoneStatus = (zone) => {
        const isFinalized = finalizedZones.includes(zone);
        let newZones;
        if (isFinalized) {
            newZones = finalizedZones.filter(z => z !== zone);
        } else {
            newZones = [...finalizedZones, zone];
        }
        onUpdateCompany({ ...company, finalizedZones: newZones });
    };

    // Calculate Available Zones based on Company Type
    const baseZones = (company.type === 'custom') ? [] : PREDEFINED_ZONES;

    // Combine base zones with custom zones, removing duplicates just in case
    // ALWAYS include "CAMBIOS A REALIZAR" (Special Zone)
    const allAvailableZones = Array.from(new Set([...baseZones, ...customZones, SPECIAL_ZONE_CHANGE]));

    // Filter Zones
    const filteredZones = allAvailableZones.filter(z => z.toLowerCase().includes(searchZone.toLowerCase()));

    const handleAddZone = () => {
        const name = prompt("Nombre de la nueva zona:");
        if (!name) return;

        const normalizedName = name.trim().toUpperCase();
        if (!normalizedName) return;

        if (allAvailableZones.includes(normalizedName)) {
            alert("Esta zona ya existe.");
            return;
        }

        const newCustomZones = [...customZones, normalizedName];
        onUpdateCompany({ ...company, customZones: newCustomZones });
    };

    const handleDeleteZone = (e, zoneName) => {
        e.stopPropagation();
        if (window.confirm(`¿Estás seguro de que deseas eliminar la zona "${zoneName}" y todo su contenido?`)) {
            const newCustomZones = customZones.filter(z => z !== zoneName);
            // Also optionally remove items in that zone? 
            // For now, just removing the zone definition is strictly what determines logic, 
            // but orphans might remain. The user just wants to "delete the zone".
            // Let's filter out items too to be clean.
            const newChecklists = checklistItems.filter(item => item.location !== zoneName);

            onUpdateCompany({
                ...company,
                customZones: newCustomZones,
                checklists: newChecklists
            });
        }
    };

    // MAIN VIEW: Zone Grid (Page 2 Logic)
    if (!selectedZone) {
        // ... (Stats Logic kept simple) ...

        return (
            <div className="animate-fade-in">
                {/* Top Stats & Search */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                            Zonas de Inventario
                            {pendingUploadsCount > 0 && (
                                <Button
                                    onClick={handleSync}
                                    className="bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200 text-sm py-1 px-3 h-auto"
                                    disabled={isSyncing}
                                >
                                    {isSyncing ? <Loader2 size={16} className="animate-spin mr-2" /> : <Cloud size={16} className="mr-2" />}
                                    {isSyncing ? 'Sincronizando...' : `Sincronizar (${pendingUploadsCount})`}
                                </Button>
                            )}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            {company.type === 'custom' ? 'Proyecto Personalizado' : 'Plantilla: Bancos'}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-end">
                        <Button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md w-full sm:w-auto justify-center h-10">
                            <FileSpreadsheet size={18} className="mr-2" /> EXPORTAR XLSX
                        </Button>

                        {/* CONFIG BUTTON */}
                        <Button onClick={onViewReport} className="bg-slate-700 hover:bg-slate-800 text-white shadow-md w-full sm:w-auto justify-center h-10">
                            <FileText size={18} className="mr-2" /> Configurar PDF
                        </Button>

                        {/* PDF Quality Selector - Show for active and finalized reports */}
                        {company.status !== 'ERROR' && (
                            <div className="flex flex-col gap-1 w-full sm:w-auto">
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Calidad PDF (Est. {estimatedSizeMB} MB)</label>
                                <select
                                    value={pdfQuality}
                                    onChange={(e) => setPdfQuality(e.target.value)}
                                    className="h-10 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-2 shadow-sm focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="high">Alta (Impresión)</option>
                                    <option value="medium">Media (Recomendado)</option>
                                    <option value="low">Baja (WhatsApp)</option>
                                </select>
                            </div>
                        )}

                        {(() => {
                            const isFinalized = company.status === 'FINALIZADO';
                            const hasReport = !!company.finalPdfUrl;


                            // Re-generation specific state
                            // const [regenerationSuccess, setRegenerationSuccess] = React.useState(false); // MOVED TO TOP LEVEL

                            if (hasReport) {
                                return (
                                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                        <a
                                            href={company.finalPdfUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-md transition-colors h-10"
                                        >
                                            <FileText size={18} className="mr-2" /> DESCARGAR REPORTE
                                        </a>

                                        {/* SHARE BUTTON (Mobile/Native) */}
                                        {navigator.canShare && (
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        // Convert URL to File object
                                                        const response = await fetch(company.finalPdfUrl);
                                                        const blob = await response.blob();
                                                        // Use the correct filename
                                                        const customName = `Reporte fotografico - ${company.name.replace(/[^a-zA-Z0-9 \-_]/g, '').trim()}.pdf`;
                                                        const file = new File([blob], customName, { type: 'application/pdf' });

                                                        if (navigator.canShare({ files: [file] })) {
                                                            await navigator.share({
                                                                files: [file],
                                                                title: customName,
                                                            });
                                                        } else {
                                                            Swal.fire({
                                                                icon: 'warning',
                                                                title: 'No soportado',
                                                                text: 'Tu dispositivo no soporta compartir archivos directamente.',
                                                                confirmButtonColor: '#9333ea'
                                                            });
                                                        }
                                                    } catch (err) {
                                                        console.error("Error sharing:", err);
                                                        Swal.fire({
                                                            icon: 'error',
                                                            title: 'Error al compartir',
                                                            text: err.message,
                                                            confirmButtonColor: '#9333ea'
                                                        });
                                                    }
                                                }}
                                                className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-medium shadow-md transition-colors h-10 w-full sm:w-auto md:hidden"
                                                title="Compartir archivo PDF"
                                            >
                                                <Share2 size={18} className="mr-2" /> COMPARTIR
                                            </button>
                                        )}

                                        {/* REGENERATE OPTION */}
                                        <button
                                            onClick={async () => {
                                                const result = await Swal.fire({
                                                    title: '¿Regenerar Reporte?',
                                                    text: "Si has hecho cambios o cambió el estilo, esto creará un nuevo PDF y reemplazará el anterior.",
                                                    icon: 'question',
                                                    showCancelButton: true,
                                                    confirmButtonColor: '#9333ea', // purple-600
                                                    cancelButtonColor: '#64748b', // slate-500
                                                    confirmButtonText: 'Sí, regenerar',
                                                    cancelButtonText: 'Cancelar',
                                                    reverseButtons: true
                                                });

                                                if (result.isConfirmed) {
                                                    try {
                                                        setIsGeneratingPdf(true);
                                                        setRegenerationSuccess(false);
                                                        // Reuse existing generation logic
                                                        const pdfBlob = await generateClientSidePDF(company, checklistItems, setPdfProgress, pdfQuality);
                                                        setPdfProgress("Subiendo Reporte...");
                                                        const customName = `Reporte fotografico - ${company.name}`;
                                                        const url = await uploadPDFToStorage(pdfBlob, company.id, company.uid, customName);
                                                        setPdfProgress("Actualizando...");
                                                        await onUpdateCompany({
                                                            ...company,
                                                            finalPdfUrl: url,
                                                            updatedAt: Date.now()
                                                        });
                                                        setRegenerationSuccess(true);

                                                        // Optional success message
                                                        Swal.fire({
                                                            title: '¡Reporte Actualizado!',
                                                            text: 'El PDF se ha regenerado correctamente.',
                                                            icon: 'success',
                                                            timer: 2000,
                                                            showConfirmButton: false
                                                        });

                                                        setTimeout(() => setRegenerationSuccess(false), 3000);
                                                    } catch (e) {
                                                        console.error(e);
                                                        Swal.fire({
                                                            title: 'Error',
                                                            text: e.message,
                                                            icon: 'error',
                                                            confirmButtonColor: '#9333ea'
                                                        });
                                                    } finally {
                                                        setIsGeneratingPdf(false);
                                                        setPdfProgress("");
                                                    }
                                                }
                                            }}
                                            disabled={isGeneratingPdf}
                                            className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium shadow-sm transition-all h-10 w-full sm:w-auto ${isGeneratingPdf
                                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                : regenerationSuccess
                                                    ? "bg-green-100 text-green-700 border border-green-200"
                                                    : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                                                }`}
                                            title="Regenerar PDF con los últimos cambios"
                                        >
                                            {isGeneratingPdf ? (
                                                <>
                                                    <Loader2 size={16} className="mr-2 animate-spin" />
                                                    {pdfProgress || "Generando..."}
                                                </>
                                            ) : regenerationSuccess ? (
                                                <>
                                                    <CheckCircle2 size={16} className="mr-2" />
                                                    ¡LISTO!
                                                </>
                                            ) : (
                                                <>
                                                    <Loader2 size={16} className="mr-2" />
                                                    RE-GENERAR
                                                </>
                                            )}
                                        </button>
                                    </div>
                                );
                            }

                            if (company.status === 'ERROR') {
                                return (
                                    <div className="flex flex-col gap-1 w-full sm:w-auto animate-fade-in">
                                        <Button
                                            onClick={async () => {
                                                await onUpdateCompany({ ...company, status: 'RETRY_PDF' });
                                            }}
                                            className="bg-amber-600 hover:bg-amber-700 text-white shadow-md w-full sm:w-auto justify-center h-10"
                                        >
                                            <Loader2 size={18} className="mr-2" /> REINTENTAR GENERACIÓN
                                        </Button>
                                    </div>
                                );
                            }

                            if (isGeneratingPdf) {
                                return (
                                    <Button disabled className="bg-slate-400 text-white shadow-md w-full sm:w-auto justify-center cursor-not-allowed h-10">
                                        <Loader2 size={18} className="mr-2 animate-spin" /> {pdfProgress || "Generando PDF..."}
                                    </Button>
                                );
                            }

                            if (isFinalized && !hasReport) {
                                return (
                                    <div className="flex flex-col gap-2 w-full sm:w-auto items-center">
                                        <Button
                                            onClick={async () => {
                                                if (window.confirm(`¿FINALIZAR CARPETA?\n\nCalidad seleccionada: ${pdfQuality.toUpperCase()}\nTamaño est: ~${estimatedSizeMB} MB\n\nSe generará el Reporte Fotográfico PDF en este dispositivo.\nPor favor NO CIERRES la ventana hasta que termine.`)) {
                                                    try {
                                                        setIsGeneratingPdf(true);

                                                        // 1. Generate PDF Blob (Client Side)
                                                        const pdfBlob = await generateClientSidePDF(company, checklistItems, setPdfProgress, pdfQuality);

                                                        // 2. Upload to Firebase Storage
                                                        setPdfProgress("Subiendo Reporte...");
                                                        const customName = `Reporte fotografico - ${company.name}`;
                                                        const url = await uploadPDFToStorage(pdfBlob, company.id, company.uid, customName); // Assuming company has uid

                                                        // 3. Finalize in Firestore
                                                        setPdfProgress("Finalizando...");
                                                        await onUpdateCompany({
                                                            ...company,
                                                            status: 'FINALIZADO',
                                                            finalPdfUrl: url,
                                                            finalizedAt: Date.now()
                                                        });

                                                        alert("¡Carpeta Finalizada y Reporte Generado con Éxito!");
                                                    } catch (e) {
                                                        console.error("Error finalizing:", e);
                                                        alert("Error al generar el reporte: " + e.message);
                                                    } finally {
                                                        setIsGeneratingPdf(false);
                                                        setPdfProgress("");
                                                    }
                                                }
                                            }}
                                            className="bg-[#DB0011] hover:bg-red-700 text-white shadow-md w-full sm:w-auto justify-center h-10"
                                        >
                                            <FileText size={18} className="mr-2" /> REINTENTAR GENERAR REPORTE
                                        </Button>
                                    </div>
                                );
                            }

                            return (
                                <Button
                                    onClick={async () => {
                                        if (window.confirm(`¿FINALIZAR CARPETA?\n\nCalidad seleccionada: ${pdfQuality.toUpperCase()}\nTamaño est: ~${estimatedSizeMB} MB\n\nSe generará el Reporte Fotográfico PDF en este dispositivo.\nPor favor NO CIERRES la ventana hasta que termine.`)) {
                                            try {
                                                setIsGeneratingPdf(true);

                                                // 1. Generate PDF Blob (Client Side)
                                                const pdfBlob = await generateClientSidePDF(company, checklistItems, setPdfProgress, pdfQuality);

                                                // 2. Upload to Firebase Storage
                                                setPdfProgress("Subiendo Reporte...");
                                                const customName = `Reporte fotografico - ${company.name}`;
                                                const url = await uploadPDFToStorage(pdfBlob, company.id, company.uid, customName); // Assuming company has uid

                                                // 3. Finalize in Firestore
                                                setPdfProgress("Finalizando...");
                                                await onUpdateCompany({
                                                    ...company,
                                                    status: 'FINALIZADO',
                                                    finalPdfUrl: url,
                                                    finalizedAt: Date.now()
                                                });

                                                alert("¡Carpeta Finalizada y Reporte Generado con Éxito!");
                                            } catch (e) {
                                                console.error("Error finalizing:", e);
                                                alert("Error al generar el reporte: " + e.message);
                                            } finally {
                                                setIsGeneratingPdf(false);
                                                setPdfProgress("");
                                            }
                                        }
                                    }}
                                    className="bg-[#DB0011] hover:bg-red-700 text-white shadow-md w-full sm:w-auto justify-center h-10"
                                >
                                    <FileText size={18} className="mr-2" /> FINALIZAR Y GENERAR REPORTE
                                </Button>
                            );
                        })()}

                        <Button onClick={() => onViewSummary()} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md w-full sm:w-auto justify-center h-10">
                            <Grid size={18} className="mr-2" /> Tabla Resumen
                        </Button>
                        <Button onClick={() => onViewGroupedSummary()} className="bg-teal-600 hover:bg-teal-700 text-white shadow-md w-full sm:w-auto justify-center h-10">
                            <Grid size={18} className="mr-2" /> Tabla Cantidades
                        </Button>
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-full sm:w-64 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all h-10"
                                placeholder="Buscar zona..."
                                value={searchZone}
                                onChange={(e) => setSearchZone(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Zone Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredZones.map(zone => {
                        const itemsInZone = checklistItems.filter(i => i.location === zone);
                        const zoneConfig = getZoneConfig(zone);
                        const Icon = zoneConfig.icon;
                        const color = zoneConfig.color;
                        const itemCount = itemsInZone.reduce((acc, item) => acc + item.count, 0);
                        const isFinalized = finalizedZones.includes(zone);

                        const colorStyles = {
                            purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                            amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
                            blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                            emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
                            indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
                            rose: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
                            cyan: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
                            slate: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
                        }[color] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';

                        return (
                            <div
                                key={zone}
                                onClick={() => setSelectedZone(zone)}
                                className={`group bg-white dark:bg-slate-900 border p-5 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden ${isFinalized ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200 dark:border-slate-800'}`}
                            >
                                {isFinalized && (
                                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                                        FINALIZADO
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-xl group-hover:scale-110 transition-transform ${colorStyles}`}>
                                        <Icon size={24} />
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Zona {zone.substring(0, 2)}</span>
                                        {(company.type === 'custom' || customZones.includes(zone)) && zone !== SPECIAL_ZONE_CHANGE && (
                                            <button
                                                onClick={(e) => handleDeleteZone(e, zone)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar Zona"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold mb-1 text-slate-900 dark:text-white uppercase">{zone}</h3>
                                <div className="mb-6 flex flex-col gap-1">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{itemCount} Elementos registrados</p>
                                    <ZoneSizeIndicator urls={itemsInZone.flatMap(i => i.photos || []).filter(url => typeof url === 'string' && !url.startsWith('PENDING'))} />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        className="flex-1 bg-slate-100 dark:bg-slate-800 group-hover:bg-primary group-hover:text-white py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1 text-slate-700 dark:text-slate-300"
                                    >
                                        <Plus size={18} /> {isFinalized ? 'Editar Inventario' : 'Gestionar'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}


                    {/* New Zone Card */}
                    <button
                        onClick={handleAddZone}
                        className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 hover:border-primary/50 hover:bg-primary/5 transition-all group opacity-60 hover:opacity-100"
                    >
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 group-hover:bg-primary group-hover:text-white transition-all mb-3">
                            <Plus size={24} />
                        </div>
                        <span className="font-semibold text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">Nueva Zona</span>
                    </button>
                </div>

                {/* Footer Stats */}
                <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                            <Grid size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase">Total Zonas (v2.0)</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{filteredZones.length}</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                            <Check size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase">Zonas Finalizadas</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{finalizedZones.length}</p>
                        </div>
                    </div>
                </div>
            </div >
        );
    }

    // ZONE DETAIL VIEW (Kept similar logic but updated styles)
    const activeItemsOnZone = checklistItems.filter(i => i.location === selectedZone);
    const isZoneFinalized = finalizedZones.includes(selectedZone);

    return (
        <div className="animate-fade-in pb-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Button variant="ghost" onClick={() => setSelectedZone(null)} className="self-start hover:bg-slate-100 dark:hover:bg-slate-800">
                        <ArrowLeft size={18} className="mr-2" /> <span className="hidden sm:inline">Volver al Plano</span><span className="sm:hidden">Volver</span>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">{selectedZone}</h2>
                            {isZoneFinalized && (
                                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200 flex items-center gap-1">
                                    <Check size={12} strokeWidth={3} /> FINALIZADO
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm">{activeItemsOnZone.length} Elementos registrados</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <Button
                        onClick={() => toggleZoneStatus(selectedZone)}
                        className={`px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2 border w-full sm:w-auto ${isZoneFinalized ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50' : 'bg-emerald-600 text-white border-transparent hover:bg-emerald-700'}`}
                    >
                        {isZoneFinalized ? (
                            <>Reabrir Zona</>
                        ) : (
                            <><Check size={20} className="mr-2" /> MARCAR FINALIZADO</>
                        )}
                    </Button>
                    <Button onClick={handleOpenAddModal} className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all flex items-center justify-center gap-2 w-full sm:w-auto">
                        <Plus size={20} className="mr-2" /> AGREGAR ELEMENTO
                    </Button>
                </div>
            </header>

            <div className="space-y-4">
                {activeItemsOnZone.length > 0 ? (
                    activeItemsOnZone.map(item => (
                        <ChecklistRow
                            key={item.id}
                            item={item}
                            onUpdate={handleUpdateRow}
                            onDelete={handleDeleteRow}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <Grid size={48} className="text-slate-300 mb-4" />
                        <p className="text-lg font-medium text-slate-900 dark:text-white">No hay elementos registrados en {selectedZone}</p>
                        <p className="text-slate-500 mb-6">Usa el botón "Agregar" para comenzar el inventario.</p>
                    </div>
                )}
            </div>

            {/* Reuse existing Modal logic but styled? The Modal component uses standard classes so it should be fine if Modal.jsx is clean. */}
            <Modal
                isOpen={isAddItemModalOpen}
                onClose={() => setIsAddItemModalOpen(false)}
                title="Nuevo Hallazgo"
                footer={
                    <div className="mt-8 pt-5 border-t border-slate-100 flex justify-end items-center gap-4">
                        <Button variant="ghost" onClick={() => setIsAddItemModalOpen(false)} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors bg-white">Cancelar</Button>
                        {newItemCategory && (
                            <Button onClick={handleBatchAddItems} disabled={selectedCatalogItems.length === 0} className="px-5 py-2.5 rounded-lg font-bold shadow-md transition-all bg-primary text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none">
                                Guardar ({selectedCatalogItems.length})
                            </Button>
                        )}
                    </div>
                }
            >
                {/* Form Content - Simplified styles for brevity within this implementation */}
                <div className="space-y-6">
                    {!newItemCategory ? (
                        <div className="grid grid-cols-2 gap-4">
                            {DEFAULT_CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    className="p-4 border border-slate-200 rounded-xl text-slate-700 hover:border-primary hover:bg-blue-50 hover:text-primary transition-all cursor-pointer font-medium text-left"
                                    onClick={() => setNewItemCategory(cat.id)}
                                >
                                    <span className="font-semibold text-slate-900 dark:text-white block">{cat.name}</span>
                                    <span className="text-xs text-slate-500">Seleccionar categoría</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setNewItemCategory(null); setSelectedCatalogItems([]); }}
                                className="text-slate-500"
                            >
                                <ArrowLeft size={16} className="mr-1" /> Cambiar Categoría
                            </Button>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Selecciona Elemento(s):</label>
                                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                                    {CATALOG_ITEMS[newItemCategory]?.map(item => {
                                        const isSelected = selectedCatalogItems.some(i => i.name === item.name);
                                        return (
                                            <button
                                                key={item.name}
                                                className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-all active:scale-95 ${isSelected ? 'border-primary bg-blue-50 text-primary' : 'border-slate-200 hover:bg-slate-50'}`}
                                                onClick={() => toggleItemSelection(item)}
                                            >
                                                {isSelected && <Check size={14} />}
                                                <span>{item.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Type Selector (Dynamic) */}
                            {showTypeSelector && (
                                <div className="animate-fade-in">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo de Extintor:</label>
                                    <div className="flex gap-2">
                                        {activeOptions.map(opt => (
                                            <button
                                                key={opt}
                                                onClick={() => setNewItemType(opt)}
                                                className={`px-4 py-2 rounded-lg border text-sm font-bold transition-all ${newItemType === opt ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Status Selector */}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: ITEM_STATUSES.GOOD, label: 'Bueno', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' },
                                    { id: ITEM_STATUSES.BAD, label: 'Malo', color: 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200' },
                                    { id: ITEM_STATUSES.REGULAR, label: 'Regular', color: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200' }
                                ].map(status => (
                                    <button
                                        key={status.id}
                                        onClick={() => setNewItemStatus(status.id)}
                                        className={`p-2 rounded-lg border text-sm font-medium transition-all ${newItemStatus === status.id ? `${status.color} ring-2 ring-offset-1` : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'}`}
                                    >
                                        {status.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
