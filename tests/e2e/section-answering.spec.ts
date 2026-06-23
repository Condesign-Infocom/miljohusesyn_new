import { expect, test } from '@playwright/test';
import { loginAsDemo } from './helpers';

test('section answers persist across reload', async ({ page }) => {
	await loginAsDemo(page);
	await page.goto('/checklists/miljohusesyn-a/sections/node-id-A1-2015-02-25');
	await page.getByLabel(/Nej för/).first().check();
	await page.getByLabel('Kommentarer och åtgärdsförslag').first().fill('Checked in the demo app');
	await page.getByLabel('Åtgärdas senast datum').first().fill('2026-06-01');
	await page.getByRole('button', { name: 'Spara' }).first().click();
	await expect(page.getByRole('button', { name: 'Spara' }).first()).toBeEnabled();
	await page.reload();
	await expect(page.getByLabel('Kommentarer och åtgärdsförslag').first()).toHaveValue('Checked in the demo app');
	await expect(page.getByLabel('Åtgärdas senast datum').first()).toHaveValue('2026-06-01');
});
