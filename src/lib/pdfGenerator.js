import { jsPDF } from "jspdf";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Loads an image from a URL, resizes it if it exceeds maxSide, and converts it to a Base64 string.
 * Uses fetch + blob to handle Firebase Storage URLs ensuring auth/CORS compatibility.
 * @param {string} url 
 * @param {string} format 'JPEG' or 'PNG'
 * @param {number} quality 0.0 to 1.0 (JPEG only)
 * @param {number} maxSide Maximum width or height in pixels.
 * @returns {Promise<string>} Base64 Data URL
 */
async function loadImageWithCompression(url, format = 'JPEG', quality = 0.6, maxSide = 1200) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        const orientation = getOrientation(buffer);

        // Create Blob from buffer
        const blob = new Blob([buffer]);

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // 1. Calculate New Dimensions (Resize)
                let width = img.naturalWidth;
                let height = img.naturalHeight;

                if (maxSide && (width > maxSide || height > maxSide)) {
                    const ratio = Math.min(maxSide / width, maxSide / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // 2. Check if Browser already handled rotation
                const isExifSideways = [5, 6, 7, 8].includes(orientation);
                const isImgWide = img.naturalWidth > img.naturalHeight;

                // DETECTOR:
                // Rotation 6 (90CW): Expect Tall.
                // If img is Wide -> Browser ignored EXIF. Apply Transform.
                // If img is Tall -> Browser applied EXIF. Reset orientation to 1 (Normal).

                let finalOrientation = orientation;
                if (isExifSideways && !isImgWide) {
                    // Browser already rotated it tall. Treat as normal.
                    finalOrientation = 1;
                }

                // Set Canvas Dimensions based on FINAL orientation (swapping w/h if needed)
                if ([5, 6, 7, 8].includes(finalOrientation)) {
                    canvas.width = height;
                    canvas.height = width;
                } else {
                    canvas.width = width;
                    canvas.height = height;
                }

                // Apply Transformations
                // Note: transforms use the SCALED width/height
                switch (finalOrientation) {
                    case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
                    case 3: ctx.transform(-1, 0, 0, -1, width, height); break;
                    case 4: ctx.transform(1, 0, 0, -1, 0, height); break;
                    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break; // 90 CW + Flip X ? No, 5 is Transpose.
                    // 5: Transpose (flip X then rotate 270 CW? or rotate 90 CW then flip X?) 
                    // Standard EXIF 5: Row 0 is Left, Col 0 is Top.
                    // ctx.transform(0, 1, 1, 0, 0, 0) -> x'=y, y'=x.

                    case 6: ctx.transform(0, 1, -1, 0, height, 0); break; // 90 CW
                    case 7: ctx.transform(0, -1, -1, 0, height, width); break; // 90 CW + Flip X ?
                    case 8: ctx.transform(0, -1, 1, 0, 0, width); break; // 270 CW
                    default: break;
                }

                // Draw Image scaled to new dimensions
                // If orientation is 5-8, we are drawing into a canvas that is HxW, but context is rotated.
                // The drawHeader call usually draws at 0,0 with w,h. 
                // Context transforms handle the coordinate mapping.
                // We must draw with the RESIZED width/height.
                ctx.drawImage(img, 0, 0, width, height);

                if (format === 'PNG') {
                    resolve(canvas.toDataURL('image/png'));
                } else {
                    resolve(canvas.toDataURL('image/jpeg', quality));
                }
            };
            img.onerror = (e) => {
                console.warn(`Browser failed to load image. Format might be unsupported (e.g. HEIC on Windows). URL: ${url}`);
                resolve(null);
            };
            img.src = URL.createObjectURL(blob);
        });
    } catch (error) {
        console.error(`Failed to load/process image: ${url}`, error);
        return null;
    }
}

/**
 * Reads the EXIF orientation from an ArrayBuffer (JPEG).
 */
