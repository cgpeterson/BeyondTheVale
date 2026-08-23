// Smoke tests for every page: loads, branded title, full nav, footer, and a
// clean console. External-network noise (fonts, formspree, favicon) is
// ignored because CI may block outbound requests.
import { test, expect } from '@playwright/test';

// Pages that share the site chrome (navbar + footer).
const CHROME_PAGES = [
    '/index.html',
    '/about.html',
    '/services.html',
    '/projects.html',
    '/contact.html',
    '/casestudies.html',
    '/404.html',
    '/services/business-websites.html',
    '/services/enterprise-platform-development.html',
    '/projects/fitness.html',
    '/projects/games.html',
    '/projects/tools.html',
    '/projects/simulations.html',
    '/projects/fitness/fitness-level-tracking/',
];

// Standalone full-screen pages (no site chrome, own styles) and the page
// their back link must return to.
const STANDALONE_PAGES = {
    '/projects/simulations/conways-game-of-life/': '../../simulations.html',
    '/projects/simulations/astar-search/': '../../simulations.html',
    '/projects/simulations/sorting-algorithms/': '../../simulations.html',
    '/projects/games/hollow-duel/': '../../games.html',
};

const IGNORED_ERROR = /formspree|fonts\.googleapis|fonts\.gstatic|favicon/i;

/** Attach console/pageerror collectors before navigation. */
function collectErrors(page) {
    const errors = [];
    page.on('console', message => {
        if (message.type() !== 'error') return;
        const url = (message.location() && message.location().url) || '';
        const text = message.text();
        if (IGNORED_ERROR.test(url) || IGNORED_ERROR.test(text)) return;
        errors.push(`console error: ${text} (${url})`);
    });
    page.on('pageerror', error => {
        const text = String(error);
        if (IGNORED_ERROR.test(text)) return;
        errors.push(`pageerror: ${text}`);
    });
    return errors;
}

test.describe('page smoke tests', () => {
    for (const path of CHROME_PAGES) {
        test(`loads cleanly: ${path}`, async ({ page }) => {
            const errors = collectErrors(page);

            const response = await page.goto(path);
            expect(response.ok()).toBe(true);

            await expect(page).toHaveTitle(/Beyond The Vale/);

            // Exactly six nav links, all visible (desktop viewport).
            const navLinks = page.locator('.nav-menu .nav-link');
            await expect(navLinks).toHaveCount(6);
            for (const link of await navLinks.all()) {
                await expect(link).toBeVisible();
            }

            const footer = page.locator('footer.footer');
            await expect(footer).toBeVisible();
            await expect(footer).toContainText('Beyond The Vale');

            // Give late scripts a moment to surface any errors.
            await page.waitForTimeout(300);
            expect(errors).toEqual([]);
        });
    }

    for (const [path, backHref] of Object.entries(STANDALONE_PAGES)) {
        test(`standalone sim loads cleanly: ${path}`, async ({ page }) => {
            const errors = collectErrors(page);

            const response = await page.goto(path);
            expect(response.ok()).toBe(true);

            await expect(page).toHaveTitle(/Beyond The Vale/);

            // Each standalone page links back into the site.
            const back = page.locator('a.back');
            await expect(back).toBeVisible();
            await expect(back).toHaveAttribute('href', backHref);

            await page.waitForTimeout(300);
            expect(errors).toEqual([]);
        });
    }
});
