import { Component, type ReactNode, useEffect, useRef, useState, memo } from 'react';
import { useUserData } from '@/hooks/useUserData';
import { safeRemove } from '@/lib/utils';

/**
 * AdBanner Component - Performance Optimized
 * 
 * Uses IntersectionObserver to only load ads when visible.
 * Uses requestIdleCallback to defer ad injection for better performance.
 */
function AdBannerComponent() {
  const bannerRef = useRef<HTMLDivElement>(null);
  const { isPremium } = useUserData();
  const [isVisible, setIsVisible] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const unmountedRef = useRef(false);

  // IntersectionObserver: Only load ad when visible
  useEffect(() => {
    if (isPremium || !bannerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (unmountedRef.current) return;
        if (entries[0].isIntersecting) {
          if (unmountedRef.current) return;
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' } // Preload slightly before visible
    );

    observer.observe(bannerRef.current);
    return () => observer.disconnect();
  }, [isPremium]);

  // Load ad only when visible, using requestIdleCallback for better performance
  useEffect(() => {
    if (!isVisible || adLoaded || isPremium || !bannerRef.current) return;

    const loadAd = () => {
      if (unmountedRef.current) return;
      const container = bannerRef.current;
      if (!container || !container.isConnected) return;

      try {
        while (container.firstChild) {
          safeRemove(container.firstChild);
        }

        const iframe = document.createElement('iframe');
        Object.assign(iframe.style, {
          border: 'none',
          width: '320px',
          height: '50px',
          overflow: 'hidden'
        });
        iframe.scrolling = 'no';
        iframe.loading = 'lazy'; // Native lazy loading hint
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-presentation allow-top-navigation-by-user-activation');

        container.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(`
            <!DOCTYPE html>
            <html>
              <body style="margin:0;padding:0;background:transparent;">
                <script type="text/javascript">
                  atOptions = {
                    'key' : '5a1f2af4f2e41342b43c9eb93a8d74af',
                    'format' : 'iframe',
                    'height' : 50,
                    'width' : 320,
                    'params' : {}
                  };
                </script>
                <script type="text/javascript" src="https://www.highperformanceformat.com/5a1f2af4f2e41342b43c9eb93a8d74af/invoke.js"></script>
              </body>
            </html>
          `);
          doc.close();
        }
        if (!unmountedRef.current) {
          setAdLoaded(true);
        }
      } catch (error) {
        console.warn("Failed to load ad banner:", error);
      }
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      let idleId: number | null = null;
      const startDelay = setTimeout(() => {
        idleId = window.requestIdleCallback(loadAd, { timeout: 2000 });
      }, 200);
      return () => {
        clearTimeout(startDelay);
        if (idleId !== null) {
          window.cancelIdleCallback(idleId);
        }
      };
    }

    const id = setTimeout(loadAd, 300);
    return () => clearTimeout(id);
  }, [isVisible, adLoaded, isPremium]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      const container = bannerRef.current;
      if (container && container.isConnected) {
        try {
          // Clear children safely
          container.innerHTML = '';
        } catch {
          // Ignore cleanup errors during unmount
        }
      }
    };
  }, []);

  if (isPremium) {
    return null;
  }

  return (
    <div className="flex justify-center my-4 w-full overflow-hidden">
      <div
        ref={bannerRef}
        className="w-[320px] h-[50px] bg-black/50 rounded flex items-center justify-center"
        aria-label="Advertisement"
      >
        {!adLoaded && (
          <span className="text-xs text-muted-foreground/50">Ad</span>
        )}
      </div>
    </div>
  );
}

class AdErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[AdBanner] ErrorBoundary caught error:", error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

const AdBanner = memo(function AdBanner() {
  return (
    <AdErrorBoundary>
      <AdBannerComponent />
    </AdErrorBoundary>
  );
});

export default AdBanner;
