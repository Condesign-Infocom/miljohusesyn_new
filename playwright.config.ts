import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'tests/e2e',
	workers: 1,
	use: {
		baseURL: 'http://127.0.0.1:4173'
	},
	webServer: {
		command:
			'py -3 -m pip install -r ..\\importer\\requirements.txt && powershell -ExecutionPolicy Bypass -File ..\\scripts\\prepare-dev-postgres.ps1 && pnpm build && pnpm vite preview --host 127.0.0.1 --port 4173',
		port: 4173,
		timeout: 180_000,
		reuseExistingServer: !process.env.CI
	}
});
