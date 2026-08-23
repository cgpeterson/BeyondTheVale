// Search-indexing guardrails: the static facts Google Search Console reports on
// (canonicals, sitemap coverage, noindex, titles/descriptions, dead links,
// structured data). Everything here is checkable offline, so it runs with the
// rest of `npm run test:unit`. Paths are relative to the repo root.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ORIGIN, REDIRECTS, expectedCanonical } from '../../scripts/site.mjs';

const SKIP_DIRS = new Set(['node_modules', '.git', 'test-results', 'playwright-report', 'Context', 'src']);

/** Every HTML file in the repo, as repo-relative POSIX paths. */
function findHtml(dir = '.') {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        if (SKIP_DIRS.has(entry.name)) return [];
        const p = path.posix.join(dir, entry.name);
        if (entry.isDirectory()) return findHtml(p);
        return entry.name.endsWith('.html') ? [p.replace(/^\.\//, '')] : [];
    });
}

const ALL_PAGES = findHtml();
const read = (page) => fs.readFileSync(page, 'utf8');
const attr = (html, re) => html.match(re)?.[1] ?? null;
const isNoindex = (html) => /<meta name="robots" content="[^"]*noindex/.test(html);

const INDEXABLE = ALL_PAGES.filter(p => !isNoindex(read(p)));

const sitemapXml = read('sitemap.xml');
const sitemapUrls = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);

test('only 404.html and redirect stubs are noindex', () => {
    const noindexed = ALL_PAGES.filter(p => isNoindex(read(p)));
    assert.deepEqual(noindexed.sort(), ['404.html', ...Object.keys(REDIRECTS)].sort());
});

test('redirect stubs point at live pages and carry a matching canonical', () => {
    for (const [from, to] of Object.entries(REDIRECTS)) {
        const html = read(from);
        const target = to.endsWith('/') ? `${to.slice(1)}index.html` : to.slice(1);
        assert.ok(fs.existsSync(target), `${from}: redirect target ${to} does not exist`);
        assert.ok(html.includes(`<meta http-equiv="refresh" content="0; url=${to}">`), `${from}: missing meta refresh`);
        assert.ok(html.includes(`<link rel="canonical" href="${ORIGIN}${to}">`), `${from}: canonical should point at the new URL`);
    }
});

test('every indexable page has one absolute canonical matching its own URL', () => {
    for (const page of INDEXABLE) {
        const html = read(page);
        const canonicals = html.match(/<link rel="canonical"/g) ?? [];
        assert.equal(canonicals.length, 1, `${page}: expected exactly one canonical`);
        const href = attr(html, /<link rel="canonical" href="([^"]+)">/);
        assert.equal(href, expectedCanonical(page), `${page}: canonical does not match its URL`);
        const ogUrl = attr(html, /<meta property="og:url" content="([^"]+)">/);
        if (ogUrl !== null) assert.equal(ogUrl, href, `${page}: og:url must equal canonical`);
    }
});

test('sitemap and indexable pages agree exactly', () => {
    const expected = INDEXABLE.map(expectedCanonical).sort();
    assert.deepEqual([...sitemapUrls].sort(), expected,
        'sitemap.xml <loc> entries must match the set of indexable pages');
    assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, 'sitemap has duplicate <loc>');
});

test('sitemap lastmod values are ISO dates, not in the future', () => {
    const today = new Date().toISOString().slice(0, 10);
    const lastmods = [...sitemapXml.matchAll(/<lastmod>(.*?)<\/lastmod>/g)].map(m => m[1]);
    assert.equal(lastmods.length, sitemapUrls.length, 'every sitemap <url> needs a <lastmod>');
    for (const d of lastmods) {
        assert.match(d, /^\d{4}-\d{2}-\d{2}$/, `bad lastmod: ${d}`);
        assert.ok(d <= today, `lastmod in the future: ${d}`);
    }
});

test('robots.txt allows crawling and points at the sitemap', () => {
    const robots = read('robots.txt');
    assert.match(robots, /^Allow: \/$/m);
    assert.doesNotMatch(robots, /^Disallow: \/$/m, 'robots.txt blocks the whole site');
    assert.match(robots, new RegExp(`^Sitemap: ${ORIGIN}/sitemap\\.xml$`, 'm'));
});

test('every indexable page has a unique title and one description of sensible length', () => {
    const titles = new Map();
    for (const page of INDEXABLE) {
        const html = read(page);
        const title = attr(html, /<title>([^<]*)<\/title>/)?.trim();
        assert.ok(title, `${page}: missing <title>`);
        assert.ok(title.length <= 70, `${page}: title over 70 chars (${title.length})`);
        assert.ok(!titles.has(title), `${page}: title duplicates ${titles.get(title)}`);
        titles.set(title, page);

        const descriptions = html.match(/<meta name="description"/g) ?? [];
        assert.equal(descriptions.length, 1, `${page}: expected exactly one meta description`);
        const description = attr(html, /<meta name="description" content="([^"]*)">/);
        assert.ok(description.length >= 50 && description.length <= 170,
            `${page}: description should be 50-170 chars, got ${description.length}`);

        assert.match(html, /<meta name="viewport" content="width=device-width/, `${page}: missing viewport`);
        assert.match(html, /<html lang="en">/, `${page}: missing lang attribute`);
    }
});

test('no internal link or asset reference is dead', () => {
    const broken = [];
    for (const page of ALL_PAGES) {
        const html = read(page);
        for (const [, url] of html.matchAll(/\s(?:href|src)="([^"#]+)(?:#[^"]*)?"/g)) {
            if (/^(mailto:|tel:|javascript:|data:|https?:|\/\/)/.test(url)) continue;
            const clean = url.split('?')[0];
            let target = clean.startsWith('/')
                ? clean.slice(1)
                : path.posix.join(path.posix.dirname(page), clean);
            if (clean.endsWith('/')) target = path.posix.join(target, 'index.html');
            if (!fs.existsSync(target || 'index.html')) broken.push(`${page} -> ${url}`);
        }
    }
    assert.deepEqual(broken, []);
});

test('in-page anchor links point at existing ids', () => {
    const broken = [];
    for (const page of ALL_PAGES) {
        const html = read(page);
        for (const [, href] of html.matchAll(/\shref="([^"]*#[^"]+)"/g)) {
            if (/^https?:/.test(href)) continue;
            const [file, id] = href.split('#');
            const target = file === '' ? page : path.posix.join(path.posix.dirname(page), file);
            if (!fs.existsSync(target)) continue; // reported by the dead-link test
            if (!read(target).includes(`id="${id}"`)) broken.push(`${page} -> ${href}`);
        }
    }
    assert.deepEqual(broken, []);
});

test('external links open safely', () => {
    for (const page of ALL_PAGES) {
        for (const [tag] of read(page).matchAll(/<a [^>]*target="_blank"[^>]*>/g)) {
            assert.match(tag, /rel="[^"]*noopener/, `${page}: ${tag} needs rel="noopener"`);
        }
    }
});

test('structured data blocks are valid JSON-LD', () => {
    for (const page of INDEXABLE) {
        const blocks = [...read(page).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
        for (const [, json] of blocks) {
            let data;
            assert.doesNotThrow(() => { data = JSON.parse(json); }, `${page}: JSON-LD does not parse`);
            assert.equal(data['@context'], 'https://schema.org', `${page}: JSON-LD missing @context`);
            assert.ok(data['@type'], `${page}: JSON-LD missing @type`);
        }
    }
});
