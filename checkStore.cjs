const { Storage } = require('@google-cloud/storage');

async function run() {
    const storage = new Storage({ projectId: 'proteccioncivil-system' });
    // Look at the evidence/ block
    const [files] = await storage.bucket('proteccioncivil-system.firebasestorage.app').getFiles({ prefix: 'evidence/' });

    console.log(`Found ${files.length} files in evidence/`);

    // Sort by updated time, descending
    files.sort((a, b) => new Date(b.metadata.updated) - new Date(a.metadata.updated));

    // Check the newest 20 files
    for (let i = 0; i < Math.min(20, files.length); i++) {
        const file = files[i];
        console.log(`- ${file.name} | Type: ${file.metadata.contentType} | Size: ${file.metadata.size} | Updated: ${file.metadata.updated}`);
    }
}

run().catch(console.error);
