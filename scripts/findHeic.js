const { Storage } = require('@google-cloud/storage');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const path = require('path');

// Initialize Google Cloud Storage (Requires credentials in environment)
// It will pick up GOOGLE_APPLICATION_CREDENTIALS if set
const storage = new Storage();
const bucketName = 'proteccioncivil-system.firebasestorage.app';

async function fixHeicFiles() {
    console.log(`Scanning bucket: ${bucketName}...`);
    const bucket = storage.bucket(bucketName);

    // We only care about the evidence folder
    const [files] = await bucket.getFiles({ prefix: 'evidence/' });
    console.log(`Found ${files.length} files in evidence/. Checking for HEIC/HEIF...`);

    let count = 0;

    // heic-convert works on buffers, but we might just want to ask the user to re-upload them since doing this in Node requires hefty C++ bindings (heic-convert or sharp).
    // Actually, let's just identify them first.
    let heicFiles = [];

    for (const file of files) {
        // Look for .heic or .heif in name
        if (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
            heicFiles.push(file.name);
        }
    }

    console.log(`Found ${heicFiles.length} HEIC files.`);
    if (heicFiles.length > 0) {
        console.log("Files:", heicFiles.join(", "));
    }
}

fixHeicFiles().catch(console.error);
