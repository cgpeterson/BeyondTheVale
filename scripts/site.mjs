// Shared site facts for the build and the tests.
import fs from 'node:fs';
import path from 'node:path';

export const ORIGIN = 'https://beyondthevale.net';
export const SRC_PAGES = 'src/pages';

/** Pages that ship their own chrome-less shell (standalone apps). Never built, only sitemapped. */
export const STANDALONE_PAGES = [
    'projects/simulations/conways-game-of-life/index.html',
    'projects/simulations/astar-search/index.html',
    'projects/simulations/sorting-algorithms/index.html',
    'projects/games/hollow-duel/index.html',
];

/** Old URL -> new root-absolute URL. Each old path is emitted as a noindex meta-refresh stub. */
export const REDIRECTS = JSON.parse(fs.readFileSync('src/redirects.json', 'utf8'));

/** Repo-relative POSIX paths of every source page (== its output path). */
export function pageList(dir = SRC_PAGES) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const p = path.posix.join(dir, entry.name);
        if (entry.isDirectory()) return pageList(p);
        return entry.name.endsWith('.html') ? [path.posix.relative(SRC_PAGES, p)] : [];
    }).sort();
}

/** The URL Google should index for a file: index.html -> directory with trailing slash. */
export function expectedCanonical(page) {
    const p = page === 'index.html' ? '' : page.replace(/index\.html$/, '');
    return `${ORIGIN}/${p}`;
}
