import { expect, test } from '@playwright/test';
import { loginAsDemo } from './helpers';

test('checklist overview exposes the PDF export action to authenticated users', async ({ page }) => {
	test.setTimeout(120000);

	await loginAsDemo(page);
	await page.goto('/checklists/miljohusesyn-a');
	await expect(page.getByRole('button', { name: /Min åtgärdsplan/i })).toBeVisible();
});
