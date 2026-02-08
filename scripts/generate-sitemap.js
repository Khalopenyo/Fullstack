const fs = require('fs');
const path = require('path');

const siteUrl = process.env.SITE_URL || 'https://memoryparfume.ru';
const apiBase =
  process.env.API_URL ||
  process.env.PUBLIC_API_URL ||
  process.env.VITE_API_URL ||
  siteUrl;
const dataPath = path.join(__dirname, 'perfumes.json');
const publicPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
const buildPath = path.join(__dirname, '..', 'dist', 'sitemap.xml');

let perfumes = [];
async function loadPerfumes() {
  const base = String(apiBase || '').replace(/\/+$/, '');
  const url = `${base}/api/perfumes?mode=retail`;
  if (typeof fetch === 'function') {
    try {
      const res = await fetch(url, { headers: { 'accept': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.items)) return data.items;
      } else {
        console.error('Sitemap API error:', res.status, res.statusText);
      }
    } catch (e) {
      console.error('Sitemap API fetch failed:', e.message);
    }
  }
  try {
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (e) {
    console.error('Failed to read perfumes.json:', e.message);
  }
  return [];
}

async function run() {
  perfumes = await loadPerfumes();
  const now = new Date().toISOString();
  const urls = [
    { loc: '/', changefreq: 'daily', priority: '1.0', lastmod: now },
    { loc: '/about', changefreq: 'monthly', priority: '0.6', lastmod: now },
    { loc: '/delivery', changefreq: 'monthly', priority: '0.5', lastmod: now },
    { loc: '/payment', changefreq: 'monthly', priority: '0.5', lastmod: now },
    { loc: '/contacts', changefreq: 'monthly', priority: '0.6', lastmod: now },
  ];

  for (const p of perfumes) {
    if (!p || !p.id) continue;
    const lastmod = p.updatedAt || p.createdAt || now;
    urls.push({ loc: `/perfumes/${p.id}`, changefreq: 'weekly', priority: '0.6', lastmod });
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) =>
      `  <url>\n    <loc>${siteUrl}${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    ),
    '</urlset>',
    ''
  ].join('\n');

  const outPath = fs.existsSync(path.join(__dirname, '..', 'dist')) ? buildPath : publicPath;
  fs.writeFileSync(outPath, xml, 'utf8');
  console.log('sitemap.xml generated:', outPath);
}

run();
