/**
 * Robust share utilities with comprehensive error handling and fallbacks
 * 
 * Handles:
 * - Image generation from DOM elements
 * - Native Web Share API with fallbacks
 * - Download fallback when share is unavailable
 * - Detailed error logging
 */

import { toBlob, toPng } from 'html-to-image';
import { toast } from 'sonner';
import { safeRemove } from '@/lib/utils';

export interface ShareOptions {
    title: string;
    text: string;
    url?: string;
}

export interface ShareResult {
    success: boolean;
    method: 'share' | 'download' | 'clipboard' | 'failed';
    error?: string;
}

/**
 * Generate image blob from DOM element with retry logic
 */
export async function generateImageFromElement(
    element: HTMLElement,
    options: { width?: number; height?: number; retries?: number } = {}
): Promise<Blob | null> {
    const { width = 600, height = 800, retries = 2 } = options;

    // Common options to avoid CSS SecurityError with external stylesheets
    const imageOptions = {
        width,
        height,
        style: { transform: 'none' },
        pixelRatio: 2, // Higher quality
        cacheBust: true, // Prevent caching issues
        skipFonts: true, // Skip external fonts to avoid SecurityError
        includeQueryParams: true,
        // Skip external stylesheets that cause SecurityError
        filter: (node: Node) => {
            if (node instanceof HTMLLinkElement && node.rel === 'stylesheet') {
                // Skip external stylesheets (Google Fonts, etc.)
                const href = node.href || '';
                if (href.includes('fonts.googleapis.com') || href.includes('fonts.gstatic.com')) {
                    return false;
                }
            }
            return true;
        },
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            console.log(`[Share] Generating image (attempt ${attempt + 1}/${retries + 1})`);

            // Wait a bit for DOM to stabilize
            if (attempt > 0) {
                await new Promise(resolve => setTimeout(resolve, 500 * attempt));
            }

            const blob = await toBlob(element, imageOptions);

            if (blob) {
                console.log('[Share] Image generated successfully:', blob.size, 'bytes');
                return blob;
            }
        } catch (error) {
            console.error(`[Share] Image generation failed (attempt ${attempt + 1}):`, error);

            if (attempt === retries) {
                // Last attempt failed, try PNG as fallback
                try {
                    console.log('[Share] Trying PNG fallback method');
                    const dataUrl = await toPng(element, imageOptions);

                    const response = await fetch(dataUrl);
                    const blob = await response.blob();
                    console.log('[Share] PNG fallback successful');
                    return blob;
                } catch (pngError) {
                    console.error('[Share] PNG fallback also failed:', pngError);
                    return null;
                }
            }
        }
    }

    return null;
}

/**
 * Check if Web Share API is available and supports files
 */
export function canShareFiles(): boolean {
    try {
        return typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
    } catch (error) {
        console.warn('[Share] Error checking share capabilities:', error);
        return false;
    }
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): boolean {
    try {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        if (!document.body) {
            console.warn('[Share] document.body not available for download');
            return false;
        }
        document.body.appendChild(link);
        link.click();
        safeRemove(link);

        // Clean up the URL after a short delay
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        console.log('[Share] Download triggered:', filename);
        return true;
    } catch (error) {
        console.error('[Share] Download failed:', error);
        return false;
    }
}

/**
 * Copy image to clipboard (fallback for browsers that support it)
 */
export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
    try {
        if (!navigator.clipboard || !navigator.clipboard.write) {
            console.log('[Share] Clipboard API not available');
            return false;
        }

        const item = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([item]);

        console.log('[Share] Image copied to clipboard');
        return true;
    } catch (error) {
        console.error('[Share] Clipboard copy failed:', error);
        return false;
    }
}

/**
 * Main share function with comprehensive fallbacks
 */
export async function shareImage(
    blob: Blob,
    filename: string,
    options: ShareOptions
): Promise<ShareResult> {
    console.log('[Share] Starting share process with options:', options);

    // Try native share first
    if (canShareFiles()) {
        try {
            const file = new File([blob], filename, { type: blob.type });

            // Check if this specific share is supported
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                console.log('[Share] Attempting native share...');

                await navigator.share({
                    title: options.title,
                    text: options.text,
                    files: [file],
                    ...(options.url ? { url: options.url } : {}),
                });

                console.log('[Share] Native share successful');
                toast.success('シェアしました！');
                return { success: true, method: 'share' };
            } else {
                console.log('[Share] canShare returned false for this content');
            }
        } catch (error: any) {
            // User cancelled or share failed
            if (error.name === 'AbortError') {
                console.log('[Share] User cancelled share');
                return { success: false, method: 'share', error: 'cancelled' };
            }

            console.error('[Share] Native share failed:', error);
            // Don't return here, fall through to other methods
        }
    } else {
        console.log('[Share] Native share not available on this device/browser');
    }

    // Try clipboard as second option (mobile-friendly)
    try {
        const clipboardSuccess = await copyImageToClipboard(blob);
        if (clipboardSuccess) {
            toast.success('画像をクリップボードにコピーしました！', {
                description: 'SNSアプリで貼り付けてシェアできます',
                duration: 4000,
            });
            return { success: true, method: 'clipboard' };
        }
    } catch (error) {
        console.log('[Share] Clipboard not available, proceeding to download');
    }

    // Fallback to download
    try {
        const downloadSuccess = downloadBlob(blob, filename);
        if (downloadSuccess) {
            toast.success('画像を保存しました！', {
                description: 'ギャラリーから画像をシェアできます',
                duration: 4000,
            });
            return { success: true, method: 'download' };
        }
    } catch (error) {
        console.error('[Share] Download fallback failed:', error);
    }

    // All methods failed
    console.error('[Share] All share methods failed');
    toast.error('シェアに失敗しました', {
        description: 'ブラウザを再起動するか、別の方法でお試しください',
        duration: 5000,
    });

    return {
        success: false,
        method: 'failed',
        error: 'All share methods exhausted'
    };
}

/**
 * Simplified share for URL-only (no file)
 */
export async function shareUrl(options: ShareOptions): Promise<ShareResult> {
    console.log('[Share] Sharing URL:', options);

    if (navigator.share) {
        try {
            await navigator.share({
                title: options.title,
                text: options.text,
                url: options.url,
            });

            return { success: true, method: 'share' };
        } catch (error: any) {
            if (error.name === 'AbortError') {
                return { success: false, method: 'share', error: 'cancelled' };
            }
            console.error('[Share] URL share failed:', error);
        }
    }

    // Fallback: copy URL to clipboard
    if (options.url && navigator.clipboard) {
        try {
            await navigator.clipboard.writeText(options.url);
            toast.success('URLをコピーしました！');
            return { success: true, method: 'clipboard' };
        } catch (error) {
            console.error('[Share] Clipboard write failed:', error);
        }
    }

    return { success: false, method: 'failed', error: 'No share method available' };
}
