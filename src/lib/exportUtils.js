import { STATUS_LABELS, SPECIAL_ZONE_CHANGE } from '../data/constants';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const exportToCSV = async (companyName, items) => {
    // NOTE: Function name kept as 'exportToCSV' to avoid breaking imports, but it now generates an XLSX.
    try {

        // Filter out Special Zone Items
        const validItems = items.filter(i => i.location !== SPECIAL_ZONE_CHANGE);

        // Create Workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Inventario');

        // Define Columns
        worksheet.columns = [
            { header: 'Categoría', key: 'category', width: 15 },
            { header: 'Nombre', key: 'name', width: 35 },
            { header: 'Tipo', key: 'type', width: 15 },
            { header: 'Ubicación', key: 'location', width: 25 },
            { header: 'Cantidad', key: 'count', width: 10, style: { alignment: { horizontal: 'center' } } },
            { header: 'Estado', key: 'status', width: 15 },
            { header: 'Notas', key: 'notes', width: 50, style: { alignment: { wrapText: true, vertical: 'top' } } } // Wrap Text Enabled!
        ];

        // Style Header Row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

        // Define Icons helper
        const ITEM_ICONS = {
            'Ruta de Evacuación': '🏃',
            'Salida de Emergencia': '🚪',
            'Riesgo Eléctrico': '⚡',
            'Prohibido Fumar': '🚭',
            'No Pasar': '⛔',
            'Botiquín': '🩹',
            'Qué hacer en caso de sismo/incendio': '📜',
            'Números de Emergencia': '☎️',
            'Extintor': '🧯',
            'Detector de Humo': '🔔',
            'Lámpara de Emergencia': '🔦',
            'Alarma': '🚨'
        };

        // Add Data
        validItems.forEach(item => {
            const statusLabel = STATUS_LABELS[item.status]?.label || item.status;
            const icon = ITEM_ICONS[item.name] || '';
            const displayName = icon ? `${icon} ${item.name}` : item.name;

            worksheet.addRow({
                category: item.categoryId === 'signage' ? 'Señalética' : 'Equipo',
                name: displayName,
                type: item.type || '-',
                location: item.location,
                count: Number(item.count) || 0,
                status: statusLabel,
                notes: item.notes || ''
            });
        });

        // Generate Buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Create Blob
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        // Format Filename
        const timestamp = new Date();
        const dateStr = timestamp.toISOString().slice(0, 10);
        const timeStr = timestamp.toTimeString().slice(0, 5).replace(/:/g, '-');
        const sanitizedCompanyName = companyName.replace(/[^a-zA-Z0-9 \-_]/g, '').trim().replace(/\s+/g, '_');
        const fileName = `Inventario_${sanitizedCompanyName}_${dateStr}_${timeStr}.xlsx`;

        // Download
        saveAs(blob, fileName);
        return true;
    } catch (error) {
        console.error("Error exporting Excel:", error);
        alert("Error al generar Excel: " + (error.message || "Problema desconocido"));
        return false;
    }
};
