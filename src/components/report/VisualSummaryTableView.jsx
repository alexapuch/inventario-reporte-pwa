import React, { useRef } from 'react';
import { ArrowLeft, Printer, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/Button';

export function VisualSummaryTableView({ company, items, onBack }) {
    const isStandardZone = i => i.location !== 'CAMBIOS A REALIZAR';

    const getLogoPath = (name, categoryId) => {
        const normalized = (name || '')
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        return `/logos/${categoryId}-${normalized}.png`;
    };

    const groupItems = (baseItems, categoryId) => {
        const filteredItems = baseItems.filter(i => isStandardZone(i) && i.categoryId === categoryId);
        const grouped = {};

        filteredItems.forEach(item => {
            const key = item.name;
            if (!grouped[key]) {
                grouped[key] = {
                    name: item.name,
                    uniqueId: `visual-${categoryId}-${item.id}`,
                    count: 0,
                    locations: new Set(),
                };
            }
            
            // Add count (default to 1 if not specified)
            grouped[key].count += (parseInt(item.count) || 1);
            
            // Add location
            if (item.location) {
                grouped[key].locations.add(item.location);
            }
        });

        return Object.values(grouped).map(group => {
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
                logo: getLogoPath(group.name, categoryId)
            };
        });
    };

    const signageItems = groupItems(items, 'signage');
    const equipmentItems = groupItems(items, 'equipment');

    return (
        <div className="min-h-screen bg-white p-4 md:p-8">
            <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4 print:hidden">
                <Button variant="ghost" onClick={onBack} className="hover:bg-slate-100 self-start">
                    <ArrowLeft size={20} className="mr-2" /> Volver
                </Button>
                
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="text-center md:text-right">
                        <h1 className="text-2xl font-bold text-slate-800">Tabla Visual (Logotipos)</h1>
                        <p className="text-sm text-slate-500">Resumen con iconos</p>
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-900 border border-slate-300 rounded font-bold hover:bg-slate-200 transition-all shadow-sm"
                        title="Imprimir / Guardar como PDF"
                    >
                        <Printer size={18} />
                        <span>Imprimir</span>
                    </button>
                </div>
            </div>

            <div className="mb-8 print:hidden bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg flex items-start gap-3">
                <ImageIcon className="mt-1 flex-shrink-0" size={20} />
                <div className="text-sm">
                    <strong>Nota sobre las imágenes:</strong> Para diferenciar entre una señalética y un equipo (por ejemplo "botiquín"), ahora debes colocarles un prefijo en el nombre del archivo dentro de <code>public/logos/</code>:
                    <ul className="list-disc ml-5 mt-1 space-y-1">
                        <li>Para <b>Señaléticas</b> usa: <code>signage-[nombre].png</code> (Ej. <code>signage-botiquin.png</code>)</li>
                        <li>Para <b>Equipos</b> usa: <code>equipment-[nombre].png</code> (Ej. <code>equipment-botiquin.png</code>)</li>
                    </ul>
                </div>
            </div>

            <div className="w-full flex flex-col gap-12 print:gap-8">
                {signageItems.length > 0 && (
                    <div className="w-full overflow-x-auto print:overflow-visible">
                        <table className="w-full min-w-[600px] border-collapse border-2 border-black font-sans">
                            <thead>
                                <tr>
                                    <th colSpan="4" className="border-2 border-black p-2 text-center font-bold uppercase tracking-wide bg-white">
                                        INVENTARIO DE SEÑALETICA
                                    </th>
                                </tr>
                                <tr>
                                    <th colSpan="4" className="border-2 border-black p-2 text-center font-bold uppercase tracking-wide bg-white">
                                        {company.name}
                                    </th>
                                </tr>
                                <tr className="bg-[#5B9BD5] text-white">
                                    <th className="border-2 border-black p-3 text-center font-bold uppercase tracking-wide w-[25%]">SEÑALETICA</th>
                                    <th className="border-2 border-black p-3 text-center font-bold uppercase tracking-wide w-[15%]">CANTIDAD</th>
                                    <th className="border-2 border-black p-3 text-center font-bold uppercase tracking-wide w-[45%]">ÁREA</th>
                                    <th className="border-2 border-black p-3 text-center font-bold uppercase tracking-wide w-[15%]">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {signageItems.map((item) => (
                                    <tr key={item.uniqueId} className="h-[120px] print:h-[100px] print:break-inside-avoid bg-white">
                                        <td className="border-2 border-black p-3 text-center align-middle">
                                            <img
                                                src={item.logo}
                                                alt={item.name}
                                                onError={(e) => {
                                                    e.target.onerror = null; 
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'block';
                                                }}
                                                className="max-h-[80px] object-contain block mx-auto print:max-h-[60px]"
                                            />
                                            <span className="hidden text-xs text-slate-500 font-bold uppercase">{item.name}</span>
                                        </td>
                                        <td className="border-2 border-black p-3 text-center align-middle font-medium text-lg print:text-base">
                                            {item.count}
                                        </td>
                                        <td className="border-2 border-black p-3 text-center align-middle font-medium uppercase text-sm print:text-xs">
                                            {item.locationString}
                                        </td>
                                        <td className="border-2 border-black p-3 text-center align-middle font-medium text-lg print:text-base">
                                            {item.count}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {equipmentItems.length > 0 && (
                    <div className="w-full overflow-x-auto print:overflow-visible">
                        <table className="w-full min-w-[600px] border-collapse border-2 border-black font-sans">
                            <thead>
                                <tr>
                                    <th colSpan="4" className="border-2 border-black p-2 text-center font-bold uppercase tracking-wide bg-white">
                                        INVENTARIO DE EQUIPOS DE EMERGENCIA
                                    </th>
                                </tr>
                                <tr>
                                    <th colSpan="4" className="border-2 border-black p-2 text-center font-bold uppercase tracking-wide bg-white">
                                        {company.name}
                                    </th>
                                </tr>
                                <tr className="bg-[#5B9BD5] text-white">
                                    <th className="border-2 border-black p-3 text-center font-bold uppercase tracking-wide w-[25%]">EQUIPOS DE EMERGENCIA</th>
                                    <th className="border-2 border-black p-3 text-center font-bold uppercase tracking-wide w-[15%]">CANTIDAD</th>
                                    <th className="border-2 border-black p-3 text-center font-bold uppercase tracking-wide w-[45%]">ÁREA</th>
                                    <th className="border-2 border-black p-3 text-center font-bold uppercase tracking-wide w-[15%]">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {equipmentItems.map((item) => (
                                    <tr key={item.uniqueId} className="h-[120px] print:h-[100px] print:break-inside-avoid bg-white">
                                        <td className="border-2 border-black p-3 text-center align-middle">
                                            <img
                                                src={item.logo}
                                                alt={item.name}
                                                onError={(e) => {
                                                    e.target.onerror = null; 
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'block';
                                                }}
                                                className="max-h-[80px] object-contain block mx-auto print:max-h-[60px]"
                                            />
                                            <span className="hidden text-xs text-slate-500 font-bold uppercase">{item.name}</span>
                                        </td>
                                        <td className="border-2 border-black p-3 text-center align-middle font-medium text-lg print:text-base">
                                            {item.count}
                                        </td>
                                        <td className="border-2 border-black p-3 text-center align-middle font-medium uppercase text-sm print:text-xs">
                                            {item.locationString}
                                        </td>
                                        <td className="border-2 border-black p-3 text-center align-middle font-medium text-lg print:text-base">
                                            {item.count}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {signageItems.length === 0 && equipmentItems.length === 0 && (
                    <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                        No hay elementos registrados para mostrar en el resumen visual.
                    </div>
                )}
            </div>
        </div>
    );
}
