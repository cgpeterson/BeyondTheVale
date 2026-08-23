// Static consistency suite: every chrome page must carry the shared navbar
// and footer, correct per-page metadata, and a favicon. Paths are relative
// to process.cwd(), which is the repo root when run via `node --test`.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const CHROME_PAGES = [
    'index.html',
    'about.html',
    'services.html',
    'projects.html',
    'contact.html',
    'casestudies.html',
    '404.html',
    'services/business-websites.html',
    'services/enterprise-platform-development.html',
    'projects/fitness.html',
    'projects/games.html',
    'projects/tools.html',
    'projects/simulations.html',
    'projects/fitness/fitness-level-tracking/index.html',
];
const SIM_PAGES = [
    'projects/simulations/conways-game-of-life/index.html',
    'projects/simulations/astar-search/index.html',
    'projects/simulations/sorting-algorithms/index.html',
    'projects/games/hollow-duel/index.html',
];
const ALL = [...CHROME_PAGES, ...SIM_PAGES];

const readPage = (page) => fs.readFileSync(page, 'utf8');
const countMatches = (html, re) => (html.match(re) ?? []).length;

test('every chrome page has a navbar with exactly six nav links and a footer', () => {
    for (const page of CHROME_PAGES) {
        const html = readPage(page);
        assert.ok(html.includes('<nav class="navbar">'), `${page}: missing navbar`);
        assert.equal(countMatches(html, /class="nav-link[" ]/g), 6,
            `${page}: expected exactly six nav links`);
        assert.ok(html.includes('<footer class="footer">'), `${page}: missing footer`);
        assert.ok(html.includes('class="hamburger"'), `${page}: missing hamburger button`);
    }
});

test('every page has a non-empty, unique title containing the site name', () => {
    const seen = new Map();
    for (const page of ALL) {
        const match = readPage(page).match(/<title>([^<]*)<\/title>/);
        assert.ok(match, `${page}: missing <title>`);
        const title = match[1].trim();
        assert.ok(title.length > 0, `${page}: empty <title>`);
        assert.ok(title.includes('Beyond The Vale'), `${page}: title missing 'Beyond The Vale': ${title}`);
        assert.ok(!seen.has(title), `${page}: duplicate title also used by ${seen.get(title)}`);
        seen.set(title, page);
    }
});

test('every page declares the PNG favicon, apple-touch-icon, and manifest', () => {
    for (const page of ALL) {
        const html = readPage(page);
        assert.match(html, /<link rel="icon" type="image\/png" sizes="32x32" href="\/favicon-32\.png">/,
            `${page}: missing favicon link`);
        assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png">/,
            `${page}: missing apple-touch-icon`);
        assert.match(html, /<link rel="manifest" href="\/site\.webmanifest">/,
            `${page}: missing manifest`);
    }
});

test('every page has exactly one meta description or is the 404/sim shell', () => {
    for (const page of CHROME_PAGES) {
        const html = readPage(page);
        assert.equal(countMatches(html, /<meta name="description"/g), 1,
            `${page}: expected exactly one meta description`);
    }
});

test('404.html is noindex and uses root-absolute asset paths', () => {
    const html = readPage('404.html');
    assert.ok(html.includes('<meta name="robots" content="noindex">'),
        '404.html should carry a noindex robots meta');
    assert.ok(html.includes('href="/styles.css"'),
        '404.html must load styles.css by absolute path — it is served at arbitrary URLs');
    assert.ok(html.includes('src="/script.js"'),
        '404.html must load script.js by absolute path — it is served at arbitrary URLs');
});
