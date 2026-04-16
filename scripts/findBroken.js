const { Storage } = require('@google-cloud/storage');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');

const storage = new Storage();
const bucketName = 'proteccioncivil-system.firebasestorage.app';

async function fixHeicFiles() {
    console.log(`Scanning bucket: ${bucketName}...`);
    const bucket = storage.bucket(bucketName);

    // We only care about the evidence folder
    const [files] = await bucket.getFiles({ prefix: 'evidence/' });
    console.log(`Found ${files.length} files in evidence/. Checking for HEIC/HEIF...`);

    let heicFiles = [];

    for (const file of files) {
        // Since Android didn't always save as .heic extension but as application/octet-stream,
        // we might not find them just by name. We need to check the exact metadata.
        const [metadata] = await file.getMetadata();

        // Wait, the previous bug was because the name ended in .heic? 
        // Let's check name and content type.
        if (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif') || metadata.contentType === 'application/octet-stream' || metadata.contentType === 'image/heic') {
            heicFiles.push(file.name);
        }
    }

    console.log(`Found ${heicFiles.length} potentially corrupted or HEIC files.`);
    if (heicFiles.length > 0) {
        fs.writeFileSync('corrupted_files.txt', heicFiles.join('\n'));
        console.log("Saved list to corrupted_files.txt");
    }
}

fixHeicFiles().catch(console.error);
