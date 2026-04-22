import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, FileDown, ChevronRight, Expand, ZoomIn, Search, Palette, MoreVertical, Printer, FileText, LayoutGrid, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { storage, functions } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { PREDEFINED_ZONES } from '../../data/constants';
import { Button } from '../ui/Button';
import { compressImage } from '../../lib/compressImage';

// Utility to group items by name (Type)
const groupItemsByName = (items) => {
    return items.reduce((acc, item) => {
        if (!acc[item.name]) acc[item.name] = [];
        acc[item.name].push(item);
        return acc;
    }, {});
};

const getLayoutClass = (photoCount) => {
    if (photoCount === 1) return 'layout-hero';
    if (photoCount >= 2 && photoCount <= 3) return 'layout-row';
    if (photoCount === 4) return 'layout-quad'; // New specialized 2x2 layout
    if (photoCount >= 5 && photoCount <= 9) return 'layout-mosaic';
    return 'layout-compact'; // 10 or more
};

// Helper: Chunk array
const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

// Extracted Header Component for reuse in continuations
const ZoneReportHeader = ({ zone, companyName, logoUrl, isContinuation = false }) => (
    <div className={`p-8 print:!p-4 border-b-4 border-[var(--report-primary)] bg-slate-50 dark:bg-slate-800/50 print:!bg-white ${isContinuation ? 'pt-8 print:!pt-8' : ''}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex items-center gap-3">
                <div className="relative h-12 flex items-center justify-center print:border-none">
                    {/* Logo in Report Header */}
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-12 w-auto object-contain" />
                    ) : null}
                </div>
                <span className="text-xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white print:text-black">{companyName}</span>
            </div>
            <div className="text-left md:text-right w-full md:w-auto">
                <h2 className="text-lg md:text-xl font-extrabold text-[var(--report-primary)] uppercase print:text-[var(--report-primary)]">Reporte Fotográfico</h2>
                <p className="text-xs font-bold text-slate-500">REVISIÓN E INVENTARIO</p>
            </div>
        </div>
        <div className="flex justify-between items-end">
            <div>
                <span className="inline-block bg-[var(--report-primary)] text-white text-[10px] font-bold px-2 py-0.5 mb-1 uppercase tracking-tighter print:text-black print:border print:border-black">
                    {isContinuation ? 'Zona (Continuación)' : 'Zona Actual'}
                </span>
                <h3 className="text-lg md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight print:text-black">ZONA: {zone}</h3>
            </div>
        </div>
    </div>
);


// Report Cover Page Component
const ReportCoverPage = ({ company, totalItems, onUpdateCompany, isEditing = false }) => {
    const [localCommercialName, setLocalCommercialName] = useState(company.commercialName || company.name || '');
    const [localLegalName, setLocalLegalName] = useState(company.legalName || '');
    const [localAddress, setLocalAddress] = useState(company.address || '');
    const [isUploadingFacade, setIsUploadingFacade] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const dragCounter = useRef(0);
    const facadeInputRef = useRef(null);

    const handleFacadeUpload = async (e) => {
        let file;
        if (e.type === 'drop') {
            e.preventDefault();
            setIsDragging(false);
            file = e.dataTransfer.files[0];
        } else if (e.type === 'paste') {
            const items = e.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    file = items[i].getAsFile();
                    break;
                }
            }
        } else {
            file = e.target.files?.[0];
        }

        if (!file || !onUpdateCompany) return;

        setIsUploadingFacade(true);
        try {
            // Compress facade photo before upload
            let compressedFile = file;
            try { compressedFile = await compressImage(file); } catch (e) { console.warn('Facade compress failed', e); }
            const storageRef = ref(storage, `companies/${company.id}/facade-${Date.now()}.jpg`);
            await uploadBytes(storageRef, compressedFile);
            const url = await getDownloadURL(storageRef);
            await onUpdateCompany({ ...company, facadePhotoUrl: url });
        } catch (error) {
            console.error("Error uploading facade:", error);
            alert("Error al subir la foto de fachada.");
        } finally {
            setIsUploadingFacade(false);
        }
    };

    const onDragEnter = (e) => {
        if (!isEditing) return;
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        setIsDragging(true);
    };

    const onDragOver = (e) => {
        if (!isEditing) return;
        e.preventDefault();
        e.stopPropagation();
    };

    const onDragLeave = (e) => {
        if (!isEditing) return;
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current <= 0) {
            dragCounter.current = 0;
            setIsDragging(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        setIsDragging(false);
        handleFacadeUpload(e);
    };

    const handleFieldUpdate = (field, value) => {
        if (!onUpdateCompany) return;
        onUpdateCompany({ ...company, [field]: value });
    };

    const today = new Date().toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    useEffect(() => {
        if (!isEditing) return;
        const handleGlobalPaste = (e) => {
            if (!e.clipboardData) return;
            const items = e.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    handleFacadeUpload(e);
                    break;
                }
            }
        };
        window.addEventListener('paste', handleGlobalPaste);
        return () => window.removeEventListener('paste', handleGlobalPaste);
    }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps



    return (
        /* Wrapper to enforce page break */
        <div className="w-full h-auto print:block print:min-h-screen relative">

            {/* Main Cover Page Card - STRICT HEIGHT & OVERFLOW */}
            {/* Main Cover Page Card - BRUTE FORCE BLOCK LAYOUT */}
            <div className="bg-white dark:bg-slate-900 shadow-xl mb-8 section-to-print relative overflow-hidden text-slate-900 
                flex flex-col 
                print:!block print:!h-[260mm] print:!max-h-[260mm] print:!border-[8px] print:!border-[var(--report-primary)] print:break-inside-avoid print:!shadow-none">

                {/* Hidden file input for facade */}
                <input
                    ref={facadeInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFacadeUpload}
                    className="hidden"
                />

                {/* === BLOCK 1: HEADER & COMMERCIAL NAME (Fixed Height Block) === */}
                {/* Increased height to 200px and margin for separation */}
                <div className="p-8 print:!p-0 print:!h-[200px] print:!w-full print:!block print:!overflow-hidden print:!mb-[20px] bg-white relative z-20 print:clear-both">
                    {/* Inner padding wrapper for print alignment */}
                    <div className="print:p-6">
                        <div className="mb-6 print:!mb-2">
                            {company.logoUrl ? (
                                <div className="relative w-32 h-20 print:!w-48 print:!h-20 bg-white flex items-center justify-start">
                                    <img
                                        src={company.logoUrl}
                                        alt="Logo"
                                        className="max-w-full max-h-full object-contain object-left"
                                    />
                                </div>
                            ) : null}
                        </div>

                        <h2 className="text-xl font-bold text-slate-400 uppercase tracking-widest border-b-4 border-[var(--report-primary)] pb-2 inline-block mb-4 print:!text-lg">
                            REPORTE FOTOGRÁFICO {company.commercialName || company.name}
                        </h2>

                        <div className="mb-2 text-center print:text-left print:mt-2">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={localCommercialName}
                                    onChange={(e) => {
                                        setLocalCommercialName(e.target.value);
                                        handleFieldUpdate('commercialName', e.target.value);
                                    }}
                                    placeholder="Nombre Comercial"
                                    className="w-full text-2xl font-black uppercase text-[var(--report-primary)] text-center border-b-2 border-dashed border-slate-300 bg-transparent focus:outline-none focus:border-[var(--report-primary)] print:hidden mb-2"
                                />
                            ) : null}
                            <h1 className="hidden print:block text-xl font-black uppercase text-black text-center mb-1 leading-none">
                                {company.commercialName || company.name}
                            </h1>
                        </div>
                    </div>
                </div>

                {/* === BLOCK 2: IMAGE (Strict Fixed Height Block) === */}
                {/* Web: h-80/flex-grow | Print: Fixed 6400px BLOCK (Slightly reduced for gap) */}
                <div className="relative w-full h-80 print:!h-[640px] print:!w-full print:!block print:!relative print:!overflow-hidden print:!my-0 print:!bg-white print:clear-both bg-white overflow-hidden z-10 px-8 py-4 print:!p-0 print:!mx-0">
                    {company.facadePhotoUrl ? (
                        <div
                            className={`w-full h-full bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer group relative print:!block print:!static print:!w-full print:!h-full ${isDragging ? 'ring-4 ring-[var(--report-primary)] ring-inset' : ''}`}
                            onClick={() => isEditing && facadeInputRef.current?.click()}
                            onDragEnter={onDragEnter}
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={handleDrop}
                            onPaste={(e) => isEditing && handleFacadeUpload(e)}
                            tabIndex={isEditing ? 0 : -1}
                        >
                            <img
                                src={company.facadePhotoUrl}
                                alt="Fachada"
                                className="w-full h-full object-cover print:!static print:!object-cover print:!w-full print:!h-full"
                            />
                            {isEditing && (
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center print:hidden pointer-events-none">
                                    <div className="text-white text-sm flex items-center gap-2">
                                        <Upload size={20} />
                                        <span>Cambiar Foto</span>
                                    </div>
                                </div>
                            )}
                            {isUploadingFacade && (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                    <Loader2 className="animate-spin text-slate-600" size={32} />
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => facadeInputRef.current?.click()}
                            onDragEnter={onDragEnter}
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={handleDrop}
                            onPaste={(e) => isEditing && handleFacadeUpload(e)}
                            disabled={isUploadingFacade || !isEditing}
                            tabIndex={isEditing ? 0 : -1}
                            className={`w-full h-full bg-slate-100 border-2 border-dashed flex flex-col items-center justify-center transition-all print:hidden disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--report-primary)] ${isDragging ? 'border-[var(--report-primary)] bg-slate-200' : 'border-slate-300 hover:bg-slate-200'}`}
                        >
                            {isUploadingFacade ? (
                                <Loader2 className="animate-spin text-slate-400" size={48} />
                            ) : (
                                <div className="flex flex-col items-center pointer-events-none">
                                    <ImageIcon className="text-slate-300 mb-4" size={64} />
                                    <span className="text-slate-400 text-sm">Subir Foto de Fachada</span>
                                    <span className="text-slate-300 text-xs mt-1">o pega con Ctrl+V</span>
                                </div>
                            )}
                        </button>
                    )}
                </div>

                {/* === BLOCK 3: FOOTER (Flow Block) === */}
                <div className="px-8 pb-4 print:!px-8 print:!pb-0 text-center space-y-4 bg-white relative z-20 print:!w-full print:!block print:!h-auto print:!mt-[10px] print:!border-t-2 print:!pt-[5px] print:!border-slate-300 print:clear-both">
                    {/* Legal Name */}
                    <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase block print:hidden">Razón Social</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={localLegalName}
                                onChange={(e) => {
                                    setLocalLegalName(e.target.value);
                                    handleFieldUpdate('legalName', e.target.value);
                                }}
                                placeholder="Razón Social Completa"
                                className="w-full text-lg font-bold text-slate-800 text-center border-b border-dashed border-slate-300 bg-transparent focus:outline-none focus:border-[var(--report-primary)] print:hidden"
                            />
                        ) : null}
                        <p className="hidden print:block text-lg font-bold text-slate-900 uppercase leading-tight">
                            {company.legalName || 'Razón Social'}
                        </p>
                    </div>

                    {/* Address */}
                    <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase block print:hidden">Dirección</label>
                        {isEditing ? (
                            <textarea
                                value={localAddress}
                                onChange={(e) => {
                                    setLocalAddress(e.target.value);
                                    handleFieldUpdate('address', e.target.value);
                                }}
                                placeholder="Dirección completa"
                                rows={2}
                                className="w-full text-sm text-slate-600 text-center border-b border-dashed border-slate-300 bg-transparent focus:outline-none focus:border-[var(--report-primary)] resize-none print:hidden"
                            />
                        ) : null}
                        <p className="hidden print:block text-sm font-semibold text-slate-700 uppercase leading-snug px-8">
                            {company.address || 'Dirección del Inmueble'}
                        </p>
                    </div>

                    {/* Red Footer Bar */}
                    <div className="mt-auto pt-4 print:!mt-4 border-t-4 border-[var(--report-primary)] bg-white">
                        <div className="flex justify-between items-end text-slate-500 uppercase">
                            <div className="text-left">
                                <span className="block text-xs font-bold text-[var(--report-primary)] mb-1">Fecha de Generación</span>
                                <span className="text-sm font-bold text-slate-700">{today}</span>
                            </div>
                            <div className="text-right">
                                <span className="block text-xs font-bold text-[var(--report-primary)] mb-1">Total Elementos</span>
                                <span className="text-sm font-bold text-slate-700">{totalItems} Items</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* FORCED PAGE BREAK */}
            <div className="w-full h-[1px] print:break-after-page print:block invisible"></div>
        </div>
    );
};




// Component: Single Zone Page (Reusable for both modes)
// Now handles internal pagination if photos > 6
const ZoneReportPage = ({ zone, items, companyName, logoUrl }) => {
    const groupedItems = groupItemsByName(items);

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl min-h-[1100px] print:!min-h-0 print:!h-auto flex flex-col mb-8 print:!mb-0 print:!shadow-none print:!border-none section-to-print block print:!w-full print:!max-w-none print:!m-0 print:!bg-white">
            {/* Main Header */}
            <ZoneReportHeader zone={zone} companyName={companyName} logoUrl={logoUrl} />

            <div className={`p-8 print:!p-4 space-y-12 print:!space-y-4 flex-grow ${items.length > 20 ? 'content-visibility-auto' : ''}`} style={items.length > 20 ? { contentVisibility: 'auto' } : {}}>
                {Object.entries(groupedItems).map(([itemName, itemsList], itemIndex) => {
                    const allPhotos = itemsList.flatMap(item => (item.photos || []).filter(Boolean));

                    // PAGINATION LOGIC: Split into chunks of 6
                    const photoChunks = chunk(allPhotos, 6);
                    const notes = itemsList.map(i => i.notes).filter(Boolean);

                    // If no photos, still allow rendering (handled by chunk logic or fallback)
                    if (photoChunks.length === 0 && itemsList.length > 0) {
                        // Mock empty chunk to render fallback
                        photoChunks.push([]);
                    }

                    return (
                        <React.Fragment key={itemName}>
                            {photoChunks.map((chunkPhotos, pageIndex) => {
                                const isContinuation = pageIndex > 0;
                                const isNewEquipmentType = itemIndex > 0 && pageIndex === 0; // New equipment after first
                                const needsHeader = isContinuation || isNewEquipmentType;
                                const layoutClass = getLayoutClass(chunkPhotos.length);

                                return (
                                    <React.Fragment key={`${itemName}-page-${pageIndex}`}>
                                        {/* Render Header on: 1) Equipment type change, 2) Photo continuation */}
                                        {needsHeader && (
                                            <div className="print:break-before-page mt-8 print:mt-0">
                                                <div className="print:hidden h-8 bg-slate-100 dark:bg-white/5 my-4 flex items-center justify-center text-xs text-slate-400 uppercase font-bold tracking-widest border-y border-dashed border-slate-300">
                                                    Salto de Página Automático
                                                </div>
                                                {/* Re-render Full Header for Professional Membrete */}
                                                <ZoneReportHeader
                                                    zone={zone}
                                                    companyName={companyName}
                                                    logoUrl={logoUrl}
                                                    isContinuation={isContinuation}
                                                />
                                                <div className="h-4"></div>
                                            </div>
                                        )}

                                        <div className={`mb-8 print:!mb-4 item-type-block ${needsHeader ? 'print:!mt-4' : ''}`}>
                                            <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-2 mb-4 print:!mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-6 bg-[var(--report-primary)]"></div>
                                                    <h4 className="text-lg font-bold uppercase tracking-tight text-slate-800 dark:text-slate-100 print:text-black">
                                                        TIPO: {itemName} {isContinuation ? '(CONT.)' : ''}
                                                    </h4>
                                                </div>
                                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                                    {isContinuation
                                                        ? `Pág. ${pageIndex + 1}/${photoChunks.length}`
                                                        : `${allPhotos.length} ${allPhotos.length === 1 ? 'foto' : 'fotos'}`}
                                                </span>
                                            </div>

                                            {/* Adaptive Smart Grid Layout */}
                                            <div className={`photo-grid ${layoutClass}`}>
                                                {chunkPhotos.map((photoUrl, idx) => {
                                                    // Find original item context if possible? 
                                                    // We flattened the array, so we lost exact item ref.
                                                    // But we can approximate or just use generic ref.
                                                    // For simple display, generic is fine.
                                                    return (
                                                        <div
                                                            key={`${itemName}-${pageIndex}-${idx}`}
                                                            className="photo-card"
                                                        >
                                                            <div className="photo-image">
                                                                <img
                                                                    alt={`${itemName} ${idx + 1}`}
                                                                    src={photoUrl}
                                                                    loading="eager"
                                                                    decoding="async"
                                                                />
                                                            </div>
                                                            {/* Footer removed per user request (redundant Ref) */}
                                                        </div>
                                                    );
                                                })}

                                                {/* Fallback if no photos in any item of this group (Only on first page) */}
                                                {!isContinuation && chunkPhotos.length === 0 && (
                                                    <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 col-span-full rounded-lg">
                                                        <span className="text-slate-400 text-xs italic font-medium">Sin imágenes capturadas</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Observations - Render only on first page or appropriately? 
                                                Usually observations go at the end? Or at the start? 
                                                Let's keep them on the FIRST page for visibility usually.
                                            */}
                                            {!isContinuation && notes.length > 0 && (
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-l-4 border-slate-300 dark:border-slate-600 print:bg-white print:border-slate-300 break-inside-avoid w-full mt-4">
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 print:text-black">Observaciones: {itemName}</label>
                                                    <div className="text-sm text-slate-700 dark:text-slate-300 min-h-[2rem] whitespace-pre-wrap print:text-black">
                                                        {notes.join('\n---\n')}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </React.Fragment>
                    );
                })}

                {Object.keys(groupedItems).length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        No hay elementos registrados en esta zona.
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-slate-200 dark:border-slate-800 mt-auto flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] print:text-slate-600">
                <div>CONFIDENCIAL - {companyName} {new Date().getFullYear()}</div>
                <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded print:bg-transparent">REPORTE GENERADO INTERNAMENTE</div>
            </div>
        </div>
    );
};

// Main View Component
export function PhotoReportView({ company, items, onBack, onUpdateCompany }) {
    const [reportColor, setReportColor] = useState(company.reportColor || '#DB0011');
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [reportMode, setReportMode] = useState('single'); // 'single' | 'full'
     const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isDraggingLogo, setIsDraggingLogo] = useState(false);
    const logoDragCounter = useRef(0);
    const fileInputRef = useRef(null);

    // Sync color if company updates externally (optional but good practice)
    useEffect(() => {
        if (company.reportColor) {
            setReportColor(company.reportColor);
        }
    }, [company.reportColor]);

    const handleColorChange = async (color) => {
        setReportColor(color);
        if (onUpdateCompany) {
            await onUpdateCompany({ ...company, reportColor: color });
        }
    };

    const handleLogoUpload = async (e) => {
        let file;
        if (e.type === 'drop') {
            e.preventDefault();
            setIsDraggingLogo(false);
            file = e.dataTransfer.files[0];
        } else if (e.type === 'paste') {
            const items = e.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    file = items[i].getAsFile();
                    break;
                }
            }
        } else {
            file = e.target.files[0];
        }

        if (!file) return;

        setIsUploadingLogo(true);
        try {
            // Compress logo before upload (small dimension for logos)
            let compressedFile = file;
            try { compressedFile = await compressImage(file, { maxDimension: 512, quality: 0.8 }); } catch (e) { console.warn('Logo compress failed', e); }
            const storageRef = ref(storage, `companies/${company.id}/logo_${Date.now()}`);
            await uploadBytes(storageRef, compressedFile);
            const url = await getDownloadURL(storageRef);

            if (onUpdateCompany) {
                await onUpdateCompany({ ...company, logoUrl: url });
            }
        } catch (error) {
            console.error("Error uploading logo:", error);
            alert("Error al subir el logo.");
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const onLogoDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        logoDragCounter.current++;
        setIsDraggingLogo(true);
    };

    const onLogoDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const onLogoDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        logoDragCounter.current--;
        if (logoDragCounter.current <= 0) {
            logoDragCounter.current = 0;
            setIsDraggingLogo(false);
        }
    };

    const onLogoDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        logoDragCounter.current = 0;
        setIsDraggingLogo(false);
        handleLogoUpload(e);
    };

    const handleRemoveLogo = async (e) => {
        e.stopPropagation(); // Prevent triggering the file input
        if (onUpdateCompany) {
            await onUpdateCompany({ ...company, logoUrl: null });
        }
    };

    // FILTER: Only include items that have at least one valid photo
    const itemsWithPhotos = React.useMemo(() => {
        return (items || []).filter(item =>
            item.photos &&
            Array.isArray(item.photos) &&
            item.photos.length > 0 &&
            item.photos.some(photo => typeof photo === 'string' && photo.length > 0)
        );
    }, [items]);

    // Logic: Extract unique zones that have items or are in PREDEFINED
    const activeZones = [...new Set(itemsWithPhotos.map(i => i.location))].sort();
    const [currentZone, setCurrentZone] = useState(activeZones[0] || PREDEFINED_ZONES[0]);

    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    // Safety check
    useEffect(() => {
        if (!activeZones.includes(currentZone) && activeZones.length > 0 && reportMode === 'single' && !isGeneratingReport) {
            setCurrentZone(activeZones[0]);
        }
    }, [activeZones, currentZone, reportMode, isGeneratingReport]);


    const [showPrintPreview, setShowPrintPreview] = useState(false);

    // Print current zone using browser's print dialog
    const handlePrintCurrentZone = () => {
        setIsExportMenuOpen(false);
        // Browser print dialog will use @media print CSS
        setTimeout(() => window.print(), 200);
    };

    // Show full report with cover page - user can edit then print manually
    const handlePrintAllZones = () => {
        setIsExportMenuOpen(false);
        setReportMode('full'); // Show cover page and all zones for editing
    };

    // Helper: Detect Mobile
    const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);



    const handleDownloadPDF = async () => {
        // --- UNIFIED STRATEGY: ALWAYS USE CLOUD FUNCTION ---
        // Client-side generation is unreliable due to CORS and browser memory limits on large reports.
        setIsGeneratingReport(true);
        const newWindow = window.open('', '_blank');

        if (newWindow) {
            newWindow.document.write(`
                <html>
                    <head>
                        <title>Generando PDF...</title>
                        <style>
                            body { font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f9fafb; text-align: center; }
                            .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3b82f6; border-radius: 50%; width: 48px; height: 48px; animation: spin 1s linear infinite; margin-bottom: 24px; }
                            h1 { color: #1f2937; margin-bottom: 8px; }
                            p { color: #6b7280; max-width: 400px; }
                            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                        </style>
                    </head>
                    <body>
                        <div class="loader"></div>
                        <h1>Procesando Reporte</h1>
                        <p>Generando documento oficial en nuestros servidores...</p>
                    </body>
                </html>
            `);
        }

        try {
            const generateFn = httpsCallable(functions, 'generateMobilePdf');
            const result = await generateFn({ inventoryId: company.id });

            if (result.data && result.data.url) {
                if (newWindow) {
                    newWindow.location.href = result.data.url;
                } else {
                    window.open(result.data.url, '_blank');
                }
            } else {
                throw new Error("No se recibió URL del servidor.");
            }
        } catch (error) {
            console.error("Cloud PDF Error:", error);
            if (newWindow) newWindow.close();
            alert("Error al generar PDF: " + error.message);
        } finally {
            setIsGeneratingReport(false);
        }
    };


    return (
        <div
            className="report-outer-wrapper bg-[#F3F4F6] dark:bg-[#111827] min-h-screen text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 print:!bg-white print:!min-h-0 print:!h-auto print:!w-full print:!m-0 print:!p-0 print:!overflow-visible"
            style={{ '--report-primary': reportColor }}
        >
            {/* Nav */}
            <nav className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-3 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm print:hidden">
                <div className="flex items-center justify-between w-full md:w-auto gap-4">
                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={() => {
                                if (reportMode === 'full') {
                                    setReportMode('single');
                                } else {
                                    onBack();
                                }
                            }}
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-800"
                        >
                            <ArrowLeft size={20} />
                            <span className="hidden sm:inline text-sm font-medium">Volver</span>
                        </button>
                        <div className="h-6 w-[1px] bg-slate-300 dark:bg-slate-700 mx-2"></div>

                        {/* Dynamic Logo */}
                        <div className="flex items-center gap-2">
                            <div className="relative group">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                />

                                {company.logoUrl ? (
                                    <div className="relative">
                                        <img
                                            src={company.logoUrl}
                                            alt="Logo"
                                            className={`h-8 md:h-10 w-auto object-contain cursor-pointer transition-all rounded focus:outline-none focus:ring-2 focus:ring-[var(--report-primary)] focus:ring-offset-2 ${isDraggingLogo ? 'opacity-50 scale-110' : 'hover:opacity-80'}`}
                                            onClick={() => !isUploadingLogo && fileInputRef.current?.click()}
                                            onDragEnter={onLogoDragEnter}
                                            onDragOver={onLogoDragOver}
                                            onDragLeave={onLogoDragLeave}
                                            onDrop={onLogoDrop}
                                            onPaste={(e) => !isUploadingLogo && handleLogoUpload(e)}
                                            tabIndex="0"
                                        />
                                        {/* X Button to remove logo */}
                                        <button
                                            onClick={handleRemoveLogo}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Quitar Logo"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                                            </svg>
                                        </button>

                                        {isUploadingLogo && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                                                <Loader2 className="animate-spin text-slate-800" size={16} />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragEnter={onLogoDragEnter}
                                        onDragOver={onLogoDragOver}
                                        onDragLeave={onLogoDragLeave}
                                        onDrop={onLogoDrop}
                                        onPaste={(e) => !isUploadingLogo && handleLogoUpload(e)}
                                        disabled={isUploadingLogo}
                                        className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center border border-dashed rounded transition-all group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-[var(--report-primary)] ${isDraggingLogo ? 'bg-[var(--report-primary)]/20 border-[var(--report-primary)] scale-110' : 'bg-slate-100 border-slate-300 hover:bg-slate-200'}`}
                                        title="Subir Logo"
                                    >
                                        {isUploadingLogo ? (
                                            <Loader2 className="animate-spin text-slate-400" size={14} />
                                        ) : (
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                <div className="absolute inset-0 bg-[var(--report-primary)] transform rotate-45 opacity-20"></div>
                                                <ImageIcon size={14} className="text-slate-400 relative z-10" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <Upload size={12} className="text-white" />
                                        </div>
                                    </button>
                                )}
                            </div>
                            <span className="text-sm md:text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate max-w-[120px] md:max-w-xs">{company.name}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    {/* Color Picker */}
                    <div className="flex items-center justify-between w-full sm:w-auto gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center">
                            <Palette size={16} className="text-slate-500 ml-2" />
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mr-2 ml-1">Color:</span>
                        </div>
                        <div className="flex gap-1">
                            {['#DB0011', '#2563eb', '#059669', '#d97706', '#7c3aed', '#000000'].map(color => (
                                <button
                                    key={color}
                                    onClick={() => handleColorChange(color)}
                                    className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${reportColor === color ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                    </div>

                    {reportMode === 'single' && (
                        <div className="relative w-full sm:w-auto flex flex-wrap gap-2">
                            {/* 0. Full Report Button (Restore Cover Page Access) */}
                            <button
                                onClick={handlePrintAllZones}
                                className={`flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 border border-slate-300 rounded font-bold transition-all shadow-sm ${reportMode === 'full' ? 'bg-slate-800 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                                title="Ver Portada y Todas las Zonas"
                            >
                                <LayoutGrid size={18} />
                                <span>Reporte Completo</span>
                            </button>

                            {/* 1. Print Button (Desktop Standard) - ALWAYS VISIBLE TEXT */}
                            <button
                                onClick={() => window.print()}
                                className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-slate-100 text-slate-900 border border-slate-300 rounded font-bold hover:bg-slate-200 transition-all shadow-sm"
                                title="Imprimir vista actual"
                            >
                                <Printer size={18} />
                                <span>Imprimir Actual</span>
                            </button>

                            {/* 2. Download PDF Button REMOVED (Handled by Main View) */}
                        </div>
                    )}
                </div>
            </nav>

            <div className="p-4 md:p-8 max-w-[1600px] mx-auto print:p-0 print:w-full print:max-w-none">
                {/* Mode: ALL ZONES */}
                {reportMode === 'full' || items.length === 0 ? ( // Logic adjustment? 
                    // Actually, if reportMode is full, we show everything.
                    // If items.length is 0, we might show empty state in single mode, but here we just render structure.
                    <>
                        <ReportCoverPage
                            company={company}
                            totalItems={items.length}
                            onUpdateCompany={onUpdateCompany}
                            isEditing={true} // Allow editing in full mode
                        />

                        {activeZones.map(zone => {
                            const zoneItems = itemsWithPhotos.filter(i => i.location === zone);
                            if (zoneItems.length === 0) return null; // Don't render empty zones in full report for now? Or depends on requirement.

                            return (
                                <ZoneReportPage
                                    key={zone}
                                    zone={zone}
                                    items={zoneItems}
                                    companyName={company.commercialName || company.name}
                                    logoUrl={company.logoUrl}
                                />
                            );
                        })}

                        {/* If no zones have items */}
                        {itemsWithPhotos.length === 0 && (
                            <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
                                <p className="text-slate-500 italic">No hay fotos para generar el reporte.</p>
                            </div>
                        )}

                        {/* FAB to allow printing in full mode if nav is hidden or at bottom */}
                        <div className="fixed bottom-8 right-8 print:hidden flex flex-col gap-4">
                            <button
                                onClick={() => window.print()}
                                className="flex items-center justify-center w-14 h-14 bg-slate-900 text-white rounded-full shadow-xl hover:bg-slate-700 transition-all z-50"
                                title="Imprimir Reporte Completo"
                            >
                                <Printer size={24} />
                            </button>
                            {/* Download FAB Removed */}
                        </div>
                    </>
                ) : (
                    // Mode: SINGLE ZONE (Tabs)
                    <>
                        {/* Zone Tabs */}
                        <div className="flex overflow-x-auto gap-2 mb-8 pb-2 scrollbar-hide print:hidden">
                            {activeZones.map(zone => (
                                <button
                                    key={zone}
                                    onClick={() => setCurrentZone(zone)}
                                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all
                                        ${currentZone === zone
                                            ? 'bg-[var(--report-primary)] text-white shadow-md'
                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                                        }`}
                                >
                                    {zone}
                                </button>
                            ))}
                        </div>

                        {/* Single Zone Content */}
                        <ZoneReportPage
                            zone={currentZone}
                            items={itemsWithPhotos.filter(i => i.location === currentZone)}
                            companyName={company.commercialName || company.name}
                            logoUrl={company.logoUrl}
                        />

                        {itemsWithPhotos.length > 50 && (
                            <div className="hidden md:block absolute top-[110%] right-0 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs p-2 rounded w-64 shadow-sm z-50">
                                <strong>Tip:</strong> Si tarda mucho en cargar la impresión, usa "Descargar PDF" que es más ligero.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
