import { useEffect, useRef } from 'react';

export default function AdBanner() {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bannerRef.current) return;

    const container = bannerRef.current;
    container.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.style.border = 'none';
    iframe.style.width = '320px';
    iframe.style.height = '50px';
    iframe.style.overflow = 'hidden';
    iframe.scrolling = 'no';
    // Add sandbox to prevent ad from messing with parent window, but allow scripts
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');

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

    return () => {
      container.innerHTML = '';
    };
  }, []);

  return (
    <div className="flex justify-center my-4 w-full overflow-hidden">
      <div ref={bannerRef} className="w-[320px] h-[50px] bg-black/50 rounded flex items-center justify-center">
        {/* Ad will be injected here */}
      </div>
    </div>
  );
}
