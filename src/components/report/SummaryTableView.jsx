import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

export function SummaryTableView({ company, items, onBack }) {
    // Filter only items that have photos? Or all items? 
    // Reference shows items with photos. Let's assume we show all, but empty photos if none.
    // However, usually "Evidencia Fotográfica" implies we usually want things with photos.
    // But user said "leer los datos que el usuario ya capturó".

    // Helper to expand items into multiple rows
    const expandItems = (baseItems) => {
        let expanded = [];
        baseItems.forEach(item => {
            // Clean photos array to remove null/empty/undefined
            const validPhotos = (item.photos || []).filter(p => p && typeof p === 'string' && p.trim().length > 0);

            // Determine how many rows to create: max of declared count or actual VALID photos
            const rowCount = Math.max(item.count || 1, validPhotos.length, 1);

            for (let i = 0; i < rowCount; i++) {
                expanded.push({
                    ...item,
                    uniqueId: `${item.id}-${i}`, // Unique key for React
                    displayPhoto: validPhotos[i] || null // Use valid photo if available for this index
                });
            }
        });
        return expanded;
    };

    // Filter and THEN Expand
    // STRICT FILTER: Only items with at least one photo.
    // EXCLUDE Special Zone (Changes)
    const hasPhotos = i => i.photos && i.photos.length > 0;
    const isStandardZone = i => i.location !== 'CAMBIOS A REALIZAR';

    const signageRaw = items.filter(i => i.categoryId === 'signage' && hasPhotos(i) && isStandardZone(i)).sort((a, b) => (a.location || '').localeCompare(b.location || ''));
    const equipmentRaw = items.filter(i => i.categoryId === 'equipment' && hasPhotos(i) && isStandardZone(i)).sort((a, b) => (a.location || '').localeCompare(b.location || ''));

    const signageItems = expandItems(signageRaw);
    const equipmentItems = expandItems(equipmentRaw);

    const renderTable = (tableItems, title, columnTitle) => (
        <div className="mb-12">
            <h2 className="text-xl font-bold mb-4 text-slate-800 uppercase border-b-2 border-slate-800 pb-2 inline-block">
                {title}
            </h2>
            <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse border border-black">
                    <thead>
                        <tr className="bg-[#9AC0E6]">
                            <th className="border border-black p-4 text-center font-bold uppercase tracking-wide w-1/4">{columnTitle}</th>
                            <th className="border border-black p-4 text-center font-bold uppercase tracking-wide w-1/4">UBICACIÓN</th>
                            <th className="border border-black p-4 text-center font-bold uppercase tracking-wide w-1/2">EVIDENCIA FOTOGRÁFICA</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableItems.length > 0 ? (
                            tableItems.map((item) => (
                                <tr key={item.uniqueId} className="h-[180px]">
                                    <td className="border border-black p-4 text-center align-middle font-medium uppercase text-lg">
                                        {item.name} {item.type && <span className="text-sm block text-slate-500">({item.type})</span>}
                                    </td>
                                    <td className="border border-black p-4 text-center align-middle font-medium uppercase text-lg">
                                        {item.location}
                                    </td>
                                    <td className="border border-black p-4 text-center align-middle">
                                        {item.displayPhoto ? (
                                            <div className="flex justify-center items-center h-full">
                                                <a href={item.displayPhoto} target="_blank" rel="noopener noreferrer" title="Haz clic para ver la imagen cruda y su posible error">
                                                    <img
                                                        src={item.displayPhoto}
                                                        alt={item.name}
                                                        className="max-h-[150px] object-contain block hover:opacity-80 transition-opacity cursor-pointer border border-transparent hover:border-red-500"
                                                        onError={(e) => {
                                                            console.error("Failed to load image:", item.displayPhoto);
                                                            e.target.style.border = "2px solid red";
                                                        }}
                                                    />
                                                </a>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 italic">Sin Evidencia</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="border border-black p-8 text-center text-slate-500">
                                    No hay registros de {title.toLowerCase()} para mostrar.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white p-8">
            <div className="mb-6 flex justify-between items-center print:hidden">
                <Button variant="ghost" onClick={onBack} className="hover:bg-slate-100">
                    <ArrowLeft size={20} className="mr-2" /> Volver
                </Button>
                <div className="text-right">
                    <h1 className="text-2xl font-bold text-slate-800">Tabla de Resumen</h1>
                    <p className="text-sm text-slate-500">Inventario Fotográfico</p>
                </div>
            </div>

            {/* Render tables only if there are items, OR render 'Empty' state if really nothing */}
            {signageItems.length > 0 && renderTable(signageItems, 'Señaléticas', 'SEÑALETICA')}
            {equipmentItems.length > 0 && renderTable(equipmentItems, 'Equipos de Emergencia', 'EQUIPO DE EMERGENCIA')}

            {signageItems.length === 0 && equipmentItems.length === 0 && (
                <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                    No hay elementos registrados para mostrar en el resumen.
                </div>
            )}
        </div>
    );
}

