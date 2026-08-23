// Accessibility scans with axe-core. Critical and serious violations fail
// the build; minor/moderate findings are logged for visibility only.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
    '/index.html',
    '/about.html',
    '/services.html',
    '/projects.html',
    '/contact.html',
    '/casestudies.html',
    '/404.html',
    '/services/power-platform.html',
    '/services/dotnet-development.html',
    '/services/ai-integration.html',
    '/services/custom-tools-and-automation.html',
    '/services/business-websites.html',
    '/projects/games.html',
    '/projects/tools.html',
    '/projects/simulations.html',
    '/projects/simulations/conways-game-of-life/',
    '/projects/simulations/astar-search/',
    '/projects/simulations/sorting-algorithms/',
];

test.describe('accessibility (axe-core)', () => {
    for (const path of PAGES) {
        test(`no critical or serious violations on ${path}`, async ({ page }) => {
            // Disable the scroll-reveal animations so axe never scans an
            // element mid-transition (script.js honors reduced motion).
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.goto(path);

            const results = await new AxeBuilder({ page }).analyze();

            const lesser = results.violations.filter(
                v => v.impact !== 'critical' && v.impact !== 'serious');
            if (lesser.length > 0) {
                console.log(`[axe] ${path} minor/moderate findings: ` +
                    lesser.map(v => `${v.id} (${v.impact}, ${v.nodes.length} nodes)`).join('; '));
            }

            const severe = results.violations
                .filter(v => v.impact === 'critical' || v.impact === 'serious')
                .map(v => ({
                    id: v.id,
                    impact: v.impact,
                    help: v.help,
                    targets: v.nodes.map(n => n.target),
                }));
            expect(severe).toEqual([]);
        });
    }
});
