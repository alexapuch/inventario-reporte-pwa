export const LayoutEngine = {
    generate(zones, companyConfig) {
        const { shape } = companyConfig; // 'rectangle', 'L', 'T'
        const width = 800;
        const height = 600;

        // 1. Enrich Data (Classify & Count Signals)
        const richZones = zones.map(z => {
            const type = classifyZoneType(z.name);
            const signals = mapChecklistToSignals(z.items || []); // Assuming z.items contains checklist items for this zone
            return {
                ...z,
                tipo_espacio: type,
                senaleticas: signals,
                // Simulate area logic if not present
                area_m2: z.area_m2 || Math.round(Math.random() * 20 + 10)
            };
        });

        // 2. Global Layout (Positioning)
        // We still need to decide WHERE on the canvas each zone goes.
        // We will use the previous Template logic for this step.
        const templateSlots = getTemplateSlots(shape, width, height);
        const placedZones = distributeZonesToSlots(richZones, templateSlots);

        // 3. Internal Generation (Walls & Signals)
        const finalZones = placedZones.map(zone => {
            // Generate Walls based on coordinates
            const walls = generateWalls(zone);

            // Distribute Signals within the zone
            const calculatedSignals = distributeSenaleticas(
                zone.x, zone.y, zone.w, zone.h,
                zone.senaleticas
            );

            return {
                ...zone,
                walls, // Now a PATH string
                renderedSignals: calculatedSignals
            };
        });

        // 4. Generate Outer Shell
        const outerShell = generateOuterShell(finalZones);

        return {
            zones: finalZones,
            outerShell
        };
    }
};

// --- User Constants ---
const COLORES = {
    'extintor': '#ff4444',
    'salida_emergencia': '#00cc44',
    'primeros_auxilios': '#0088ff',
    'prohibido_fumar': '#ff0000',
    'punto_reunion': '#ffaa00',
    'riesgo_electrico': '#ffdd00',
    'sanitarios': '#4488ff',
    'solo_personal_autorizado': '#ff6600',
    'default': '#ff6b35'
};

// --- 1. Classification & Mapping ---
function classifyZoneType(name) {
    if (!name) return 'abierta';
    const n = name.toLowerCase();
    // 'cerrada', 'abierta', 'semi-abierta'
    if (n.includes('cocina') || n.includes('baño') || n.includes('oficina') || n.includes('bodega') || n.includes('frío')) return 'cerrada';
    if (n.includes('barra') || n.includes('caja') || n.includes('recepción')) return 'semi-abierta';
    return 'abierta'; // Comedor, Terraza, etc.
}

function mapChecklistToSignals(items) {
    // Map existing checklist text to signal types
    // Since we don't have the real DB structure with 'cantidad', we infer from item count or name
    // For MVP, we simulate: if item name contains "Extintor", add to count.

    // Fallback: If no items, simulate random signals for demo purposes as user requested "Automated"
    if (!items || items.length === 0) {
        return generateRandomSignals();
    }

    const counts = {};
    const keywords = {
        'extintor': 'extintor',
        'fuego': 'extintor',
        'salida': 'salida_emergencia',
        'evacuación': 'salida_emergencia',
        'botiquín': 'primeros_auxilios',
        'auxilio': 'primeros_auxilios',
        'fumar': 'prohibido_fumar',
        'tabaco': 'prohibido_fumar',
        'eléctrico': 'riesgo_electrico',
        'baño': 'sanitarios',
        'wc': 'sanitarios'
    };

    items.forEach(item => {
        const text = (item.name || item.title || '').toLowerCase();
        for (const [key, type] of Object.entries(keywords)) {
            if (text.includes(key)) {
                counts[type] = (counts[type] || 0) + 1;
            }
        }
    });

    return Object.entries(counts).map(([tipo, cantidad]) => ({ tipo, cantidad }));
}

function generateRandomSignals() {
    // Simulation for demo if data is missing
    const opts = ['extintor', 'salida_emergencia', 'prohibido_fumar'];
    const signals = [];
    opts.forEach(type => {
        if (Math.random() > 0.5) {
            signals.push({ type, cantidad: Math.ceil(Math.random() * 2) });
        }
    });
    return signals;
}

