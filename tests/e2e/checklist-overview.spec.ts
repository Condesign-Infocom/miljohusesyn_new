import { expect, test } from '@playwright/test';
import { loginAsDemo } from './helpers';

test('demo user can open My Checklists and the checklist overview', async ({ page }) => {
	await loginAsDemo(page);
	await page.goto('/checklists');
	await expect(page).toHaveURL(/\/checklists\/miljohusesyn$/);
	await expect(page.getByRole('button', { name: 'Miljöhusesyn' })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await expect(page.getByRole('button', { name: 'Grundvillkor' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Nya frågor' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Översikt' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Statistik' })).toBeVisible();
});
