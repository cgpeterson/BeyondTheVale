// The build is the source of truth for every chrome page: output must be fresh
// and every page must light up exactly the nav item its front matter names.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderAll, parseSource } from '../../scripts/build.mjs';
import { pageList, SRC_PAGES } from '../../scripts/site.mjs';

const rendered = renderAll();

test('committed output matches a fresh build (run `npm run build`)', () => {
    const stale = [...rendered].filter(([file, content]) => !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content).map(([f]) => f);
    assert.deepEqual(stale, []);
});

test('every page highlights exactly one nav link, matching its front matter', () => {
    const hrefFor = { home: '/', about: '/about.html', services: '/services.html', work: '/projects.html', casestudies: '/casestudies.html', contact: '/contact.html' };
    for (const page of pageList()) {
        const { meta } = parseSource(fs.readFileSync(`${SRC_PAGES}/${page}`, 'utf8'), page);
        const html = rendered.get(page);
        const active = [...html.matchAll(/<a href="([^"]+)" class="nav-link active"/g)].map(m => m[1]);
        assert.deepEqual(active, [hrefFor[meta.nav]], `${page}: active nav link`);
        assert.ok(!html.includes('data-nav='), `${page}: data-nav attributes should be stripped`);
    }
});