// --- 2. Positioning (Randomized Strategies) ---

function getTemplateSlots(shape, W, H) {
    // Strategy Selector
    const strategies = ['GRID_VARIED', 'PERIMETER_HUB', 'SLICED_FLOW'];
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];

    console.log("Selected Layout Strategy:", strategy);

    const margin = 60;
    let slots = [];

    if (strategy === 'PERIMETER_HUB') {
        // "Perimeter Hub": One large central zone, surrounded by smaller ones
        // Great for Restaurants (Dining in middle, Kitchen/Bath on edges)
        const hubMargin = 100;

        // Central Hub
        slots.push({
            id: 'hub',
            x: hubMargin, y: hubMargin,
            w: W - (hubMargin * 2), h: H - (hubMargin * 2),
            preferredTypes: ['abierta', 'semi-abierta'], // Dining, Sales
            occupied: false,
            isHub: true
        });

        // Top Strip (3 slots)
        const topH = hubMargin - margin;
        const topW = (W - margin * 2) / 3;
        for (let i = 0; i < 3; i++) {
            slots.push({
                x: margin + (i * topW), y: margin,
                w: topW, h: topH,
                preferredTypes: ['cerrada'], // Kitchen, Storage
                occupied: false
            });
        }

        // Bottom Strip (3 slots)
        const botY = H - hubMargin;
        for (let i = 0; i < 3; i++) {
            slots.push({
                x: margin + (i * topW), y: botY,
                w: topW, h: topH,
                preferredTypes: ['cerrada', 'semi-abierta'],
                occupied: false
            });
        }

        // Left/Right Strips (Vertical)
        const sideH = (H - (hubMargin * 2)) / 2;
        const sideW = hubMargin - margin;

        // Left
        slots.push({ x: margin, y: hubMargin, w: sideW, h: sideH, preferredTypes: ['cerrada'], occupied: false });
        slots.push({ x: margin, y: hubMargin + sideH, w: sideW, h: sideH, preferredTypes: ['cerrada'], occupied: false });

        // Right
        slots.push({ x: W - hubMargin, y: hubMargin, w: sideW, h: sideH, preferredTypes: ['cerrada'], occupied: false });
        slots.push({ x: W - hubMargin, y: hubMargin + sideH, w: sideW, h: sideH, preferredTypes: ['cerrada'], occupied: false });

    } else if (strategy === 'SLICED_FLOW') {
        // "Sliced Flow": Divides space into 3 vertical columns, 
        // Side columns are split into rows. Center is a corridor/main area.
        const colW = (W - margin * 2) / 3;

        // Col 0 (Left - Service/Closed)
        const leftRows = 3;
        const leftH = (H - margin * 2) / leftRows;
        for (let i = 0; i < leftRows; i++) {
            slots.push({
                x: margin, y: margin + (i * leftH),
                w: colW, h: leftH,
                preferredTypes: ['cerrada'],
                occupied: false
            });
        }

        // Col 1 (Center - Open)
        // Split into 2 big areas (Top/Bottom)
        const centerH = (H - margin * 2) / 2;
        slots.push({ x: margin + colW, y: margin, w: colW, h: centerH, preferredTypes: ['abierta', 'semi-abierta'], occupied: false });
        slots.push({ x: margin + colW, y: margin + centerH, w: colW, h: centerH, preferredTypes: ['abierta', 'semi-abierta'], occupied: false });

        // Col 2 (Right - Mix)
        const rightRows = 2; // Bigger rooms
        const rightH = (H - margin * 2) / rightRows;
        for (let i = 0; i < rightRows; i++) {
            slots.push({
                x: margin + colW * 2, y: margin + (i * rightH),
                w: colW, h: rightH,
                preferredTypes: ['semi-abierta', 'abierta'],
                occupied: false
            });
        }

    } else {
        // 'GRID_VARIED' (Default 3x3 but with random merges)
        // Standard 3x3
        const cw = (W - margin * 2) / 3;
        const ch = (H - margin * 2) / 3;

        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                // Determine preference based on position (Edges = Closed, Center = Open)
                let types = ['semi-abierta'];
                if (r === 1 && c === 1) types = ['abierta']; // Center
                else if (r === 0 || r === 2) types = ['cerrada', 'semi-abierta']; // Top/Bottom edges

                slots.push({
                    row: r, col: c,
                    x: margin + c * cw,
                    y: margin + r * ch,
                    w: cw, h: ch,
                    preferredTypes: types,
                    occupied: false
                });
            }
        }

        // Random Merge Logic (Combine 2 horizontal slots)
        if (Math.random() > 0.5) {
            // Try to merge bottom center (2,1) and bottom right (2,2) for a bigger kitchen?
            // Simple hack: just adjust one slot size and mark other as null/occupied
            // For robustness for this MVP, we stick to grid but maybe jitter positions slightly
            slots.forEach(s => {
                // Jitter size 5%
                s.w = s.w * (0.95 + Math.random() * 0.1);
                s.h = s.h * (0.95 + Math.random() * 0.1);
            });
        }
    }

    return slots;
}

