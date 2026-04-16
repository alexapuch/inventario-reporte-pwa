/**
 * Client-side image compression using Canvas API.
 * Resizes and compresses images before uploading to Firebase Storage.
 *
 * @param {File|Blob} file - The image file to compress
 * @param {Object} [options]
 * @param {number} [options.maxDimension=1920] - Max width or height in pixels
 * @param {number} [options.quality=0.7] - JPEG quality (0-1)
 * @returns {Promise<File>} - Compressed JPEG File
 */
export async function compressImage(file, options = {}) {
    const { maxDimension = 1920, quality = 0.7 } = options;

    // Skip non-image files
    if (!file.type.startsWith('image/')) {
        return file;
    }

    const originalSize = file.size;

    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            let { width, height } = img;

            // Calculate new dimensions maintaining aspect ratio
            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                } else {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }
            }

            // Draw on canvas
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Export as JPEG blob
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        console.warn('[compressImage] Canvas toBlob returned null, using original');
                        resolve(file);
                        return;
                    }

                    // Build a proper File object with a .jpeg name
                    const baseName = (file.name || 'image').replace(/\.[^.]+$/, '');
                    const compressedFile = new File(
                        [blob],
                        `${baseName}.jpeg`,
                        { type: 'image/jpeg' }
                    );

                    const compressedSize = compressedFile.size;
                    const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);

                    console.log(
                        `[compressImage] Original: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ` +
                        `Comprimido: ${(compressedSize / 1024).toFixed(0)}KB ` +
                        `(${reduction}% reducción) | ${width}x${height}px`
                    );

                    resolve(compressedFile);
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            console.warn('[compressImage] Failed to load image, using original');
            resolve(file); // Fallback to original instead of breaking
        };

        img.src = url;
    });
}
