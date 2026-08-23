// Stamps src/pages/** into root HTML files using src/layout.html and src/partials/*.
// No dependencies. `node scripts/build.mjs --check` exits 1 if the committed output is stale.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ORIGIN, SRC_PAGES, STANDALONE_PAGES, REDIRECTS, pageList, expectedCanonical } from './site.mjs';

const NAV_KEYS = ['home', 'about', 'services', 'work', 'casestudies', 'contact'];
const OG_IMAGE = `${ORIGIN}/og-image.png`;
const DEFAULT_OG_ALT = 'Beyond The Vale &mdash; Custom software for any job, any size.';

const read = (p) => fs.readFileSync(p, 'utf8');
const layout = read('src/layout.html');
const partials = {
    nav: read('src/partials/nav.html'),
    footer: read('src/partials/footer.html'),
};
const organization = JSON.parse(read('src/partials/organization.json'));

function escapeAttr(s) {
    return s.replace(/&(?!(?:amp|lt|gt|quot|#\d+|[a-z]+);)/g, '&amp;').replace(/"/g, '&quot;');
}

function jsonLdBlock(obj) {
    const json = JSON.stringify(obj, null, 4).replace(/\n/g, '\n    ');
    return `    <script type="application/ld+json">\n    ${json}\n    </script>\n`;
}

/** Parse "<!-- {json} -->" front matter + optional <template data-slot> blocks + body. */
export function parseSource(src, file) {
    const m = src.match(/^\s*<!--\s*(\{[\s\S]*?\})\s*-->\s*/);
    if (!m) throw new Error(`${file}: missing JSON front matter comment`);
    let meta;
    try { meta = JSON.parse(m[1]); } catch (e) { throw new Error(`${file}: front matter is not valid JSON (${e.message})`); }
    let body = src.slice(m[0].length);
    const slots = {};
    body = body.replace(/<template data-slot="(head|scripts)">\n?([\s\S]*?)<\/template>\n?/g, (_, name, content) => {
        slots[name] = (slots[name] ?? '') + content;
        return '';
    });
    return { meta, slots, body: body.replace(/\s+$/, '') };
}

function renderNav(active) {
    if (!NAV_KEYS.includes(active)) throw new Error(`unknown nav key "${active}"`);
    return partials.nav
        .replace(`class="nav-link" data-nav="${active}"`, 'class="nav-link active"')
        .replace(/ data-nav="[a-z]+"/g, '');
}

function breadcrumbList(meta, page) {
    if (!meta.breadcrumbs) return null;
    const items = [
        { name: 'Home', item: `${ORIGIN}/` },
        ...meta.breadcrumbs.map(b => ({ name: b.name, item: b.path ? `${ORIGIN}/${b.path}` : expectedCanonical(page) })),
    ];
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, item: b.item })),
    };
}

export function renderPage(page, src) {
    const { meta, slots, body } = parseSource(src, page);
    for (const key of ['title', 'description', 'nav']) {
        if (!meta[key]) throw new Error(`${page}: front matter needs "${key}"`);
    }
    const canonical = expectedCanonical(page);
    const title = escapeAttr(meta.title);
    const description = escapeAttr(meta.description);

    let seo = '';
    let jsonld = '';
    if (!meta.noindex) {
        const ogAlt = meta.ogImageAlt ? escapeAttr(meta.ogImageAlt) : DEFAULT_OG_ALT;
        seo = [
            `<link rel="canonical" href="${canonical}">`,
            `<meta property="og:type" content="website">`,
            `<meta property="og:url" content="${canonical}">`,
            `<meta property="og:site_name" content="Beyond The Vale">`,
            `<meta property="og:locale" content="en_US">`,
            `<meta property="og:title" content="${title}">`,
            `<meta property="og:description" content="${description}">`,
            `<meta property="og:image" content="${OG_IMAGE}">`,
            `<meta property="og:image:width" content="1200">`,
            `<meta property="og:image:height" content="630">`,
            `<meta property="og:image:alt" content="${ogAlt}">`,
            `<meta name="twitter:card" content="summary_large_image">`,
            `<meta name="twitter:title" content="${title}">`,
            `<meta name="twitter:description" content="${description}">`,
            `<meta name="twitter:image" content="${OG_IMAGE}">`,
        ].map(line => `    ${line}\n`).join('');

        const blocks = [];
        if (meta.organization !== false) blocks.push(organization);
        const crumbs = breadcrumbList(meta, page);
        if (crumbs) blocks.push(crumbs);
        for (const extra of meta.jsonld ?? []) blocks.push({ '@context': 'https://schema.org', ...extra });
        jsonld = blocks.map(jsonLdBlock).join('');
    }

    return layout
        .replace('{{source}}', page)
        .replace('{{title}}', title)
        .replace('{{description}}', description)
        .replace('{{robots}}', meta.noindex ? '    <meta name="robots" content="noindex">\n' : '')
        .replace('{{seo}}', seo)
        .replace('{{jsonld}}', jsonld)
        .replace('{{slot:head}}', slots.head ?? '')
        .replace('{{slot:scripts}}', slots.scripts ?? '')
        .replace('{{> nav}}', renderNav(meta.nav))
        .replace('{{> footer}}', partials.footer)
        .replace('{{body}}', () => body);
}

