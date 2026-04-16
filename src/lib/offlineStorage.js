import { openDB } from 'idb';

const DB_NAME = 'inventory-offline-db';
const STORE_NAME = 'pending-uploads';

// Initialize DB
const initDB = async () => {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        },
    });
};

/**
 * Helper: Convert File/Blob to Base64
 */
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
};

/**
 * Saves a pending upload to IndexedDB
 * @param {string} itemId - The ID of the checklist item
 * @param {number} photoIndex - The index of the photo (0, 1, 2...)
 * @param {string} zoneName - Location/Zone name
 * @param {File} file - The image file
 */
export const savePendingUpload = async (itemId, photoIndex, zoneName, file) => {
    const db = await initDB();
    const id = `pending_${itemId}_${photoIndex}`;

    // STRATEGY: Convert to Base64 String.
    // This bypasses specific browser issues with storing 'File' or 'Blob' objects in IDB.
    // It is less efficient but highly compatible.
    const base64Data = await fileToBase64(file);

    const record = {
        id,
        itemId,
        photoIndex,
        zoneName,
        fileBase64: base64Data, // Store as string
        fileName: file.name,
        fileType: file.type,
        timestamp: Date.now(),
        status: 'pending'
    };

    await db.put(STORE_NAME, record);
    return id;
};

/**
 * Retrieves all pending uploads
 */
export const getPendingUploads = async () => {
    const db = await initDB();
    return db.getAll(STORE_NAME);
};

/**
 * Removes a pending upload after successful sync
 * @param {string} id 
 */
export const removePendingUpload = async (id) => {
    const db = await initDB();
    await db.delete(STORE_NAME, id);
};

/**
 * Clear all pending uploads (optional utility)
 */
export const clearPendingUploads = async () => {
    const db = await initDB();
    await db.clear(STORE_NAME);
};
