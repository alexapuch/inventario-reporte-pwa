export const DEFAULT_CATEGORIES = [
    {
        id: 'signage',
        name: 'Señaléticas',
        label: 'Señalética'
    },
    {
        id: 'equipment',
        name: 'Equipos de Emergencia',
        label: 'Equipo'
    }
];

export const PREDEFINED_ZONES = [
    'SITE',
    'CAJAS',
    'CAJEROS',
    'SALA DE ATENCIÓN',
    'CUBÍCULOS',
    'PASILLOS INTERNOS',
    'BAÑOS',
    'COMEDOR',
    'ALMACÉN',
    'ARCHIVO',
    'TABLEROS ELÉCTRICOS',
    'ZONA ASEO',
    'ESCALERAS',
    'CAMBIOS A REALIZAR' // Special Zone (Last Page, No Summary)
];

export const SPECIAL_ZONE_CHANGE = 'CAMBIOS A REALIZAR';

export const CATALOG_ITEMS = {
    signage: [
        { name: 'Ruta de Evacuación' },
        { name: 'Salida de Emergencia' },
        { name: 'Riesgo Eléctrico' },
        { name: 'Prohibido Fumar' },
        { name: 'No Pasar' },
        { name: 'Botiquín' }, // Kept here as per previous, but user also put it in Equipment list in prompt. I will handle Duplicate logic or distinct types. 
        // User Update: "Opción B - Equipos: ... Botiquín". "Opción A: Lista anterior". 
        // I'll keep Botiquin in signage as "Señal de Botiquín" and add "Botiquín" as equipment item.
        { name: 'Qué hacer en caso de sismo/incendio' },
        { name: 'Números de Emergencia' },
        { name: 'Señal de Extintor' },
        { name: 'Válvula de Gas' },
        { name: 'Zona Segura' },
        { name: 'Punto de Reunión' },
        { name: 'Señal de Alarma' }
    ],
    equipment: [
        {
            name: 'Extintor',
            requiresType: true,
            options: ['PQS', 'K', 'CO2']
        },
        { name: 'Detector de Humo' },
        { name: 'Lámpara de Emergencia' },
        { name: 'Alarma' },
        { name: 'Botiquín' }
    ]
};

export const ITEM_STATUSES = {
    GOOD: 'good',
    REGULAR: 'regular',
    BAD: 'bad'
};

export const STATUS_LABELS = {
    [ITEM_STATUSES.GOOD]: { label: 'Bueno', color: 'success', icon: 'CheckCircle' },
    [ITEM_STATUSES.REGULAR]: { label: 'Regular', color: 'warning', icon: 'AlertTriangle' },
    [ITEM_STATUSES.BAD]: { label: 'Malo', color: 'danger', icon: 'XCircle' }
};
