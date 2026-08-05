import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: 'tests/e2e',
    timeout: 30_000,
    fullyParallel: true,
    reporter: [['list']],
    use: {
        baseURL: 'http://127.0.0.1:8080',
    },
    webServer: {
        command: 'npx http-server -p 8080 -c-1 --silent .',
        url: 'http://127.0.0.1:8080/index.html',
        reuseExistingServer: true,
        timeout: 30_000,
    },
});
