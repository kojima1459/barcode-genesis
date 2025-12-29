import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://barcodegame-42858.web.app';
const PAGES = [
  '',
  '/battle',
  '/collection',
  '/leaderboard',
  '/shop',
  '/profile',
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  ${PAGES.map(page => `
  <url>
    <loc>${BASE_URL}${page}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${page === '' ? '1.0' : '0.8'}</priority>
    <xhtml:link rel="alternate" hreflang="ja" href="${BASE_URL}${page}" />
    <xhtml:link rel="alternate" hreflang="en" href="${BASE_URL}${page}" />
  </url>`).join('')}
</urlset>`;

const outputPath = path.resolve(process.cwd(), 'client/public/sitemap.xml');
fs.writeFileSync(outputPath, sitemap);
console.log(`Sitemap generated at ${outputPath}`);