function getOrientation(buffer) {
    const view = new DataView(buffer);
    if (view.getUint16(0, false) !== 0xFFD8) return -1;
    let length = view.byteLength, offset = 2;
    while (offset < length) {
        if (view.getUint16(offset + 2, false) <= 8) return -1;
        let marker = view.getUint16(offset, false);
        offset += 2;
        if (marker === 0xFFE1) {
            if (view.getUint32(offset += 2, false) !== 0x45786966) return -1;
            let little = view.getUint16(offset += 6, false) === 0x4949;
            offset += view.getUint32(offset + 4, little);
            let tags = view.getUint16(offset, little);
            offset += 2;
            for (let i = 0; i < tags; i++) {
                if (view.getUint16(offset + (i * 12), little) === 0x0112) {
                    return view.getUint16(offset + (i * 12) + 8, little);
                }
            }
        } else if ((marker & 0xFF00) !== 0xFF00) break;
        else offset += view.getUint16(offset, false);
    }
    return -1;
}

/**
 * Generates the Photo Report PDF on the Client Side.
 * @param {object} company - Company data (name, address, etc.)
 * @param {Array} checklists - Array of checklist items with photos
 * @param {Function} onProgress - Callback for progress updates (text)
 * @param {string} qualityMode - 'low', 'medium', 'high'
 * @returns {Promise<Blob>} The generated PDF as a Blob
 */
