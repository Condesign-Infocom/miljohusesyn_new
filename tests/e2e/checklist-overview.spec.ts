import { expect, test } from '@playwright/test';
import { loginAsDemo } from './helpers';

test('demo user can open My Checklists and the checklist overview', async ({ page }) => {
	await loginAsDemo(page);
	await page.goto('/checklists');
	await expect(page.getByRole('heading', { name: 'Mina checklistor' })).toBeVisible();
	await page.getByRole('link', { name: /Miljöhusesyn/i }).first().click();
	await expect(page).toHaveURL(/\/checklists\/miljohusesyn$/);
	await expect(page.getByRole('heading', { name: 'Översikt' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Statistik' })).toBeVisible();
});
