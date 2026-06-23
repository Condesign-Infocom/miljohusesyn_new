import { expect, test } from '@playwright/test';
import { loginAsDemo } from './helpers';

test('profile save stays disabled until something changes and no final save step is shown', async ({
	page
}) => {
	await loginAsDemo(page);
	await page.goto('/profile');

	await expect(page.getByRole('heading', { name: 'Gårdsuppgifter' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Direktstatus' })).not.toBeVisible();
	await expect(page.getByText('Spara dina ändringar')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Spara uppgifter' })).toBeDisabled();

	await page.getByLabel('Företagsnamn / Namn').fill('Demo Garden AB Uppdaterad');
	await expect(page.getByRole('button', { name: 'Spara uppgifter' })).toBeEnabled();
});

test('profile validation warning clears immediately when the field is corrected', async ({ page }) => {
	await loginAsDemo(page);
	await page.goto('/profile');

	await page.getByLabel('Företagsnamn / Namn').fill('');
	await expect(page.getByText('Ange företagsnamn eller namn.')).toBeVisible();

	await page.getByLabel('Företagsnamn / Namn').fill('Demo Garden AB');
	await expect(page.getByText('Ange företagsnamn eller namn.')).toHaveCount(0);
});