export const generateClientSidePDF = async (company, checklists, onProgress, qualityMode = 'medium') => {
    onProgress("Iniciando motor de PDF...");

    // Quality Configuration
    const QUALITY_SETTINGS = {
        low: { maxSide: 800, quality: 0.4 },
        medium: { maxSide: 1200, quality: 0.6 },
        high: { maxSide: 1600, quality: 0.85 }
    };

    // Fallback if invalid mode
    const settings = QUALITY_SETTINGS[qualityMode] || QUALITY_SETTINGS.medium;
    console.log(`PDF Quality Mode: ${qualityMode}`, settings);

    // PDF Config (Letter)
    // 215.9mm x 279.4mm
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
    });

    const PAGE_WIDTH = 215.9;
    const PAGE_HEIGHT = 279.4;
    const MARGIN = 15;
    const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

    let currentY = MARGIN;

    // 1. Pre-load Logo if exists
    // Logos: Usually keep high quality PNG or apply mild compression if it's huge?
    // Let's keep logos as PNG for transparency, but maybe resize if absurdly large?
    // For now, keep logo as is or use 'medium' sizing but PNG format (lossless).
    let logoBase64 = null;
    if (company.logoUrl) {
        onProgress("Cargando Logo...");
        // Use a reasonable maxSide for logo (e.g. 500px is plenty for print size 20mm width)
        logoBase64 = await loadImageWithCompression(company.logoUrl, 'PNG', 1.0, 500);
    }

    // --- HELPER: HEADER & FOOTER ---
    const addHeader = (zoneName, isContinuation = false) => {
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42); // Slate 900
        doc.setFont('helvetica', 'bold');

        // Accent Line below Header
        const headerLineY = MARGIN + 5;
        doc.setDrawColor(company.reportColor || '#2563eb');
        doc.setLineWidth(1.0); // Thick accent line
        doc.line(MARGIN, headerLineY, PAGE_WIDTH - MARGIN, headerLineY);

        let titleX = MARGIN;

        // Draw Logo if available
        if (logoBase64) {
            const logoW = 20;
            const logoH = 8; // SMALLER height to fit above line
            // Position STRICTLY above the line
            // lineY is (MARGIN + 5). Logo bottom should be at (lineY - 1). 
            // So Logo Top = (MARGIN + 5 - 1 - 8) = MARGIN - 4.
            const logoY = headerLineY - logoH - 1;

            try {
                doc.addImage(logoBase64, 'PNG', MARGIN, logoY, logoW, logoH, undefined, 'FAST');
                titleX += 23; // Shift title
            } catch (e) {
                console.warn("Logo draw failed", e);
            }
        }

        // FIX: Use name as fallback if commercialName is missing
        const companyTitle = company.commercialName || company.name || 'EMPRESA';
        doc.text(companyTitle.toUpperCase(), titleX, MARGIN + 2); // +2 to center align with logo vertically

        doc.setFontSize(8);
        doc.setTextColor(company.reportColor || '#2563eb'); // Custom Color or Default Blue
        doc.text('REPORTE FOTOGRÁFICO', PAGE_WIDTH - MARGIN, MARGIN, { align: 'right' });

        currentY = MARGIN + 12; // Adjust starting Y for content

        // Zone Badge
        if (company.reportColor) {
            doc.setFillColor(company.reportColor);
        } else {
            doc.setFillColor(15, 23, 42);
        }

        doc.roundedRect(MARGIN, currentY, 80, 8, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        const title = isContinuation ? `ZONA: ${zoneName} (CONT.)` : `ZONA: ${zoneName}`;
        doc.text(title.toUpperCase(), MARGIN + 2, currentY + 5.5);

        currentY += 15;

        // Add Footer on every page that has a header
        addFooter();
    };

    const addFooter = () => {
        const footerY = PAGE_HEIGHT - 10;

        // Separator Line
        doc.setDrawColor(200, 200, 200); // Light Gray
        doc.setLineWidth(0.5);
        // doc.setLineDash([], 0); // Ensure solid
        doc.line(MARGIN, footerY - 5, PAGE_WIDTH - MARGIN, footerY - 5);

        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100); // Gray text
        doc.setFont('helvetica', 'bold');

        // Left: Client Name
        const clientName = company.commercialName || company.name || 'EMPRESA';
        doc.text(clientName.toUpperCase(), MARGIN, footerY);

        // Right: Provider Name
        const providerName = 'SEPRISA SEGURIDAD';
        doc.setTextColor(accentColor); // Optional: Make provider brand colored? Or stick to gray. Let's start with Color.
        doc.text(providerName, PAGE_WIDTH - MARGIN, footerY, { align: 'right' });
    };

    const checkPageBreak = (heightNeeded) => {
        if (currentY + heightNeeded > PAGE_HEIGHT - MARGIN) {
            doc.addPage();
            currentY = MARGIN; // Reset for new page (Header added manually if needed inside loops)
            return true;
        }
        return false;
    };

    // --- 1. COVER PAGE ---
    onProgress("Generando Portada...");

    let coverY = 40;
    const accentColor = company.reportColor || '#2563eb'; // Default Blue if not red

    // 2. Header Line (Top)
    // Logo on Cover (Top Left)
    if (logoBase64) {
        try {
            const logoH = 8;
            const logoY = coverY - logoH - 1;
            doc.addImage(logoBase64, 'PNG', MARGIN, logoY, 20, logoH, undefined, 'FAST');
        } catch (e) {
            console.warn("Cover logo error", e);
        }
    }

    doc.setFontSize(14);
    doc.setTextColor(150, 150, 150); // Gray for "REPORTE FOTOGRÁFICO"
    doc.setFont('helvetica', 'bold');

    const topTitle = `${company.commercialName || company.name || 'EMPRESA'}`;
    const titleX = logoBase64 ? MARGIN + 28 : MARGIN;
    doc.text(`REPORTE FOTOGRÁFICO ${topTitle}`, titleX, coverY);

    coverY += 8;

    // Thick Accent Line
    doc.setDrawColor(accentColor);
    doc.setLineWidth(1.5); // Thick line
    doc.line(MARGIN, coverY, 150, coverY);

    coverY += 20;

    // 3. Facade Photo (Centered & Large) - MOVED UP
    coverY += 10;

    // RESTORED: Commercial Name Title (Above Photo)
    doc.setFontSize(22);
    doc.setTextColor(accentColor); // Use Accent Color (Green/Red etc)
    doc.setFont('helvetica', 'bold');

    const centerTitle = company.commercialName || company.name || 'NOMBRE COMERCIAL';
    const centerTitleWidth = doc.getTextWidth(centerTitle.toUpperCase());
    const centerTitleX = (PAGE_WIDTH - centerTitleWidth) / 2;
    doc.text(centerTitle.toUpperCase(), centerTitleX, coverY);

    // Dotted line simulation
    const dotLineY = coverY + 3;
    doc.setDrawColor(accentColor);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, dotLineY, PAGE_WIDTH - MARGIN, dotLineY);

    coverY += 15;

    if (company.facadePhotoUrl) {
        onProgress("Descargando Fachada...");
        // Facade needs good quality, maybe use High settings or slightly better?
        // Let's use the selected settings but enforce a higher minimum maxSide?
        // Or just use the selected settings for consistency. 
        // Facade is large (140mm width), so 1600px is good. 1200px is okay too.
        // Let's use 'high' settings for facade effectively, or at least maxSide 1600.
        const facadeBase64 = await loadImageWithCompression(company.facadePhotoUrl, 'JPEG', settings.quality, Math.max(settings.maxSide, 1600));

        if (facadeBase64) {
            const facadeH = 90;
            const facadeW = 140; // Wider
            const xPos = (PAGE_WIDTH - facadeW) / 2;

            doc.addImage(facadeBase64, 'JPEG', xPos, coverY, facadeW, facadeH, undefined, 'FAST');

            // Photo Border?
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.1);
            doc.rect(xPos, coverY, facadeW, facadeH);

            coverY += facadeH + 15;
        } else {
            coverY += 40;
        }
    } else {
        coverY += 80;
    }

    // 4. Main Title (Centered) - MOVED BELOW PHOTO
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0); // Black
    doc.setFont('helvetica', 'bold');

    const mainTitle = company.legalName || company.name || 'NOMBRE EMPRESA';

    // Auto-Wrap Logic
    const maxTitleWidth = PAGE_WIDTH - (MARGIN * 2);
    const titleLines = doc.splitTextToSize(mainTitle.toUpperCase(), maxTitleWidth);

    titleLines.forEach(line => {
        const titleWidth = doc.getTextWidth(line);
        const titleX = (PAGE_WIDTH - titleWidth) / 2;
        doc.text(line, titleX, coverY);
        coverY += 10; // Line height
    });

    coverY += 5;

    // 5. Address Line (Centered) - MOVED BELOW TITLE
    if (company.address) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);

        const addressText = company.address.toUpperCase();
        const addrWidth = doc.getTextWidth(addressText);
        const addrX = (PAGE_WIDTH - addrWidth) / 2;
        doc.text(addressText, addrX, coverY);

        coverY += 10;
    }

    // Divider Line (Red)
    coverY += 5;
    doc.setDrawColor(accentColor);
    doc.setLineWidth(1);
    doc.line(MARGIN, coverY, PAGE_WIDTH - MARGIN, coverY);

    coverY += 8;

    // Bottom Details (Date Only)
    doc.setFontSize(9);
    doc.setTextColor(accentColor); // Red Label
    doc.setFont('helvetica', 'bold');

    const dateLabel = "FECHA DE GENERACIÓN";
    doc.text(dateLabel, MARGIN, coverY);

    coverY += 6;

    // Value
    doc.setTextColor(0, 0, 0); // Black Value
    const dateStr = new Date().toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric'
    }).toUpperCase();

    doc.text(dateStr, MARGIN, coverY);

    // --- 2. ZONES & ITEMS ---
    const uniqueZones = [...new Set(checklists.map(i => i.location))]
        .filter(z => z !== 'CAMBIOS A REALIZAR') // EXCLUDE Special Zone from main loop
        .sort();

    for (let zIndex = 0; zIndex < uniqueZones.length; zIndex++) {
        const zone = uniqueZones[zIndex];
        onProgress(`Procesando Zona ${zIndex + 1}/${uniqueZones.length}: ${zone}`);

        // FILTER: Only items with photos (Except Special Zone which is handled at end)
        const zoneItems = checklists.filter(i => i.location === zone && (i.photos && i.photos.length > 0));

        // Skip Zone if empty after filter
        if (zoneItems.length === 0) continue;

        doc.addPage();
        currentY = MARGIN; // Reset logic handles header
        addHeader(zone);

        let previousItemName = "";

        for (const item of zoneItems) {
            // -- DEFINITION: DRAW ITEM HEADER --
            const drawItemHeader = (isContinuation = false) => {
                if (company.reportColor) {
                    doc.setFillColor(company.reportColor);
                } else {
                    doc.setFillColor(37, 99, 235); // Blue
                }
                doc.rect(MARGIN, currentY, 3, 8, 'F');

                doc.setFontSize(10);
                doc.setTextColor(15, 23, 42);
                doc.setFont('helvetica', 'bold');

                let title = `ITEM: ${item.name.toUpperCase()}`;
                if (isContinuation) title += " (CONT.)";

                doc.text(title, MARGIN + 6, currentY + 6);
                currentY += 12;
            };

            const photos = (item.photos || []).filter(Boolean);

            // Calculate Header + Notes Height
            const headerHeight = 25;
            let notesHeight = 0;
            if (item.notes) {
                const noteLines = doc.splitTextToSize(item.notes, CONTENT_WIDTH);
                notesHeight = (noteLines.length * 5) + 5;
            }
            const totalHeaderBlock = headerHeight + notesHeight;

            // -- SMART PAGE BREAK (Item Start) --
            // If header + 1 row of photos wont fit, break now.
            // Estimate row height (std 3 col) -> approx 75 units
            let estimatedRowH = 75;
            if (photos.length === 1) estimatedRowH = 150;

            // Check if Item Name allows grouping
            const isSameSignage = (item.name || "").trim().toUpperCase() === previousItemName;

            let forceBreak = false;
            if (!isSameSignage) {
                // Context Switch Loop
                if (currentY > PAGE_HEIGHT * 0.25) forceBreak = true;
            } else if (currentY > PAGE_HEIGHT * 0.75) {
                forceBreak = true;
            } else if ((currentY + totalHeaderBlock + estimatedRowH) > (PAGE_HEIGHT - MARGIN)) {
                forceBreak = true;
            }

            if (forceBreak) {
                doc.addPage();
                currentY = MARGIN;
                addHeader(zone, true);
            } else {
                if (checkPageBreak(totalHeaderBlock)) addHeader(zone, true);
            }

            previousItemName = (item.name || "").trim().toUpperCase();

            // DRAW HEADER (First Time)
            drawItemHeader(false);

            if (item.notes) {
                doc.setFontSize(9);
                doc.setTextColor(71, 85, 105);
                doc.setFont('helvetica', 'italic');
                const noteLines = doc.splitTextToSize(item.notes, CONTENT_WIDTH);
                doc.text(noteLines, MARGIN, currentY);
                currentY += notesHeight;
            }

            // -- DRAW PHOTOS (Adaptive Loop) --
            if (photos.length > 0) {
                let i = 0;
                while (i < photos.length) {
                    const remaining = photos.length - i;

                    // Adaptive Layout based on REMAINING photos
                    let columns = 3;
                    let widthRatio = 0.30;
                    let heightMultiplier = 1.33;
                    let gap = 5;

                    // TOTAL PHOTOS CHECK (Global context for this item)
                    const totalItemPhotos = photos.length;

                    // SPECIAL LAYOUT: 4 PHOTOS -> 2x2 Grid (Always)
                    if (totalItemPhotos === 4) {
                        columns = 2;
                        widthRatio = 0.34; // Reduced from 0.40 to ensure fit (approx 73mm)
                        heightMultiplier = 1.33;
                    }
                    // SPECIAL LAYOUT: 5 PHOTOS -> 3 top, 2 bottom (Compact)
                    else if (totalItemPhotos === 5) {
                        if (remaining === 5) {
                            // First Row (3 photos)
                            columns = 3;
                            widthRatio = 0.30;
                        } else if (remaining === 2) {
                            // Second Row (2 photos) - FORCE COMPACT
                            columns = 2;
                            // widthRatio = 0.45; // OLD (Hero) - Too big!
                            widthRatio = 0.32; // NEW (Compact) - Matches 3-col height approx
                        }
                    }
                    // STANDARD ADAPTIVE LOGIC (For 1, 2, 3, 6, 7+...)
                    else if (remaining === 1) {
                        columns = 1;
                        widthRatio = 0.55;
                        heightMultiplier = 1.6; // 9:16
                    } else if (remaining === 2) {
                        columns = 2;
                        widthRatio = 0.45;
                        heightMultiplier = 1.6; // 9:16
                    }

                    const rowW = CONTENT_WIDTH * widthRatio;
                    const rowH = rowW * heightMultiplier;

                    // Check Page Break for THIS Row
                    if (checkPageBreak(rowH + 10)) {
                        addHeader(zone, true);
                        drawItemHeader(true); // RE-DRAW ITEM HEADER
                    }

                    // Process Batch
                    const batchSize = Math.min(columns, remaining);
                    const rowPhotos = photos.slice(i, i + batchSize);

                    const rowImagesBase64 = await Promise.all(
                        rowPhotos.map(url => loadImageWithCompression(url, 'JPEG', settings.quality, settings.maxSide))
                    );

                    // Center Row
                    const totalRowWidth = (rowPhotos.length * rowW) + ((rowPhotos.length - 1) * gap);
                    let xPos = MARGIN + ((CONTENT_WIDTH - totalRowWidth) / 2);

                    rowImagesBase64.forEach((base64) => {
                        if (base64) {
                            try {
                                doc.addImage(base64, 'JPEG', xPos, currentY, rowW, rowH, undefined, 'FAST');
                                doc.setDrawColor(226, 232, 240);
                                doc.setLineWidth(0.1);
                                doc.rect(xPos, currentY, rowW, rowH);
                            } catch (e) {
                                console.warn("Image error", e);
                            }
                        }
                        xPos += rowW + gap;
                    });

                    currentY += rowH + 5;
                    i += batchSize;
                }
            } else {
                currentY += 5;
            }

            // Spacer
            currentY += 15;
        }
    }

    // --- 4. CAMBIOS A REALIZAR (Special Zone - Last Page) ---
    const changeItems = checklists.filter(i => i.location === 'CAMBIOS A REALIZAR');

    if (changeItems.length > 0) {
        doc.addPage();
        onProgress("Generando sección: CAMBIOS A REALIZAR...");

        currentY = MARGIN;

        // Special Header
        doc.setFontSize(16);
        doc.setTextColor(185, 28, 28); // Red-700
        doc.setFont('helvetica', 'bold');
        doc.text("CAMBIOS A REALIZAR", PAGE_WIDTH / 2, currentY, { align: 'center' });

        currentY += 10;

        // Draw Red Line
        doc.setDrawColor(185, 28, 28);
        doc.setLineWidth(1);
        doc.line(MARGIN, currentY, PAGE_WIDTH - MARGIN, currentY);

        currentY += 15;

        for (let i = 0; i < changeItems.length; i++) {
            const item = changeItems[i];
            const photos = (item.photos || []).filter(Boolean);

            // Check Page Break
            if (checkPageBreak(100)) {
                doc.setTextColor(185, 28, 28);
                doc.setFontSize(14);
                doc.text("CAMBIOS A REALIZAR (CONT.)", PAGE_WIDTH / 2, MARGIN, { align: 'center' });
                currentY += 15;
            }

            // Item Title
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.setFont('helvetica', 'bold');
            doc.text(`${item.name.toUpperCase()}`, MARGIN, currentY);

            currentY += 8;

            // Notes (if any)
            if (item.notes) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const noteLines = doc.splitTextToSize(item.notes, CONTENT_WIDTH);
                doc.text(noteLines, MARGIN, currentY);
                currentY += (noteLines.length * 5) + 5;
            }

            // Photos
            if (photos.length > 0) {
                const photoH = 100; // Large
                const photoW = 150; // Large
                const xPos = (PAGE_WIDTH - photoW) / 2;

                for (const photoUrl of photos) {
                    if (checkPageBreak(photoH + 10)) {
                        doc.text("CAMBIOS A REALIZAR (CONT.)", PAGE_WIDTH / 2, MARGIN, { align: 'center' });
                        currentY += 15;
                    }

                    const base64 = await loadImageWithCompression(photoUrl, 'JPEG', settings.quality, settings.maxSide);
                    if (base64) {
                        doc.addImage(base64, 'JPEG', xPos, currentY, photoW, photoH, undefined, 'FAST');
                        // Border
                        doc.setDrawColor(200);
                        doc.rect(xPos, currentY, photoW, photoH);
                        currentY += photoH + 10;
                    }
                }
            } else {
                currentY += 10;
            }

            // Divider between changes
            if (i < changeItems.length - 1) {
                doc.setDrawColor(230);
                doc.setLineWidth(0.5);
                doc.line(MARGIN, currentY, PAGE_WIDTH - MARGIN, currentY);
                currentY += 10;
            }
        }
    }

    onProgress("Finalizando PDF...");
    return doc.output('blob');
};

/**
 * Uploads the generated PDF blob to Firebase Storage and returns the public URL.
 */
export const uploadPDFToStorage = async (pdfBlob, inventoryId, uid, customFileName) => {
    const storage = getStorage();
    let fileName = `${inventoryId}_FINAL.pdf`;

    if (customFileName) {
        // Sanitize filename: remove special chars, keep spaces/dashes/underscores
        const sanitized = customFileName.replace(/[^a-zA-Z0-9 \-_]/g, '').trim();
        fileName = `${sanitized}.pdf`;
    }

    const filePath = `reports/${uid || 'unknown'}/${fileName}`;
    const storageRef = ref(storage, filePath);

    await uploadBytes(storageRef, pdfBlob, {
        contentType: 'application/pdf',
        contentDisposition: `attachment; filename="${fileName}"`,
        customMetadata: {
            originalName: fileName
        }
    });
    return await getDownloadURL(storageRef);
};
