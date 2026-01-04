import { lazy, ComponentType } from 'react';

/**
 * A wrapper around React.lazy() that automatically attempts to recover from
 * chunk load errors (often caused by deployments updating hash filenames)
 * by reloading the page once.
 */
export const lazyRetry = <T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>,
    name?: string
): React.LazyExoticComponent<T> => {
    return lazy(async () => {
        try {
            return await factory();
        } catch (error: any) {
            console.error(`[LazyRetry] Failed to load ${name || 'component'}:`, error);

            const errorMessage = error?.message || error?.toString() || '';
            const isChunkError =
                errorMessage.includes('Loading chunk') ||
                errorMessage.includes('MIME type') ||
                errorMessage.includes('text/html') ||
                errorMessage.includes('missing') ||
                error.name === 'ChunkLoadError';

            if (isChunkError) {
                // Uses sessionStorage to prevent infinite reload loops
                // We use a global key since a chunk error often means ANY chunk is bad
                const key = `chunk_load_error_retried_${window.location.pathname}`;
                const hasRetried = sessionStorage.getItem(key);

                // Only reload if we haven't tried yet (within this session/path)
                if (!hasRetried) {
                    console.log('[LazyRetry] Chunk error detected, forcing reload...');
                    sessionStorage.setItem(key, 'true');
                    window.location.reload();

                    // Return a promise that never resolves to keep the suspense fallback 
                    // visible while the page reloads
                    return new Promise(() => { });
                }
            }

            // If prompt reload didn't work, or it's a different error, throw it
            // so the ErrorBoundary catches it.
            throw error;
        }
    });
};
