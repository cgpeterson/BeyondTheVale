// Interactive simulations: Game of Life, A* pathfinding, and the sorting
// visualizer. Each is a standalone page with inline script.
import { test, expect } from '@playwright/test';

test.describe("Conway's Game of Life", () => {
    test('seeds a random grid and step/play/random controls work', async ({ page }) => {
        await page.goto('/projects/simulations/conways-game-of-life/');

        // randomize() runs on load — a nonzero alive count proves the
        // script booted and wired its listeners.
        await expect(page.locator('#alive')).not.toHaveText('0');
        await expect(page.locator('#gen')).toHaveText('0');

        await page.locator('#stepBtn').click();
        await expect(page.locator('#gen')).toHaveText('1');

        const playBtn = page.locator('#playBtn');
        await playBtn.click();
        await expect(playBtn).toHaveText('Pause');
        await playBtn.click();
        await expect(playBtn).toHaveText('Play');

        await page.locator('#randomBtn').click();
        const alive = Number(await page.locator('#alive').textContent());
        expect(alive).toBeGreaterThan(0);
        await expect(page.locator('#gen')).toHaveText('0');
    });

    test('clear zeroes the grid and counters', async ({ page }) => {
        await page.goto('/projects/simulations/conways-game-of-life/');
        await page.locator('#clearBtn').click();
        await expect(page.locator('#alive')).toHaveText('0');
        await expect(page.locator('#gen')).toHaveText('0');
    });
});

test.describe('A* pathfinding', () => {
    test('diagonal toggle cycles its label', async ({ page }) => {
        await page.goto('/projects/simulations/astar-search/');

        const diagBtn = page.locator('#diagBtn');
        await expect(diagBtn).toHaveText('Diag: On');
        await diagBtn.click();
        await expect(diagBtn).toHaveText('Diag: Off');
        await diagBtn.click();
        await expect(diagBtn).toHaveText('Diag: On');
    });

    test('random maze and run execute without page errors', async ({ page }) => {
        const errors = [];
        page.on('pageerror', error => errors.push(String(error)));

        await page.goto('/projects/simulations/astar-search/');
        await page.locator('#mazeBtn').click();
        await page.locator('#runBtn').click();

        // Let the animated search progress for a while.
        await page.waitForTimeout(1500);
        expect(errors).toEqual([]);
    });
});

test.describe('Sorting visualizer', () => {
    test('Quick Sort runs and counts comparisons', async ({ page }) => {
        await page.goto('/projects/simulations/sorting-algorithms/');

        await page.locator('#quickBtn').click();
        await expect(page.locator('#algoName')).toHaveText('Quick Sort');
        await expect
            .poll(async () => Number(await page.locator('#ops').textContent()),
                { timeout: 10000 })
            .toBeGreaterThan(0);
    });

    test('size button cycles its label', async ({ page }) => {
        await page.goto('/projects/simulations/sorting-algorithms/');

        const sizeBtn = page.locator('#sizeBtn');
        await expect(sizeBtn).toHaveText('Size: 80');
        await sizeBtn.click();
        await expect(sizeBtn).toHaveText('Size: 160');
        await expect(page.locator('#count')).toHaveText('160');
        await sizeBtn.click();
        await expect(sizeBtn).toHaveText('Size: 320');
    });

    test('speed button cycles its label', async ({ page }) => {
        await page.goto('/projects/simulations/sorting-algorithms/');

        const speedBtn = page.locator('#speedBtn');
        await expect(speedBtn).toHaveText('Speed: Fast');
        await speedBtn.click();
        await expect(speedBtn).toHaveText('Speed: Instant');
        await speedBtn.click();
        await expect(speedBtn).toHaveText('Speed: Slow');
    });
});
