import { expect, test } from '@playwright/test';
import { loginAsDemo } from './helpers';

test('question info opens linked fact content', async ({ page }) => {
	await loginAsDemo(page);
	await page.goto('/checklists/miljohusesyn-g/sections/node-id-G1-2015-02-25');
	await page.waitForLoadState('networkidle');
	const infoButton = page.getByRole('button', { name: /visa information/i }).first();
	const dialog = page.getByRole('dialog');
	await infoButton.click();
	await expect(dialog).toBeVisible({ timeout: 15000 });
	await expect(dialog).toContainText(/Anmälningspliktig verksamhet/i);
});
