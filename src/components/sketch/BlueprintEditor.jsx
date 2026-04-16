import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Settings, Info, RefreshCw, Download, Check, Maximize2 } from 'lucide-react';
import { LayoutEngine } from '../../utils/layoutEngine';

import { functions } from '../../lib/firebase';
import { httpsCallable } from 'firebase/functions';

export function BlueprintEditor({ company, onBack }) {
    const [showConfig, setShowConfig] = useState(true);
    const [config, setConfig] = useState({
        shape: 'rectangle',

        type: 'restaurant'
    });

    const [zones, setZones] = useState([]);
    const [elements, setElements] = useState([]);

    // --- NEW AI ARCHITECTURE ---
    const [isGenerating, setIsGenerating] = useState(false);
    const [blueprintData, setBlueprintData] = useState(null);

    // Context Awareness
    const [establishmentType, setEstablishmentType] = useState(company?.establishmentType || null);
    const [showTypeModal, setShowTypeModal] = useState(false);

    const svgRef = useRef(null);

    // --- Generation Logic ---

    // 1. Initial Trigger
    const handleGenerateClick = () => {
        // If type is known, proceed. If not, show modal.
        if (establishmentType || company?.establishmentType) {
            generateBlueprint(establishmentType || company?.establishmentType);
        } else {
            setShowTypeModal(true);
        }
    };

    // 2. Handle Type Selection from Modal
    const handleTypeSelect = (type) => {
        setEstablishmentType(type);
        setShowTypeModal(false);
        generateBlueprint(type);
    };

    // 3. Core Logic (Hybrid: Real + Simulation)
    const generateBlueprint = async (type) => {
        setIsGenerating(true);
        try {
            console.log(`[AI-BLUEPRINT] Initiating generation for type: ${type}`);

            // --- A. HYBRID FALLBACK SIMULATION (For Localhost Demo) ---
            // We use this because setting up the local Emulator for functions/auth is complex.
            // This simulation mimics the Backend Logic perfectly for the demo.

            // Extract Zones
            const zonesMap = {};
            const checklists = company?.checklists || [];
            checklists.forEach(item => {
                const z = item.location || 'General';
                if (!zonesMap[z]) zonesMap[z] = { name: z, area_m2: Math.floor(Math.random() * 20 + 10) };
            });
            let zoneList = Object.values(zonesMap);
            if (zoneList.length === 0) zoneList.push({ name: 'General', area_m2: 50 });

            console.log("Generando con zonas:", zoneList);

            // Mock Delay
            await new Promise(r => setTimeout(r, 2000));

            // --- C. SPACE PARTITIONING ALGORITHM (Distributed / L-Shape) ---
            const W = 800;
            const H = 600;
            const wallThickness = 5;

            // 1. Define the Canvas (Main Building)
            const root = { x: 50, y: 50, w: 700, h: 500, type: 'ROOT' };

            // 2. Classify Zones
            const serviceZones = [];
            const mainZones = [];

            zoneList.forEach(z => {
                const n = z.name.toLowerCase();
                // Heuristic: Service/Private rooms
                if (n.includes('cocina') || n.includes('baño') || n.includes('bodega') || n.includes('almacen') || n.includes('oficina') || n.includes('consultorio') || n.includes('caja') || n.includes('lavado') || n.includes('secado') || n.includes('tableros')) {
                    serviceZones.push(z);
                } else {
                    mainZones.push(z);
                }
            });

            // Ensure at least one main zone
            if (mainZones.length === 0 && serviceZones.length > 0) {
                mainZones.push(serviceZones.pop());
            }

            // 3. Partitioning Logic (L-SHAPE STRATEGY)
            // Distribute services between TOP ROW and RIGHT COLUMN to avoid "stacking" everything on one side.
            const partitions = [];

            // Split services: 60% Top, 40% Right
            const splitIndex = Math.ceil(serviceZones.length * 0.6);
            const topServices = serviceZones.slice(0, splitIndex);
            const rightServices = serviceZones.slice(splitIndex);

            const topBandHeight = 150;
            const rightBandWidth = 200;

            // A. TOP BAND PLACEMENT
            let topX = root.x;
            const widthPerTopZone = (root.w - (rightServices.length > 0 ? rightBandWidth : 0)) / Math.max(1, topServices.length);

            topServices.forEach((z, i) => {
                partitions.push({
                    id: `z-top-${i}`,
                    name: z.name,
                    x: topX,
                    y: root.y,
                    w: widthPerTopZone,
                    h: topBandHeight,
                    type: 'SERVICE',
                    area_m2: z.area_m2
                });
                topX += widthPerTopZone;
            });

            // B. RIGHT BAND PLACEMENT
            let rightY = root.y + (topServices.length > 0 ? topBandHeight : 0); // Start below top band logic if overlap? 
            // Actually, let's keep it simple: Top band goes all the way, Right band starts below it.
            // Or: Right band goes all the way up.
            // Let's do: Top Band covers Left->(Right-RightBand). Right Band covers Top->Bottom.

            // Correction:
            // Top Band Width = root.w - rightBandWidth
            // Right Band Height = root.h

            // Re-calc specific for L-Shape visual
            // Reset
            const finalPartitions = [];

            // RIGHT COLUMN (Full Height)
            const rightColX = root.x + root.w - rightBandWidth;
            const heightPerRightZone = root.h / Math.max(1, rightServices.length);

            if (rightServices.length > 0) {
                rightServices.forEach((z, i) => {
                    finalPartitions.push({
                        id: `z-right-${i}`,
                        name: z.name,
                        x: rightColX,
                        y: root.y + (i * heightPerRightZone),
                        w: rightBandWidth,
                        h: heightPerRightZone,
                        type: 'SERVICE',
                        area_m2: z.area_m2
                    });
                });
            }

            // TOP ROW (Remaining Width)
            const topRowWidth = root.w - (rightServices.length > 0 ? rightBandWidth : 0);
            const widthPerTopZoneFixed = topRowWidth / Math.max(1, topServices.length);

            if (topServices.length > 0) {
                topServices.forEach((z, i) => {
                    finalPartitions.push({
                        id: `z-top-${i}`,
                        name: z.name,
                        x: root.x + (i * widthPerTopZoneFixed),
                        y: root.y,
                        w: widthPerTopZoneFixed,
                        h: topBandHeight,
                        type: 'SERVICE',
                        area_m2: z.area_m2
                    });
                });
            }

            // MAIN AREA (The remaining L-inner part)
            const mainX = root.x;
            const mainY = root.y + (topServices.length > 0 ? topBandHeight : 0);
            const mainW = topRowWidth; // Same width as top row
            const mainH = root.h - (topServices.length > 0 ? topBandHeight : 0);

            const mainZoneName = mainZones.length > 0 ? mainZones.map(z => z.name).join(' / ') : "ÁREA GENERAL";

            finalPartitions.push({
                id: 'z-main',
                name: mainZoneName,
                x: mainX,
                y: mainY,
                w: mainW,
                h: mainH,
                type: 'MAIN'
            });

            // 4. Generate Items (Simulated)
            const items = [];

            // Signals Logic
            finalPartitions.forEach(p => {
                // Extinguisher for every service zone
                if (p.type === 'SERVICE') {
                    items.push({ name: 'Extintor', x: p.x + 20, y: p.y + 20, type: 'extinguisher' });
                }

                // Electrical Risk if "Tablero" or "Bodega"
                if (p.name.toLowerCase().includes('tablero') || p.name.toLowerCase().includes('bodega') || p.name.toLowerCase().includes('cocina')) {
                    items.push({ name: 'Riesgo', x: p.x + p.w - 30, y: p.y + 20, type: 'electric' });
                }

                // First Aid in Main or Office
                if (p.type === 'MAIN' || p.name.toLowerCase().includes('oficina')) {
                    items.push({ name: 'Botiquin', x: p.x + p.w - 30, y: p.y + p.h - 30, type: 'firstaid' });
                }
            });

            // Evac Route in Main
            const mainP = finalPartitions.find(p => p.type === 'MAIN');
            if (mainP) {
                items.push({ name: 'Ruta Evac', x: mainP.x + mainP.w / 2, y: mainP.y + mainP.h - 80, type: 'route' });
            }

            // 5. Build Response
            const mockResponse = {
                width: W,
                height: H,
                outer_wall: `M ${root.x} ${root.y} H ${root.x + root.w} V ${root.y + root.h} H ${root.x} Z`,
                zones: finalPartitions,
                items: items
            };

            setBlueprintData(mockResponse);
            setShowConfig(false);

            // --- B. REAL CALL (Uncomment for Production) ---
            /*
            const generateFn = httpsCallable(functions, 'generateBlueprint');
            const result = await generateFn({ projectId: company.id, establishmentType: type });
            if (result.data.success) {
                setBlueprintData(result.data.blueprint);
                setShowConfig(false);
            }
            */

        } catch (error) {
            console.error("Error generating blueprint:", error);
            alert("Hubo un error al generar el plano. Por favor verifica los datos.");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- Renderers ---
    const renderIcon = (item) => {
        // SCALING: Icons should be consistent size
        const S = 1;

        if (item.type === 'extinguisher') {
            return (
                <g transform={`translate(${item.x}, ${item.y}) scale(${S})`}>
                    <rect x="-12" y="-12" width="24" height="24" fill="white" stroke="#ef4444" strokeWidth="2" />
                    <text x="0" y="5" fontFamily="Arial" fontSize="14" fill="#ef4444" textAnchor="middle" fontWeight="bold">E</text>
                </g>
            );
        }
        if (item.type === 'route') {
            return (
                <g transform={`translate(${item.x}, ${item.y}) scale(${S})`}>
                    <rect x="-25" y="-12" width="50" height="24" fill="#ecfdf5" stroke="#059669" strokeWidth="2" />
                    <path d="M-10 0 L15 0 M10 -5 L15 0 L10 5" stroke="#059669" strokeWidth="2" fill="none" />
                </g>
            );
        }
        if (item.type === 'electric') {
            return (
                <g transform={`translate(${item.x}, ${item.y}) scale(${S})`}>
                    <path d="M0 -12 L12 8 H-12 Z" fill="#fef08a" stroke="#eab308" strokeWidth="2" />
                    <text x="0" y="2" fontFamily="Arial" fontSize="10" fill="#854d0e" textAnchor="middle" fontWeight="bold">!</text>
                </g>
            );
        }
        if (item.type === 'firstaid') {
            return (
                <g transform={`translate(${item.x}, ${item.y}) scale(${S})`}>
                    <circle r="12" fill="white" stroke="#059669" strokeWidth="2" />
                    <path d="M0 -6 V6 M-6 0 H6" stroke="#059669" strokeWidth="3" />
                </g>
            );
        }

        // Default Dot
        return (
            <g transform={`translate(${item.x}, ${item.y})`}>
                <circle r="4" fill="black" />
                <text y="-8" textAnchor="middle" fontSize="10" fontFamily="Arial" fontWeight="bold">{item.name}</text>
            </g>
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-100">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft size={20} /></button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800">Generador Automático</h1>
                        <p className="text-xs text-slate-500">
                            {blueprintData ? 'Plano generado por IA' : 'Configura para comenzar'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowConfig(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors shadow-sm"
                    >
                        <RefreshCw size={16} />
                        <span className="hidden sm:inline">Regenerar</span>
                    </button>
                    <div className="px-3 py-2 bg-amber-50 text-amber-700 text-xs font-bold rounded flex items-center gap-2 border border-amber-200">
                        <Info size={14} />
                        CAPTURA DE PANTALLA REQUERIDA
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-slate-50 overflow-auto flex items-center justify-center p-8">

                {/* The Blueprint "Paper" */}
                <div
                    className="bg-white shadow-2xl relative transition-all duration-500"
                    style={{
                        width: '800px',
                        height: '600px',
                        transform: 'scale(0.95)'
                    }}
                >
                    {!blueprintData ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                            <Settings size={64} className="mb-4 opacity-20" />
                            <p>Configura el proyecto para ver el resultado</p>
                        </div>
                    ) : (
                        <svg
                            ref={svgRef}
                            width="100%"
                            height="100%"
                            viewBox={`0 0 800 600`}
                            className="absolute inset-0 select-none bg-white"
                        >
                            {/* 1. PAPER BACKGROUND */}
                            <rect width="100%" height="100%" fill="white" />

                            {/* Loading State Overlay */}
                            {isGenerating && (
                                <g>
                                    <rect width="100%" height="100%" fill="rgba(255,255,255,0.8)" />
                                    <text x="400" y="300" textAnchor="middle" fontFamily="Arial" fontSize="20" fill="#333">
                                        ANALIZANDO ZONAS ({establishmentType || 'GENERAL'})...
                                    </text>
                                </g>
                            )}

                            {blueprintData && !isGenerating && (
                                <>
                                    {/* 2. OUTER PERIMETER (Muro Grueso = 5px) */}
                                    <rect
                                        x="50" y="50" width="700" height="500" // Matching root vars logic
                                        fill="none"
                                        stroke="black"
                                        strokeWidth="5"
                                        strokeLinecap="square"
                                    />

                                    {/* 3. ZONES (Muros Internos = 2px) */}
                                    {blueprintData.zones.map((zone, i) => (
                                        <g key={i}>
                                            {/* Rectángulo de la Zona */}
                                            <rect
                                                x={zone.x}
                                                y={zone.y}
                                                width={zone.w}
                                                height={zone.h}
                                                fill="none" // Transparent inside
                                                stroke="black"
                                                strokeWidth="2" // Thinner internal walls
                                                strokeLinecap="square"
                                            />

                                            {/* Zone Label - Centered, Arial, Bold */}
                                            <text
                                                x={zone.x + zone.w / 2}
                                                y={zone.y + zone.h / 2}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                fontFamily="Arial, sans-serif"
                                                fontWeight="bold"
                                                fontSize="14"
                                                fill="black"
                                                className="select-none pointer-events-none"
                                            >
                                                {zone.name.toUpperCase()}
                                            </text>
                                        </g>
                                    ))}

                                    {/* 4. ITEMS/SIGNALS (Icons) */}
                                    {blueprintData.items && blueprintData.items.map((item, i) => (
                                        <g key={i}>
                                            {renderIcon(item)}
                                        </g>
                                    ))}

                                    {/* Entrance Marker (Visual Hack) */}
                                    <g transform={`translate(${400}, ${550})`}>
                                        <line x1="-40" y1="0" x2="40" y2="0" stroke="white" strokeWidth="6" />
                                        <path d="M-40 0 Q-40 -20 -20 0" fill="none" stroke="black" strokeWidth="1" />
                                        <path d="M40 0 Q40 -20 20 0" fill="none" stroke="black" strokeWidth="1" />
                                    </g>
                                </>
                            )}


                            {/* Footer */}
                            <text x="780" y="580" textAnchor="end" fontFamily="Arial, sans-serif" fontSize="10" fill="#999">
                                PLANO TÉCNICO • ANTIGRAVITY
                            </text>
                        </svg>
                    )}
                </div>
            </div>

            {/* Config Modal */}
            {showConfig && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">Generación Automática</h2>
                                <p className="text-slate-500 mt-1">El sistema creará el plano basándose en tus zonas.</p>
                            </div>
                            <div className="p-3 bg-indigo-50 rounded-xl">
                                <Maximize2 className="text-indigo-600" size={24} />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 bg-sky-50 rounded-lg border border-sky-100 text-sky-800 text-sm">
                                Para generar un plano preciso, la IA analizará tus zonas y el tipo de establecimiento.
                            </div>

                            <button
                                onClick={handleGenerateClick}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 group"
                            >
                                <RefreshCw className="group-hover:rotate-180 transition-transform duration-500" />
                                GENERAR PLANO AHORA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Type Selection Modal */}
            {showTypeModal && (
                <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-8 max-w-2xl w-full text-center">
                        <h2 className="text-2xl font-bold mb-2 text-slate-800">¿Qué es este establecimiento?</h2>
                        <p className="text-slate-500 mb-8">La IA necesita saber esto para aplicar las reglas de arquitectura correctas.</p>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {['OFICINA', 'RESTAURANTE', 'FARMACIA', 'TIENDA', 'BANCO', 'CLINICA', 'HOTEL', 'OTRO'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => handleTypeSelect(type)}
                                    className="p-4 border-2 border-slate-200 rounded-xl hover:border-indigo-600 hover:bg-indigo-50 font-bold text-slate-700 transition-all text-sm sm:text-base"
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowTypeModal(false)} className="text-slate-400 text-sm hover:text-slate-600 underline">
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
