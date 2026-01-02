import { useEffect, useRef, useState, memo } from 'react';
import { useUserData } from '@/hooks/useUserData';

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

  // IntersectionObserver: Only load ad when visible
  useEffect(() => {
    if (isPremium || !bannerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
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
      const container = bannerRef.current;
      if (!container) return;

      try {
        container.innerHTML = '';

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
        setAdLoaded(true);
      } catch (error) {
        console.warn("Failed to load ad banner:", error);
      }
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(loadAd, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    } else {
      const id = setTimeout(loadAd, 100);
      return () => clearTimeout(id);
    }
  }, [isVisible, adLoaded, isPremium]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (bannerRef.current) {
        bannerRef.current.innerHTML = '';
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

export default memo(AdBannerComponent);
