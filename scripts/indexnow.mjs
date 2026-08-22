// Pings IndexNow (Bing, and other participating engines) with URLs that changed.
//
// Usage:
//   node scripts/indexnow.mjs                     # submits every URL in sitemap.xml
//   node scripts/indexnow.mjs about.html services.html
//   node scripts/indexnow.mjs https://beyondthevale.net/about.html
//
// Run this after deploying a change that should be picked up quickly (new page,
// changed content, renamed URL). Routine content edits don't need it — search
// engines still crawl on their own schedule; this just skips the wait.

import { readFile } from 'node:fs/promises';

const HOST = 'beyondthevale.net';
const KEY = 'e89c1b77fdc3cc7a3633fa4610efee5b';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

async function urlsFromSitemap() {
    const xml = await readFile(new URL('../sitemap.xml', import.meta.url), 'utf8');
    return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
}

function toAbsolute(arg) {
    return arg.startsWith('http') ? arg : `https://${HOST}/${arg.replace(/^\//, '')}`;
}

const args = process.argv.slice(2);
const urlList = args.length > 0 ? args.map(toAbsolute) : await urlsFromSitemap();

const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
});

console.log(`Submitted ${urlList.length} URL(s) to IndexNow: HTTP ${res.status}`);
urlList.forEach(u => console.log(`  ${u}`));

if (!res.ok) {
    console.error(await res.text());
    process.exit(1);
}
