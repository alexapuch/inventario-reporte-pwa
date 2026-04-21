import React from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '../ui/Button';

export function GroupedSummaryTableView({ company, items, onBack }) {
    const hasPhotos = i => i.photos && i.photos.length > 0;
    const isStandardZone = i => i.location !== 'CAMBIOS A REALIZAR';

    const getApproximateDimension = (name) => {
        const lowerName = (name || '').toLowerCase();
        if (lowerName.includes('que hacer') || lowerName.includes('qué hacer') || lowerName.includes('sismo') || lowerName.includes('incendio') || lowerName.includes('inmueble')) {
            return '45 x 60 CM';
        }
        return '30 x 35 CM';
    };

    const groupItems = (baseItems) => {
        const grouped = {};

        baseItems.forEach(item => {
            const key = item.name;
            if (!grouped[key]) {
                grouped[key] = {
                    name: item.name,
                    type: item.type,
                    uniqueId: `grouped-${item.id}`,
                    count: 0,
                    locations: new Set(),
                    photos: []
                };
            }
            
            // Add count (default to 1 if not specified)
            grouped[key].count += (parseInt(item.count) || 1);
            
            // Add location
            if (item.location) {
                grouped[key].locations.add(item.location);
            }
            
            // Add photos
            const validPhotos = (item.photos || []).filter(p => p && typeof p === 'string' && p.trim().length > 0);
            grouped[key].photos.push(...validPhotos);
        });

        return Object.values(grouped).map(group => {
            // Join locations
            let locs = Array.from(group.locations);
            let locationString = "";
            if (locs.length === 1) {
                locationString = locs[0];
            } else if (locs.length > 1) {
                const last = locs.pop();
                locationString = locs.join(', ') + ' Y ' + last;
            }

            return {
                ...group,
                locationString,
                displayPhoto: group.photos.length > 0 ? group.photos[0] : null,
                medida: getApproximateDimension(group.name)
            };
        });
    };

    // Filter items that have photos and are in standard zones
    const rawItems = items.filter(i => hasPhotos(i) && isStandardZone(i));
    const groupedItems = groupItems(rawItems);

    return (
        <div className="min-h-screen bg-white p-4 md:p-8">
            <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4 print:hidden">
                <Button variant="ghost" onClick={onBack} className="hover:bg-slate-100 self-start">
                    <ArrowLeft size={20} className="mr-2" /> Volver
                </Button>
                
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="text-center md:text-right">
                        <h1 className="text-2xl font-bold text-slate-800">Tabla de Cantidades</h1>
                        <p className="text-sm text-slate-500">Resumen Agrupado</p>
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-900 border border-slate-300 rounded font-bold hover:bg-slate-200 transition-all shadow-sm"
                        title="Imprimir Tabla"
                    >
                        <Printer size={18} />
                        <span>Imprimir</span>
                    </button>
                </div>
            </div>

            {groupedItems.length > 0 ? (
                <div className="mb-12 print:m-0 w-full">
                    <div className="w-full overflow-x-auto print:overflow-visible">
                        <table className="w-full min-w-[800px] border-collapse border border-black print:text-sm">
                            <thead>
                                <tr className="bg-[#9AC0E6] print:bg-[#9AC0E6]">
                                    <th className="border border-black p-3 text-center font-bold uppercase tracking-wide w-[10%]">CANTIDAD</th>
                                    <th className="border border-black p-3 text-center font-bold uppercase tracking-wide w-[20%]">EQUIPO</th>
                                    <th className="border border-black p-3 text-center font-bold uppercase tracking-wide w-[30%]">UBICACIÓN</th>
                                    <th className="border border-black p-3 text-center font-bold uppercase tracking-wide w-[25%]">EVIDENCIA FOTOGRÁFICA</th>
                                    <th className="border border-black p-3 text-center font-bold uppercase tracking-wide w-[15%]">MEDIDA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupedItems.map((item) => (
                                    <tr key={item.uniqueId} className="h-[120px] print:h-auto print:break-inside-avoid">
                                        <td className="border border-black p-3 text-center align-middle font-medium text-lg print:text-base">
                                            {item.count}
                                        </td>
                                        <td className="border border-black p-3 text-center align-middle font-bold uppercase text-base print:text-sm">
                                            {item.name} {item.type && <span className="text-xs block text-slate-500 mt-1">({item.type})</span>}
                                        </td>
                                        <td className="border border-black p-3 text-center align-middle font-medium uppercase text-sm print:text-xs">
                                            {item.locationString}
                                        </td>
                                        <td className="border border-black p-3 text-center align-middle">
                                            {item.displayPhoto ? (
                                                <div className="flex justify-center items-center h-full py-2">
                                                    <a href={item.displayPhoto} target="_blank" rel="noopener noreferrer">
                                                        <img
                                                            src={item.displayPhoto}
                                                            alt={item.name}
                                                            className="max-h-[100px] object-contain block mx-auto border border-slate-200 shadow-sm print:max-h-[80px]"
                                                        />
                                                    </a>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic text-sm">Sin Evidencia</span>
                                            )}
                                        </td>
                                        <td className="border border-black p-3 text-center align-middle font-medium uppercase text-sm print:text-xs">
                                            {item.medida}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                    No hay elementos registrados con fotografías para mostrar en el resumen.
                </div>
            )}
        </div>
    );
}
