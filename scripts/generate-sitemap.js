const fs = require('fs');
const path = require('path');

const siteUrl = process.env.SITE_URL || 'https://example.com';
const dataPath = path.join(__dirname, 'perfumes.json');
const outPath = path.join(__dirname, '..', 'public', 'sitemap.xml');

let perfumes = [];
try {
  perfumes = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
} catch (e) {
  console.error('Failed to read perfumes.json:', e.message);
}

const urls = [
  { loc: '/', changefreq: 'daily', priority: '1.0' },
  { loc: '/wholesale', changefreq: 'weekly', priority: '0.7' },
  { loc: '/cart', changefreq: 'weekly', priority: '0.3' },
  { loc: '/favorites', changefreq: 'weekly', priority: '0.3' },
];

for (const p of perfumes) {
  if (!p || !p.id) continue;
  urls.push({ loc: `/perfumes/${p.id}`, changefreq: 'weekly', priority: '0.6' });
}

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map((u) =>
    `  <url>\n    <loc>${siteUrl}${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
  ),
  '</urlset>',
  ''
].join('\n');

fs.writeFileSync(outPath, xml, 'utf8');
console.log('sitemap.xml generated:', outPath);
