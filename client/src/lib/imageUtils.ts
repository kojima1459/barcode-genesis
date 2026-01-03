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
export const IMAGE_MAX_SIZE = 1024;

/** Minimum dimension for compressed images (pixels) */
export const IMAGE_MIN_SIZE = 512;

/** JPEG compression quality (0.0 - 1.0) */
export const JPEG_QUALITY = 0.8;

/** Minimum JPEG quality for compression attempts */
export const MIN_JPEG_QUALITY = 0.6;

/** Maximum allowed file size for source images (bytes) */
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (increased for large iPhone photos)

/** Target max size for processed images (bytes) */
export const TARGET_FILE_SIZE = 500 * 1024; // ~500KB

/** Allowed MIME types for image upload (including iPhone formats) */
export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
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

    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    const hasAllowedExt = name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png')
        || name.endsWith('.webp') || name.endsWith('.heic') || name.endsWith('.heif');

    if (type && !ALLOWED_IMAGE_TYPES.includes(type)) {
        return {
            valid: false,
            error: '対応していない形式です（jpg/png/webp/heic/heif）'
        };
    }

    if (!type && !hasAllowedExt) {
        return {
            valid: false,
            error: '対応していない形式です（jpg/png/webp/heic/heif）'
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
export interface ProcessedImageResult {
    blob: Blob;
    width: number;
    height: number;
}

async function loadImageSource(blob: Blob): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; cleanup: () => void; }> {
    if (typeof createImageBitmap === 'function') {
        const bitmap = await createImageBitmap(blob);
        return {
            width: bitmap.width,
            height: bitmap.height,
            draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
            cleanup: () => {
                if (typeof (bitmap as ImageBitmap).close === 'function') {
                    (bitmap as ImageBitmap).close();
                }
            }
        };
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.onload = () => {
            resolve({
                width: img.naturalWidth,
                height: img.naturalHeight,
                draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
                cleanup: () => URL.revokeObjectURL(url),
            });
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('画像を読み込めませんでした。別の形式の画像をお試しください。'));
        };
        img.src = url;
    });
}

async function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('Failed to create compressed image blob'));
                    return;
                }
                resolve(blob);
            },
            'image/jpeg',
            quality
        );
    });
}

export async function compressImage(file: File): Promise<ProcessedImageResult> {
    // Convert HEIC to JPEG first if needed
    let imageBlob: Blob = file;
    if (isHeicFormat(file)) {
        imageBlob = await convertHeicToJpeg(file);
    }

    const source = await loadImageSource(imageBlob);
    try {
        let lastBlob: Blob | null = null;
        let lastWidth = source.width;
        let lastHeight = source.height;
        const sizeSteps = [IMAGE_MAX_SIZE, IMAGE_MIN_SIZE];
        const qualitySteps = [JPEG_QUALITY, 0.7, MIN_JPEG_QUALITY];

        for (const maxSize of sizeSteps) {
            let { width, height } = source;
            if (width > height) {
                if (width > maxSize) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                }
            } else if (height > maxSize) {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Canvas 2D context not available');
            }

            canvas.width = width;
            canvas.height = height;
            source.draw(ctx, width, height);

            for (const quality of qualitySteps) {
                const blob = await canvasToJpegBlob(canvas, quality);
                lastBlob = blob;
                lastWidth = width;
                lastHeight = height;
                if (blob.size <= TARGET_FILE_SIZE) {
                    return { blob, width, height };
                }
            }
        }

        if (lastBlob) {
            throw new Error('画像が大きすぎます。別の画像をお試しください。');
        }
        throw new Error('画像の圧縮に失敗しました');
    } finally {
        source.cleanup();
    }
}
