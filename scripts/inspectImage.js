import { Storage } from '@google-cloud/storage';
import fs from 'fs';

const storage = new Storage();
const bucketName = 'proteccioncivil-system.firebasestorage.app';

async function examineFirstImage() {
    console.log(`Scanning bucket: ${bucketName}...`);
    const bucket = storage.bucket(bucketName);

    // We only care about the evidence folder
    const [files] = await bucket.getFiles({ prefix: 'evidence/' });

    if (files.length === 0) {
        console.log("No files found!");
        return;
    }

    // Try to find a corrupted file (octet-stream)
    let fileToInspect = files.find(f => f.name.includes('.heic') || f.name.includes('.HEIC'));
    if (!fileToInspect) fileToInspect = files[0];

    console.log(`Found file: ${fileToInspect.name}`);

    const [metadata] = await fileToInspect.getMetadata();
    console.log(`ContentType uploaded as: ${metadata.contentType}`);
    console.log(`Size: ${metadata.size}`);

    // Download the actual bytes
    try {
        const [buffer] = await fileToInspect.download();
        console.log(`Downloaded ${buffer.length} bytes.`);

        // Print the first 16 bytes in HEX
        const hex = buffer.slice(0, 16).toString('hex');
        console.log(`First 16 bytes: ${hex}`);

        // Interpret magic numbers
        if (hex.startsWith('ffd8ff')) {
            console.log("Verdict: It's technically a JPEG file!");
        } else if (hex.startsWith('89504e47')) {
            console.log("Verdict: It's technically a PNG file!");
        } else if (hex.includes('66747970')) { // ftyp
            console.log("Verdict: It's technically a HEIC/MP4/MOV container! (Looking for ftyp)");
            console.log("Brand:", buffer.slice(8, 12).toString('ascii'));
        } else {
            console.log("Verdict: UNKNOWN format.");
        }

    } catch (err) {
        console.error("Download failed", err);
    }
}

examineFirstImage().catch(console.error);
