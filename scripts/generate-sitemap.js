const fs = require('fs');
const path = require('path');

const siteUrl = process.env.SITE_URL || 'https://bakhur.online';
const dataPath = path.join(__dirname, 'perfumes.json');
const publicPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
const buildPath = path.join(__dirname, '..', 'dist', 'sitemap.xml');

let perfumes = [];
try {
  perfumes = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
} catch (e) {
  console.error('Failed to read perfumes.json:', e.message);
}

const urls = [
  { loc: '/', changefreq: 'daily', priority: '1.0' },
  { loc: '/about', changefreq: 'monthly', priority: '0.6' },
  { loc: '/delivery', changefreq: 'monthly', priority: '0.5' },
  { loc: '/payment', changefreq: 'monthly', priority: '0.5' },
  { loc: '/contacts', changefreq: 'monthly', priority: '0.6' },
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

const outPath = fs.existsSync(path.join(__dirname, '..', 'dist')) ? buildPath : publicPath;
fs.writeFileSync(outPath, xml, 'utf8');
console.log('sitemap.xml generated:', outPath);
