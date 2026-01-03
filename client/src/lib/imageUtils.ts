/**
 * Image Utilities for Avatar Upload
 * 
 * Provides image compression, resizing, and validation functions.
 * Extracted from Profile.tsx for reusability and testability.
 */

// ============================================
// Constants (Issue 5.2: Magic numbers → Constants)
// ============================================

/** Maximum dimension for compressed images (pixels) */
export const IMAGE_MAX_SIZE = 512;

/** JPEG compression quality (0.0 - 1.0) */
export const JPEG_QUALITY = 0.8;

/** Maximum allowed file size for source images (bytes) */
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (increased for large iPhone photos)

/** Allowed MIME types for image upload (including iPhone formats) */
export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',  // iPhone default format
    'image/heif',  // iPhone alternative format
];

// ============================================
// Validation Functions (Issue 2.2: File type validation)
// ============================================

export interface ImageValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validates an image file before processing.
 * Checks file size and MIME type.
 * 
 * Note: We are lenient with MIME types because:
 * - iPhone sends HEIC which some browsers convert automatically
 * - Some browsers report different MIME types for the same format
 * - The actual validation happens when we try to load the image
 * 
 * @param file - The file to validate
 * @returns Validation result with error message if invalid
 */
export function validateImageFile(file: File): ImageValidationResult {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `画像が大きすぎます (最大${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB)`
        };
    }

    // Check basic image MIME type (lenient - accept any image/*)
    if (!file.type.startsWith('image/')) {
        return {
            valid: false,
            error: `画像ファイルを選択してください`
        };
    }

    return { valid: true };
}

// ============================================
// HEIC Conversion Functions
// ============================================

/**
 * Checks if a file is in HEIC/HEIF format
 */
function isHeicFormat(file: File): boolean {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    return type === 'image/heic' || type === 'image/heif' ||
        name.endsWith('.heic') || name.endsWith('.heif');
}

/**
 * Converts HEIC/HEIF file to JPEG format
 * @param file - The HEIC/HEIF file to convert
 * @returns Promise resolving to converted JPEG Blob
 */
async function convertHeicToJpeg(file: File): Promise<Blob> {
    try {
        // Dynamic import to avoid loading issues on some browsers
        const heic2any = (await import('heic2any')).default;
        const result = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: JPEG_QUALITY
        });
        // heic2any can return a single blob or an array
        return Array.isArray(result) ? result[0] : result;
    } catch (error) {
        console.error('HEIC conversion failed:', error);
        throw new Error('HEIC画像の変換に失敗しました。JPEGまたはPNG形式の画像をお試しください。');
    }
}

// ============================================
// Compression Functions (Issue 1.1: Extracted from component)
// ============================================

/**
 * Compresses and resizes an image to reduce file size before upload.
 * Automatically converts HEIC/HEIF to JPEG first.
 * 
 * Max dimension: 512px (configurable via IMAGE_MAX_SIZE)
 * Output format: JPEG at 0.8 quality (configurable via JPEG_QUALITY)
 * 
 * @param file - The source image file
 * @returns Promise resolving to compressed Blob
 * @throws Error if image processing fails
 */
export async function compressImage(file: File): Promise<Blob> {
    // Convert HEIC to JPEG first if needed
    let imageBlob: Blob = file;
    if (isHeicFormat(file)) {
        imageBlob = await convertHeicToJpeg(file);
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Canvas 2D context not available'));
                    return;
                }

                // Calculate new dimensions (max IMAGE_MAX_SIZE px)
                let { width, height } = img;
                if (width > height) {
                    if (width > IMAGE_MAX_SIZE) {
                        height = Math.round((height * IMAGE_MAX_SIZE) / width);
                        width = IMAGE_MAX_SIZE;
                    }
                } else {
                    if (height > IMAGE_MAX_SIZE) {
                        width = Math.round((width * IMAGE_MAX_SIZE) / height);
                        height = IMAGE_MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to JPEG blob
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create compressed image blob'));
                        }
                    },
                    'image/jpeg',
                    JPEG_QUALITY
                );
            };

            img.onerror = () => reject(new Error('画像を読み込めませんでした。別の形式の画像をお試しください。'));
            img.src = e.target?.result as string;
        };

        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(imageBlob);
    });
}

