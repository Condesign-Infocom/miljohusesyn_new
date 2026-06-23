import { expect, test } from '@playwright/test';

test('root path redirects through login for guests', async ({ page }) => {
	await page.goto('/');

	await expect(page).toHaveURL(/\/login\?redirectTo=%2Fchecklists$/);
});