function distributeZonesToSlots(zones, slots) {
    const assigned = [];

    // SHUFFLE ZONES to ensure variety every time
    // But keep "Cerrada" zones at the start of the array to prioritize them for edge assignments
    const constructionZones = zones.filter(z => z.tipo_espacio === 'cerrada');
    const semiZones = zones.filter(z => z.tipo_espacio === 'semi-abierta');
    const openZones = zones.filter(z => z.tipo_espacio === 'abierta');

    // Helper to shuffle array
    const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

    // Queue: Closed -> Semi -> Open (To fill corners/edges first)
    const queue = [...shuffle(constructionZones), ...shuffle(semiZones), ...shuffle(openZones)];

    // Sort slots: Hubs/Big slots last? No, we want to match TYPES.

    queue.forEach(zone => {
        // 1. Try to find a slot that PREFERS this type
        // Randomize the candidates so we don't always pick top-left
        let candidates = slots.filter(s => !s.occupied && s.preferredTypes.includes(zone.tipo_espacio));

        let slot = null;
        if (candidates.length > 0) {
            slot = candidates[Math.floor(Math.random() * candidates.length)];
        } else {
            // 2. Fallback: Any empty slot (Randomly selected)
            const emptySlots = slots.filter(s => !s.occupied);
            if (emptySlots.length > 0) {
                slot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
            }
        }

        if (slot) {
            slot.occupied = true;
            // Center the zone in the slot (margin logic)
            // Or fill it? Let's fill the slot for "Complete" look
            assigned.push({
                ...zone,
                x: slot.x,
                y: slot.y,
                w: slot.w,
                h: slot.h
            });
        } else {
            console.warn("No slot found for zone:", zone.name);
            // Optional: Create an overflow slot or ignore
        }
    });

    return assigned;
}

// --- 3. Internal Generation Implementations ---

