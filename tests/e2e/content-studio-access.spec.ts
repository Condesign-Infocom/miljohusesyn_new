import { expect, test } from '@playwright/test';
import { loginAsDemo } from './helpers';

test('guests are redirected away from content studio', async ({ page }) => {
	await page.goto('/admin/content-studio');

	await expect(page).toHaveURL(/\/login\?redirectTo=%2Fadmin%2Fcontent-studio$/);
});

test('admin can open content studio discovery pages', async ({ page }) => {
	await loginAsDemo(page, 'admin');

	await page.goto('/admin/content-studio');
	await expect(page).toHaveURL(/\/admin\/content-studio\/checklists\/.+/);
	await expect(page.getByRole('heading', { name: /struktur/i })).toBeVisible();
	await expect(
		page.getByLabel('Navigering för innehållsredaktion').getByRole('link', { name: 'Profiler' })
	).toBeVisible();

	await page.goto('/admin/content-studio/facts');
	await expect(page.getByRole('heading', { name: 'Fakta' })).toBeVisible();

	await page.goto('/admin/content-studio/standard-content');
	await expect(page.getByRole('heading', { name: 'Standardtexter' })).toBeVisible();

	await page.goto('/admin/content-studio/profile-rules');
	await expect(page.getByRole('heading', { name: 'Profilregler' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Filtrera' })).toBeVisible();

	await page.goto('/admin/content-studio/checklists');
	await expect(page).toHaveURL(/\/admin\/content-studio\/checklists\/.+/);
	await expect(page.getByRole('heading', { name: /struktur/i })).toBeVisible();
	await expect(page.getByRole('button', { name: /Skapa nära/ }).first()).toBeVisible();
	await expect(page.getByRole('button', { name: /Fler åtgärder/ })).toHaveCount(0);
	await expect(page.getByRole('button', { name: /Ta bort grupp/ }).first()).toBeVisible();
	await expect(page.locator('.checklist-switcher a')).toHaveCount(5);
});

test('admin can open the checklist structure editor shell', async ({ page }) => {
	await loginAsDemo(page, 'admin');

	await page.goto('/admin/content-studio/checklists');
	await expect(page).toHaveURL(/\/admin\/content-studio\/checklists\/.+/);

	await expect(page.getByRole('heading', { name: /struktur/i })).toBeVisible();
	await page.getByRole('button', { name: /Skapa nära/ }).first().click();
	await expect(page.getByRole('button', { name: 'Ny grupp efter' })).toBeVisible();
	await expect(page.locator('.checklist-switcher a[aria-current="page"]')).toHaveCount(1);
});

test('admin can distinguish warnings from blockers in validation', async ({ page }) => {
	await loginAsDemo(page, 'admin');

	await page.goto('/admin/content-studio/validation');
	await expect(page.getByText('Varningar', { exact: true })).toBeVisible();
	await expect(
		page.getByText('de blockerar inte publicering på egen hand')
	).toBeVisible();
});

test('admin is redirected away from the retired publishing queue', async ({ page }) => {
	await loginAsDemo(page, 'admin');

	await page.goto('/admin/publishing');
	await expect(page).toHaveURL(/\/admin\/content-studio/);
	await expect(page.getByLabel('Navigering för innehållsredaktion').getByRole('link', { name: 'Publicering' })).toHaveCount(0);
});
