import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { useUserData } from '@/hooks/useUserData';

export default function AdBanner() {
  const { user } = useAuth();
  const bannerRef = useRef<HTMLDivElement>(null);
  const { isPremium } = useUserData();

  useEffect(() => {
    if (isPremium) return; // Don't load ad script if premium
    if (!bannerRef.current) return;

    const container = bannerRef.current;
    if (!container) return; // Strict check again inside

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
      // Add sandbox to prevent ad from messing with parent window, but allow scripts and user-activated navigation
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
    } catch (error) {
      console.warn("Failed to load ad banner:", error);
      // Ensure we don't crash the app
    }

    return () => {
      container.innerHTML = '';
    };
  }, [isPremium]); // Re-run if premium status changes

  if (isPremium) {
    return null; // Return null to render nothing for premium users
  }

  return (
    <div className="flex justify-center my-4 w-full overflow-hidden">
      <div ref={bannerRef} className="w-[320px] h-[50px] bg-black/50 rounded flex items-center justify-center">
        {/* Ad will be injected here */}
      </div>
    </div>
  );
}