// SMARTER ALGORITHM: Distribute Signals
function distributeSenaleticas(x, y, w, h, senaleticas) {
    const result = [];
    const padding = 15;

    // Categorize Signals
    const wallTypes = ['extintor', 'primeros_auxilios', 'manguera', 'tablero', 'riesgo_electrico'];
    const exitTypes = ['salida_emergencia', 'ruta_evacuacion'];
    const centerTypes = ['detector_humo', 'lampara_emergencia', 'prohibido_fumar', 'punto_reunion'];

    const wallItems = [];
    const exitItems = [];
    const centerItems = [];

    senaleticas.forEach(s => {
        for (let i = 0; i < s.cantidad; i++) {
            const item = { ...s, id: Math.random() }; // Individual instance
            if (exitTypes.includes(s.tipo)) exitItems.push(item);
            else if (wallTypes.includes(s.tipo)) wallItems.push(item);
            else centerItems.push(item);
        }
    });

    // 1. WALL PLACEMENT (Perimeter)
    if (wallItems.length > 0) {
        wallItems.forEach((item, i) => {
            let sx, sy;
            const side = i % 3;
            const offset = (Math.floor(i / 3) + 1) * 30;

            if (side === 0) { // LEFT Wall
                sx = x + 5;
                sy = y + 20 + offset;
            } else if (side === 1) { // RIGHT Wall
                sx = x + w - 5;
                sy = y + 20 + offset;
            } else { // TOP Wall
                sx = x + 20 + offset;
                sy = y + 5;
            }

            if (sx > x + w) sx = x + w - 10;
            if (sy > y + h) sy = y + h - 10;

            result.push({
                x: sx, y: sy,
                color: COLORES[item.tipo] || COLORES['default'],
                type: item.tipo
            });
        });
    }

    // 2. EXIT PLACEMENT (Near "Door"/Bottom)
    if (exitItems.length > 0) {
        const doorX = x + w / 2;
        const doorY = y + h - 15;

        exitItems.forEach((item, i) => {
            const offsetX = (i - (exitItems.length - 1) / 2) * 20;
            result.push({
                x: doorX + offsetX,
                y: doorY,
                color: COLORES[item.tipo] || COLORES['default'],
                type: item.tipo
            });
        });
    }

    // 3. CENTER/CEILING PLACEMENT
    if (centerItems.length > 0) {
        const total = centerItems.length;
        const cols = Math.ceil(Math.sqrt(total));

        const innerX = x + padding + 10;
        const innerY = y + padding + 10;
        const innerW = w - (padding * 2) - 20;
        const innerH = h - (padding * 2) - 20;

        const spacingX = innerW / (cols + 1);
        const rows = Math.ceil(total / cols);
        const spacingY = innerH / (rows + 1);

        centerItems.forEach((item, i) => {
            const row = Math.floor(i / cols);
            const col = i % cols;

            const sx = innerX + (spacingX * (col + 0.5));
            const sy = innerY + (spacingY * (row + 0.5));

            result.push({
                x: sx, y: sy,
                color: COLORES[item.tipo] || COLORES['default'],
                type: item.tipo
            });
        });
    }

    return result;
}

// VISUAL PERFECTION: Outer Shell
function generateOuterShell(zones) {
    if (zones.length === 0) return null;

    // Calculate Bounding Box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    zones.forEach(z => {
        if (z.x < minX) minX = z.x;
        if (z.y < minY) minY = z.y;
        if (z.x + z.w > maxX) maxX = z.x + z.w;
        if (z.y + z.h > maxY) maxY = z.y + z.h;
    });

    // Add padding for the shell
    const p = 0; // Tight fit creates better "building" look
    const X = Math.round(minX - p);
    const Y = Math.round(minY - p);
    const W = Math.round(maxX - minX + p * 2);
    const H = Math.round(maxY - minY + p * 2);

    // Create Path with Entrance Gap (Bottom Center)
    const doorW = 60;
    const midX = Math.round(X + W / 2);
    const bottomY = Y + H;

    // M top-left L top-right L bottom-right L door-right M door-left L bottom-left Z
    return `M ${X} ${Y} L ${X + W} ${Y} L ${X + W} ${bottomY} L ${midX + doorW / 2} ${bottomY} M ${midX - doorW / 2} ${bottomY} L ${X} ${bottomY} Z`;
}

// VISUAL PERFECTION: Walls as SVG Paths
function generateWalls(zone) {
    const { x, y, w, h, tipo_espacio } = zone;

    // Ensure Integers
    const ix = Math.round(x);
    const iy = Math.round(y);
    const iw = Math.round(w);
    const ih = Math.round(h);

    if (tipo_espacio === 'cerrada') {
        // Full box with door gap at bottom
        const doorW = 40;
        const midX = Math.round(ix + iw / 2);
        const bottomY = iy + ih;

        // Start Top-Left -> Top-Right -> Bottom-Right -> Door-Right ... Door-Left -> Bottom-Left -> Close
        return `M ${ix} ${bottomY} L ${ix} ${iy} L ${ix + iw} ${iy} L ${ix + iw} ${bottomY} L ${midX + doorW / 2} ${bottomY} M ${midX - doorW / 2} ${bottomY} L ${ix} ${bottomY}`;
    }

    if (tipo_espacio === 'semi-abierta') {
        // L-shape Corner (Top-Left)
        // M y+h*0.3 x L x y L x+w*0.3 y
        const legH = Math.round(ih * 0.3);
        const legW = Math.round(iw * 0.3);
        return `M ${ix} ${iy + legH} L ${ix} ${iy} L ${ix + legW} ${iy}`;
    }

    // Abierta = No walls
    return '';
}