export function renderRedirect(to) {
    const target = `${ORIGIN}${to}`;
    return `<!DOCTYPE html>
<!-- GENERATED by scripts/build.mjs from src/redirects.json. Edit the source, then run \`npm run build\`. -->
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Moved | Beyond The Vale</title>
    <meta name="description" content="This page has moved to ${target}. You will be redirected automatically, or follow the link.">
    <meta name="robots" content="noindex">
    <meta http-equiv="refresh" content="0; url=${to}">
    <link rel="canonical" href="${target}">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/images/icon-192.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="manifest" href="/site.webmanifest">
</head>
<body>
    <p>This page moved to <a href="${to}">${target}</a>.</p>
</body>
</html>
`;
}

/** Last commit date of a file, or today if it is new or has uncommitted changes. */
function gitDate(file) {
    try {
        const dirty = execSync(`git status --porcelain -- "${file}"`, { encoding: 'utf8' }).trim() !== '';
        const out = execSync(`git log -1 --format=%cs -- "${file}"`, { encoding: 'utf8' }).trim();
        if (!dirty && /^\d{4}-\d{2}-\d{2}$/.test(out)) return out;
    } catch { /* not a git checkout */ }
    return new Date().toISOString().slice(0, 10);
}

export function renderSitemap(pages) {
    const entries = [];
    for (const page of pages) {
        const { meta } = parseSource(read(path.posix.join(SRC_PAGES, page)), page);
        if (meta.noindex) continue;
        entries.push({
            loc: expectedCanonical(page),
            lastmod: gitDate(path.posix.join(SRC_PAGES, page)),
            priority: meta.priority ?? 0.6,
        });
    }
    for (const page of STANDALONE_PAGES) {
        entries.push({ loc: expectedCanonical(page), lastmod: gitDate(page), priority: 0.5 });
    }
    entries.sort((a, b) => b.priority - a.priority || a.loc.localeCompare(b.loc));
    const body = entries.map(e =>
        `    <url>\n        <loc>${e.loc}</loc>\n        <lastmod>${e.lastmod}</lastmod>\n        <priority>${e.priority.toFixed(1)}</priority>\n    </url>`
    ).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function renderAll() {
    const out = new Map();
    const pages = pageList();
    for (const page of pages) out.set(page, renderPage(page, read(path.posix.join(SRC_PAGES, page))));
    for (const [from, to] of Object.entries(REDIRECTS)) {
        if (out.has(from)) throw new Error(`redirect source ${from} is also a page`);
        out.set(from, renderRedirect(to));
    }
    out.set('sitemap.xml', renderSitemap(pages));
    return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const check = process.argv.includes('--check');
    const rendered = renderAll();
    const stale = [];
    for (const [file, content] of rendered) {
        const current = fs.existsSync(file) ? read(file) : null;
        if (current === content) continue;
        if (check) { stale.push(file); continue; }
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content);
        console.log(`wrote ${file}`);
    }
    if (check && stale.length) {
        console.error(`Stale build output (run \`npm run build\` and commit):\n  ${stale.join('\n  ')}`);
        process.exit(1);
    }
    if (check) console.log(`build output up to date (${rendered.size} files)`);
}
